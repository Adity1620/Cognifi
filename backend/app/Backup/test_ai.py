import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# 1. Load credentials
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# 2. Initialize Client (Works for both GitHub Models and OpenAI)
# If using GitHub Models, add: base_url="https://models.inference.ai.azure.com"
client = OpenAI(
    api_key=api_key,
    base_url="https://models.inference.ai.azure.com"
    )

def test_extraction():
    print("--- Sending extraction request to GPT-4o-mini ---")
    
    system_prompt = """
    You are a financial parser. Convert user text into a JSON object.
    Keys: amount (float), type (expense/income), category (str), merchant (str).
    """
    user_input = "I spent 500 rupees at KFC for dinner today."

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            response_format={ "type": "json_object" } # Forces a valid JSON response
        )
        
        # Parse and print the result
        result = json.loads(response.choices[0].message.content)
        print("\nSUCCESS! The AI extracted the following:")
        print(json.dumps(result, indent=4))
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")

if __name__ == "__main__":
    test_extraction()