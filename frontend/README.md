AI-Powered Knowledge Assistant Platform (RAG System)

A full-stack, enterprise-grade web application built to unlock and query knowledge stored in unstructured documents (like PDFs) using Retrieval-Augmented Generation (RAG) architecture. This project showcases deep expertise across the MERN stack, Python ML frameworks, and cloud services.

🚀 Key Features

Intelligent Q&A: Answers user questions based only on the content of uploaded documents using semantic search, preventing AI hallucinations.

Document Summarization: Generates concise, professional summaries of uploaded content on demand.

Full Persistence: Secure user authentication and permanent document history management.

Scalable Architecture: Clean separation of concerns between frontend, backend API, and AI processing layer.

🛠️ Technology Stack

Layer

Technology

Key Components / Role Demonstrated

Frontend

React (v18), Custom CSS

Interactive chat interface, file uploads, document management, responsive design.

Backend API

Python (FastAPI)

High-performance, asynchronous REST API serving as the bridge between React and the AI models.

Vector Storage

ChromaDB

Vector database for efficient storage and retrieval of semantic embeddings.

AI/ML Core

Hugging Face (multi-qa-mpnet-base-dot-v1, flan-t5-small)

Used for high-quality semantic embeddings and generative text completion (LLMs).

Data Processing

LangChain (RecursiveCharacterTextSplitter)

Handles document ingestion (PDF extraction, text chunking, data preparation).

Database/Auth

Firebase (Auth & Firestore)

Secure user registration/login and persistent storage of document metadata/history.

⚙️ Setup and Installation

Prerequisites

Python 3.10+ (with pip and venv)

Node.js / npm

A Firebase Project with Authentication (Email/Password) and Firestore enabled.

1. Backend Setup (/backend folder)

Create and activate the Python virtual environment:

python -m venv venv
.\venv\Scripts\activate


Install dependencies (Ensure requirements.txt is up-to-date):

pip install -r requirements.txt


Place your Firebase Admin SDK secret JSON file inside this folder and name it serviceAccountKey.json.

Run the server:

uvicorn main:app --reload


2. Frontend Setup (/frontend folder)

Navigate to the directory: cd frontend

Install Node dependencies:

npm install


Ensure your frontend/src/firebase.js contains your correct Web API keys.

Start the React development server:

npm start


3. Usage Flow

Register/Log In with an email and password.

Use the Upload a Document panel to select a PDF. The backend will process the file, convert it to vectors, and store the history in Firestore.

The document will appear in the My Documents list.

Click the Summary button to generate a quick synopsis of the document.

Use the Chat with your AI panel to ask direct questions about the uploaded content (e.g., "What are the core skills listed in the document?"). The AI will return a precise, grounded answer.