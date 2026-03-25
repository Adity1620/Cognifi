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

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

MAX_RETRIES   = 3
HISTORY_LIMIT = 10
LLM_TIMEOUT   = 30  # seconds

# ──────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ──────────────────────────────────────────────────────────────────────────────

INTENT_SYSTEM = """\
You are an intent classifier for a financial analytics assistant.

## Your only job
Determine whether the user's latest message is:
  - TRANSFORM: the user wants to change the visual presentation (chart type,
    grouping, sorting, color) of data ALREADY returned in the conversation.
    No new database query is needed.
  - NEW_QUERY: the user wants different, additional, or fresh data that
    requires a new database lookup.

## Classification rules — apply in order, first match wins
1. TRANSFORM if the message requests a chart-type change referencing prior results.
   Examples: "make it a pie chart", "show as a bar graph instead",
   "switch to a line chart", "can you do a donut".

2. TRANSFORM if the message requests a display-only change.
   Examples: "sort descending", "group by month", "show top 5 only",
   "rename the labels", "change the colors".

3. NEW_QUERY if the message introduces a new time range, category, metric,
   or comparison NOT present in the last assistant response.

4. NEW_QUERY if there is NO assistant message in history, or the last
   assistant message contains no chart data.

5. When ambiguous, default to NEW_QUERY — a redundant DB call is safer
   than silently showing stale data.

## Output — return ONLY this JSON, no markdown, no extra keys
{
  "intent": "TRANSFORM" | "NEW_QUERY",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reason": "<one sentence>"
}
"""

SQL_SYSTEM = """\
You are a precise MySQL query writer for a personal finance application.

## Database schema
Table: `transactions`
  - id          INT          Primary key
  - user_id     INT          Owner of the transaction (always filter on this)
  - amount      DECIMAL      Transaction amount (always positive)
  - type        ENUM         'income' or 'expense'
  - category    VARCHAR      e.g. 'Food', 'Transport', 'Utilities', 'Entertainment'
  - merchant    VARCHAR      Business name (can be NULL)
  - description TEXT         Full text of the transaction entry. Voice entries follow
                             the pattern: "Voice entry: <user's spoken sentence>".
                             This is the MOST RELIABLE field for finding specific
                             items like "petrol", "coffee", "medicines", "snacks".
  - date        DATETIME     Transaction date and time
  - method      VARCHAR      How it was recorded, e.g. 'voice', 'manual'
  - is_deleted  TINYINT(1)   Soft-delete flag — ALWAYS exclude rows where is_deleted = 1

## Hard rules — violating any of these is a critical error
1. Every query MUST include: WHERE user_id = {user_id} AND is_deleted = 0
2. Output ONLY the raw SQL string — no markdown fences, no commentary.
3. ONLY SELECT statements are permitted. Never write INSERT, UPDATE, DELETE,
   DROP, TRUNCATE, ALTER, or any DDL/DML.
4. Alias every computed column with a meaningful snake_case name
   (e.g. SUM(amount) AS total_amount — never leave a column unnamed).
5. Always add LIMIT 500 unless the user asks for a specific row count
   or the query is a single-row aggregate.

## Keyword search strategy (CRITICAL — read carefully)
Users often refer to transactions by colloquial item names that are NOT stored
in `category` or `merchant`. Examples: "petrol", "coffee", "medicines",
"snacks", "bike repair", "groceries".

These keywords almost always appear in the `description` field because most
entries are recorded via voice (e.g. "Voice entry: I spent 250 rupees for
petrol on Friday").

When the user mentions a specific item keyword, apply a TWO-LAYER search:

  Layer 1 — category match (use when the keyword maps to a known category):
    'Transport'     -> petrol, fuel, diesel, uber, ola, auto, cab, bus, metro, toll
    'Food'          -> food, restaurant, dining, snacks, coffee, tea, groceries, lunch, dinner, swiggy, zomato
    'Utilities'     -> electricity, water, internet, wifi, phone, bill, recharge
    'Entertainment' -> movies, netflix, spotify, game, streaming, theatre, concert
    'Health'        -> medicine, medicines, pharmacy, doctor, hospital, clinic

  Layer 2 — description keyword match (ALWAYS include as a fallback):
    description LIKE '%keyword%'

Combine both layers with OR so neither is missed:
  AND (category = 'Transport' OR description LIKE '%petrol%')

If the keyword does NOT map to any known category, use ONLY description LIKE:
  AND description LIKE '%keyword%'

Never omit the description LIKE fallback — category values can be NULL or
miscategorised for voice entries, and the description always has the keyword.

## Date handling logic
- User names a specific month   -> filter to that month only.
- User names a specific year    -> filter to that year only.
- User says "this year" or no time reference
                                -> YEAR(date) = {current_year}
- User says "this month"        -> MONTH(date) = {current_month} AND YEAR(date) = {current_year}
- User says "last month"        -> filter to the previous calendar month.
- User says "last N days"       -> date >= DATE_SUB(CURDATE(), INTERVAL N DAY)
- Never invent a time filter the user did not request.

## Category comparisons (e.g. "Food vs Others")
Use conditional aggregation — never a GROUP BY that splits into separate rows:
  SUM(CASE WHEN category = 'Food' THEN amount ELSE 0 END) AS food_total,
  SUM(CASE WHEN category <> 'Food' THEN amount ELSE 0 END) AS others_total

## Error recovery
If a previous attempt failed, the error is provided. Read it carefully:
  - Unknown column -> the column name is wrong; check the schema above.
  - Syntax error   -> fix the exact line indicated.
  - Do NOT retry the identical query.
"""

