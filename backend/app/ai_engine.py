import os
import json
import datetime
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://models.inference.ai.azure.com"
)

def extract_transaction_info(text: str):
    # Get current date from your Acer machine
    now = datetime.datetime.now()
    today_str = now.strftime("%A, %B %d, %Y")
    
    system_prompt = f"""
    You are a financial assistant. Today is {today_str}.
    Extract transaction details. If the user mentions a relative date 
    (yesterday, last Friday, etc.), calculate the absolute date based on {today_str}.
    
    CATEGORY RULES:
    1. Try to use standard categories: Food, Transport, Rent, Shopping, Salary, Health, Utilities.
    2. If the transaction doesn't fit these, DYNAMICALLY create a new, concise category name (e.g., 'Education', 'Pet Care', 'Subscription').
    3. Always capitalize the first letter.

    Return ONLY a JSON object:
    {{
      "amount": float,
      "type": "expense" or "income",
      "category": str,
      "merchant": str,
      "date": "YYYY-MM-DD"
    }}
    If no date is mentioned, return null for the date field.
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Extract from: {text}"}
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)


def suggest_reminder_details(merchant, amount, frequency_weeks=None):
    freq_text = f"every {frequency_weeks} weeks" if frequency_weeks else "one-time"
    
    prompt = f"""
    User is setting a {freq_text} reminder for: {merchant} of amount {amount}.
    
    Task:
    1. Generate a professional 'title' for the reminder.
    2. Select a 'category' from [Food, Transport, Rent, Utilities, Entertainment, Health, Shopping, Others and etc].
    
    Return ONLY JSON:
    {{
      "title": "string",
      "category": "string"
    }}
    """
    
    # Using your existing 'client' instance
    from .chat_engine import client 
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" }
    )
    return json.loads(response.choices[0].message.content)