import os
import json
import datetime
from openai import OpenAI
from sqlalchemy import text
from sqlalchemy.orm import Session
from . import models
from .database import engine

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://models.inference.ai.azure.com"
)

def get_chat_response(db: Session, user_query: str, user_id: int):
    # 1. Fetch History (Context Window: Last 10 messages for deep context)
    history_objs = db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == user_id
    ).order_by(models.ChatMessage.timestamp.desc()).limit(10).all()
    history = [{"role": m.role, "content": m.content} for m in reversed(history_objs)]

    # 2. Logic Check: Is this a Transformation (e.g., "Change that to a Donut chart")?
    transform_check_prompt = f"""
    History: {history}
    New Query: "{user_query}"
    Is the user asking to change the STYLE, TYPE, or VIEW of a chart/data already provided?
    Return only 'YES' or 'NO'.
    """
    
    transform_res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": transform_check_prompt}]
    )
    is_transform = "YES" in transform_res.choices[0].message.content.upper()

    db_results = []
    sql_query = "REUSED_FROM_HISTORY"

    # 3. Step A: Generate or Reuse SQL
    if not is_transform:
        max_retries = 3
        error_msg = ""
        
        for i in range(max_retries):
            sql_prompt = f"""
            You are a SQL expert. Table: transactions (amount, type, category, merchant, date, user_id).
            History: {history}
            Today is {datetime.datetime.now().strftime('%Y-%m-%d')}.
            Task: Write a MySQL SELECT query for: "{user_query}"
            Rules: 
            - If the user asks for a 'visualization' or 'spending summary' without a specific date, query ALL transactions for that user or use the CURRENT YEAR.
            - Do not apply strict month filters (e.g., '2026-02') unless the user specifically mentions 'February' or 'last month'.
            - If the user asks for 'Food vs Others', ensure the SQL uses a CASE statement to group categories correctly.
            - Filter by user_id = {user_id}.
            - For trends, group by DATE_FORMAT(date, '%Y-%m').
            - Return ONLY raw SQL.
            {f"- FIX THIS ERROR: {error_msg}" if error_msg else ""}
            """
            
            res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": sql_prompt}]
            )
            sql_query = res.choices[0].message.content.strip().replace("```sql", "").replace("```", "")

            try:
                # Security Check
                if any(x in sql_query.upper() for x in ["DROP", "DELETE", "UPDATE", "INSERT"]):
                    raise Exception("Unauthorized SQL detected.")
                
                with engine.connect() as conn:
                    result = conn.execute(text(sql_query))
                    db_results = [dict(row._mapping) for row in result]
                break 
            except Exception as e:
                error_msg = str(e)
                if i == max_retries - 1: db_results = [{"error": "Could not fetch data"}]
    else:
        # Transformation Logic: Reuse data from history
        for msg in reversed(history):
            if msg['role'] == 'assistant' and '"data":' in msg['content']:
                try:
                    prev_json = json.loads(msg['content'])
                    db_results = prev_json.get("data", [])
                    sql_query = prev_json.get("sql_used", "REUSED")
                    break
                except: continue

    # 4. Step B: Visual Intent & Multi-Series Synthesis
    visual_prompt = f"""
    You are a Financial Data Analyst. 
    User Query: "{user_query}"
    Data from Database: {json.dumps(db_results, default=str)}
    
    TASK:
    1. Decide if a chart is needed. Supported: [bar, line, pie, donut, area, radar, waterfall].
    2. Format "data" for Multi-Series support.
    3. Return JSON ONLY:
    {{
      "is_visual": bool,
      "chart_type": str,
      "title": str,
      "data": list,
      "series_keys": list,
      "answer": "Friendly summary of the data",
      "sql_used": "{sql_query}"
    }}
    """

    final_res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": visual_prompt}],
        response_format={ "type": "json_object" }
    )
    response_json = json.loads(final_res.choices[0].message.content)

    # 5. NEW: Faithfulness Check (The Auditor/Judge)
    verification_prompt = f"""
    You are an Auditor. 
    Database Result: {json.dumps(db_results, default=str)}
    Assistant's Answer: "{response_json.get('answer')}"
    
    TASK: Does the answer accurately reflect the Database Result? Return 'YES' or 'NO'.
    """
    verify_res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": verification_prompt}]
    )
    
    if "NO" in verify_res.choices[0].message.content.upper():
        # Hallucination detected; override with factual response
        response_json["answer"] = f"Verification check: The actual data retrieved shows {db_results}."

    # 6. Save to History
    db.add(models.ChatMessage(user_id=user_id, role="user", content=user_query))
    db.add(models.ChatMessage(user_id=user_id, role="assistant", content=json.dumps(response_json)))
    db.commit()

    return response_json