SYNTHESIS_SYSTEM = """\
You are a financial data analyst and chart configuration expert.
Your job is to interpret query results and produce a structured JSON response
that a React charting frontend can render directly.

## Input you will receive
- user_question : What the user asked.
- db_results    : Raw rows returned by the database (list of dicts).
                  This is the ONLY source of truth. Never invent numbers.
- row_count     : Number of rows returned.

## Output — return ONLY this JSON, no markdown, no prose outside it
{
  "is_visual"       : <bool>,
  "chart_type"      : <str>,
  "title"           : <str>,
  "x_key"           : <str>,
  "series_keys"     : [<str>],
  "data"            : [],
  "answer"          : <str>,
  "currency_symbol" : <str>,
  "sort_order"      : "asc" | "desc" | "none",
  "sql_used"        : ""
}

## Notes
- Leave "data" as an empty array — the backend overwrites this with real DB rows.
- Leave "sql_used" as an empty string — the backend fills this in.

## Chart type selection rules
- "bar"       -> category comparisons (<=12 categories) or ranked lists.
- "line"      -> trends over time (dates on x-axis).
- "area"      -> cumulative or stacked trends over time.
- "pie"       -> part-of-whole with <=6 slices.
- "donut"     -> part-of-whole with 7-12 slices.
- "radar"     -> multi-metric scoring across uniform categories only.
- "waterfall" -> sequential positive/negative contributions to a total.
- "table"     -> row_count > 20 or data too granular to visualise usefully.
- Set is_visual = false and chart_type = "none" if db_results is empty
  or the result is a single scalar that reads better as plain text.

## Answer narrative rules
1. Lead with the single most important insight (the "so what").
2. Reference only specific values present in db_results — never invent numbers.
3. If db_results is empty, write: "No transactions matched your criteria."
4. Write plainly — no jargon, no bullet points.
5. Maximum 3 sentences.
"""

AUDIT_SYSTEM = """\
You are a factual accuracy auditor for a financial assistant.

## Your task
Given actual database results and an AI-generated summary, determine whether
the summary makes any numerical or factual claim that contradicts the data.

## What counts as a contradiction -> return FAIL
- A specific number in the summary that does not appear in db_results.
- A ranking claim ("highest", "lowest", "most") that is incorrect per the data.
- A category name that does not appear in db_results.
- A time period claim that is factually wrong.
- Claiming data is empty when rows exist, or non-empty when rows are absent.

## What does NOT count as a contradiction -> return PASS
- Rounding (e.g. "about Rs. 250" when the value is 250.00).
- Omitting minor details not central to the question.
- Using different but accurate phrasing ("fuel" vs "petrol").
- General observations that are directionally correct.

## Output — return ONLY this JSON, no markdown, no extra keys
{
  "verdict": "PASS" | "FAIL",
  "issue"  : "<one sentence describing the contradiction, or null if PASS>"
}
"""

FALLBACK_SYSTEM = """\
You are a financial data analyst. Write a short, accurate summary of the
database results provided.

## Rules
- Base every claim strictly on the db_results — invent nothing.
- Be concise: 1-2 sentences maximum.
- Mention the most relevant numeric insight (total, highest, count, etc.).
- Do not apologise or explain that you are rewriting anything.
- Return plain text only — no JSON, no markdown.
"""

# ──────────────────────────────────────────────────────────────────────────────
# PROMPT BUILDERS  (inject runtime data into the USER turn)
# ──────────────────────────────────────────────────────────────────────────────

def _build_intent_user(history: list, user_query: str) -> str:
    return json.dumps({
        "recent_history": history[-3:],
        "user_query": user_query
    }, default=str)


