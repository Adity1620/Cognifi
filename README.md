# 🧠 Cognifi

An AI-powered conversational and voice-enabled assistant platform built with **React**, **Vite**, and **Python**.

---

## 📖 Overview

**Cognifi** is a full-stack intelligent assistant application designed to unify natural dialogue, speech input, user authentication, and persistent data storage into a single cohesive platform. 

By pairing a responsive single-page web interface with a modular Python REST API, Cognifi separates user interaction, conversational context management, AI inference, and audio processing into clean, maintainable service layers. Whether users interact through text or voice, the platform maintains session continuity and stores conversation records reliably across visits.

---

## ✨ Key Features

- **🤖 Context-Aware Conversational AI:** Separates core AI model inference from dialogue orchestration, allowing the assistant to track conversation history, maintain context across multi-turn interactions, and deliver coherent, relevant responses.
- **🎙️ Voice & Audio Interaction:** Supports speech-driven workflows by accepting `.m4a` audio inputs, processing speech data on the backend, and routing transcribed queries directly into the conversational pipeline.
- **🔐 User Authentication & Session Security:** Protects user accounts and sessions with token-based authentication and security utilities, ensuring private and personalized access to chat histories.
- **💾 Structured Data Persistence:** Uses relational database modeling and strict request/response schema validation to reliably store user profiles, session states, and conversation logs.
- **⚡ Modern, Responsive Web Interface:** Built as a fast single-page application using React and Vite, offering smooth UI transitions, custom styling, and clean component organization.

---

## 🏗️ How It Works

1. **Client Interface:** Users interact with the web application to send text prompts, record or upload `.m4a` voice messages, and manage their authenticated sessions.
2. **API & Validation Gateway:** Incoming requests pass through a RESTful API layer that validates payloads and enforces authentication before routing actions to internal services.
3. **Processing Pipelines:** Text messages go straight to the conversation manager, while audio files are first processed by the voice service before entering the dialogue flow.
4. **AI Response & Storage:** The AI engine generates a context-informed response, saves the exchange to the database, and returns the reply to the frontend in real time.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React
- **Build Tool:** Vite
- **Styling & Code Quality:** CSS3, ESLint

### Backend
- **Language:** Python 3.10+
- **Architecture:** Modular REST API with ORM modeling and schema validation
- **Core Capabilities:** AI Inference, Conversation Management, Voice/Audio Processing, Authentication

---

## 🚀 Getting Started

Follow these steps to set up and run both the backend and frontend locally.

### Prerequisites
- **Node.js** (v18+ recommended) & **npm**
- **Python** (v3.10+) & **pip**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Adity1620/Cognifi.git
cd Cognifi
```

### 2. Backend Setup
1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv

   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure your environment variables by creating a `.env` file inside the `backend/` directory:
   ```env
   API_KEY=your_ai_api_key_here
   SECRET_KEY=your_auth_secret_key
   DATABASE_URL=sqlite:///./cognifi.db
   ```

4. Start the backend server:
   ```bash
   # Using Uvicorn / FastAPI:
   uvicorn app.main:app --reload

   # Or running directly via Python:
   python -m app.main
   ```

### 3. Frontend Setup
1. Open a new terminal in the project root directory and install Node dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local URL shown in the terminal (typically `http://localhost:5173`).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact
Aditya V - adityavenkatesh16@gmail.com


**Adity1620** – [@Adity1620](https://github.com/Adity1620)  
**Project Link:** [https://github.com/Adity1620/Cognifi](https://github.com/Adity1620/Cognifi)
