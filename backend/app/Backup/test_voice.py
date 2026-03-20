import os
from groq import Groq
from dotenv import load_dotenv

# 1. Load your API key from the .env file
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# 2. Path to your recorded file
file_path = "/home/aditya-venkatesh/Desktop/Cognifi/backend/app/test.m4a" 

def test_transcription():
    print(f"--- Sending {file_path} to Groq ---")
    try:
        with open(file_path, "rb") as file:
            # Using Whisper-large-v3-turbo for sub-second latency
            transcription = client.audio.transcriptions.create(
                file=(file_path, file.read()),
                model="whisper-large-v3-turbo",
                response_format="verbose_json",
            )
            print("\nSUCCESS! Groq says:")
            print(f"Text: {transcription.text}")
            print(f"Language: {transcription.language}")
            print(f"Duration: {transcription.duration}s")
            
    except Exception as e:
        print(f"\nERROR: {str(e)}")

if __name__ == "__main__":
    test_transcription()