def _build_sql_user(user_query: str, user_id: int, history: list,
                    error_msg: str = "") -> str:
    now = datetime.datetime.now()
    payload = {
        "user_id": user_id,
        "current_date": now.strftime("%Y-%m-%d"),
        "current_year": now.year,
        "current_month": now.month,
        "conversation_context": history[-4:],
        "user_question": user_query,
    }
    if error_msg:
        payload["previous_error"] = error_msg
        payload["instruction"] = (
            "The previous SQL query failed with the error above. "
            "Analyse the error, identify the root cause, and write a corrected query."
        )
    return json.dumps(payload, default=str)


def _build_synthesis_user(user_query: str, db_results: list) -> str:
    return json.dumps({
        "user_question": user_query,
        "db_results": db_results,
        "row_count": len(db_results)
    }, default=str)


def _build_audit_user(db_results: list, ai_answer: str) -> str:
    return json.dumps({
        "db_results": db_results,
        "ai_generated_answer": ai_answer
    }, default=str)


def _build_fallback_user(user_query: str, db_results: list) -> str:
    return json.dumps({
        "original_question": user_query,
        "db_results": db_results,
        "row_count": len(db_results)
    }, default=str)


# ──────────────────────────────────────────────────────────────────────────────
# LLM HELPER  (single entry point for all model calls)
# ──────────────────────────────────────────────────────────────────────────────

def _llm(system: str, user: str, json_mode: bool = False) -> str:
    kwargs = dict(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        timeout=LLM_TIMEOUT,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    res = client.chat.completions.create(**kwargs)
    return res.choices[0].message.content.strip()


# ──────────────────────────────────────────────────────────────────────────────
# MAIN FUNCTION
# ──────────────────────────────────────────────────────────────────────────────

def get_chat_response(db: Session, user_query: str, user_id: int) -> dict:

    # 1. Fetch history
    history_objs = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == user_id)
        .order_by(models.ChatMessage.timestamp.desc())
        .limit(HISTORY_LIMIT)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(history_objs)]

    # 2. Intent classification
    intent_raw   = _llm(INTENT_SYSTEM, _build_intent_user(history, user_query), json_mode=True)
    intent_data  = json.loads(intent_raw)
    is_transform = intent_data.get("intent") == "TRANSFORM"

    db_results = []
    sql_query  = "REUSED_FROM_HISTORY"

    # 3a. SQL generation + execution  (new query path)
    if not is_transform:
        now       = datetime.datetime.now()
        error_msg = ""

        for attempt in range(MAX_RETRIES):
            sql_query = _llm(
                SQL_SYSTEM.format(
                    user_id=user_id,
                    current_year=now.year,
                    current_month=now.month
                ),
                _build_sql_user(user_query, user_id, history, error_msg)
            )

            # Safety gate — only SELECT is allowed
            if not sql_query.strip().upper().startswith("SELECT"):
                error_msg = "Generated query was not a SELECT statement."
                if attempt == MAX_RETRIES - 1:
                    db_results = [{"error": "Query failed safety check."}]
                continue

            try:
                with engine.connect() as conn:
                    result     = conn.execute(text(sql_query))
                    db_results = [dict(row._mapping) for row in result]
                break
            except Exception as exc:
                error_msg = str(exc)
                if attempt == MAX_RETRIES - 1:
                    db_results = [{"error": "Data fetch failed after retries."}]

    # 3b. Transform path — reuse previous assistant data
    else:
        for msg in reversed(history):
            if msg["role"] == "assistant":
                try:
                    prev       = json.loads(msg["content"])
                    db_results = prev.get("data", [])
                    sql_query  = prev.get("sql_used", "REUSED")
                    break
                except (json.JSONDecodeError, KeyError):
                    continue

    # 4. Response synthesis
    synthesis_raw = _llm(
        SYNTHESIS_SYSTEM,
        _build_synthesis_user(user_query, db_results),
        json_mode=True
    )
    response_json = json.loads(synthesis_raw)

    # Truth overwrite — force real DB rows; LLM only decides chart config
    response_json["data"]     = db_results
    response_json["sql_used"] = sql_query

    # 5. Faithfulness audit
    audit_raw = _llm(
        AUDIT_SYSTEM,
        _build_audit_user(db_results, response_json.get("answer", "")),
        json_mode=True
    )
    audit = json.loads(audit_raw)

    if audit.get("verdict") == "FAIL":
        response_json["answer"] = _llm(
            FALLBACK_SYSTEM,
            _build_fallback_user(user_query, db_results)
        )

    # 6. Persist
    try:
        db.add(models.ChatMessage(user_id=user_id, role="user",
                                  content=user_query))
        db.add(models.ChatMessage(user_id=user_id, role="assistant",
                                  content=json.dumps(response_json, default=str)))
        db.commit()
    except Exception:
        db.rollback()
        raise

    return response_json