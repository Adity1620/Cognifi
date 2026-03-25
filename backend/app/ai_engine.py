import os
import json
import datetime
import base64
from .chat_engine import client
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


def suggest_reminder_details(merchant, amount, freq_type=None, freq_val=None):
    # Create a human-readable description for the AI
    if freq_type and freq_val:
        recurrence = f"every {freq_val} {freq_type}"
    else:
        recurrence = "one-time"
    
    prompt = f"""
    User is setting a {recurrence} reminder for: {merchant} of amount {amount}.
    
    Task:
    1. Generate a professional 'title' for the reminder.
    2. Select a 'category' from [Food, Transport, Rent, Utilities, Entertainment, Health, Shopping, Others].
    
    Return ONLY JSON:
    {{
      "title": "string",
      "category": "string"
    }}
    """
    
    # Using your existing OpenAI client
    from .chat_engine import client 
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" }
    )
    return json.loads(response.choices[0].message.content)


def process_receipt_image(image_bytes: bytes):
    """Extracts data specifically for the CogniFi Transaction model."""
    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a financial auditor. Extract receipt data into structured JSON."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": """Extract the following fields from this receipt:
                                   - merchant (store name)
                                   - amount (total as float)
                                   - date (YYYY-MM-DD format)
                                   - category (One of: Food, Transport, Utilities, Entertainment, Health, Shopping, Others)
                                   - type (usually 'expense', unless it's a refund/credit)
                                   - description (A brief summary like 'Lunch at McDonald's')
                                   Return ONLY a JSON object."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                    }
                ],
            }
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)