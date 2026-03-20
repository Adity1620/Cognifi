import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def transcribe_audio(file_path: str):
    """
    Sends audio to Groq's Whisper-large-v3-turbo for lightning-fast transcription.
    """
    with open(file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=file,
            model="whisper-large-v3-turbo", 
            response_format="text"
        )
    return transcription