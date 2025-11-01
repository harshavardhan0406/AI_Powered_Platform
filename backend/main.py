import uvicorn
import firebase_admin
import io
import chromadb
from sentence_transformers import SentenceTransformer
from transformers import pipeline
from firebase_admin import credentials
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel

# --- Global Objects (Load Models Once) ---

print("Loading embedding model...")
model = SentenceTransformer('multi-qa-mpnet-base-dot-v1')
print("Embedding model loaded.")

print("Loading text generation model...")
qa_pipeline = pipeline(
    "text2text-generation",
    model="google/flan-t5-small"
)
print("Text generation model loaded.")

print("Initializing ChromaDB client...")
client = chromadb.PersistentClient(path="chroma_db")
collection = client.get_or_create_collection(name="documents")
print("ChromaDB collection loaded.")

# --- Firebase Admin Setup (Unchanged) ---
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    else:
        print("Firebase Admin SDK already initialized.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")

# --- FastAPI App Creation (Unchanged) ---
app = FastAPI()

# --- CORS Middleware (Specific Origin for Security) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class QueryRequest(BaseModel):
    query_text: str
    
class SummarizeRequest(BaseModel): # NEW: Model for summarization request
    filename: str

# --- Root Endpoint (Unchanged) ---
@app.get("/")
def read_root():
    return {"status": "success", "message": "Backend server is running!"}

# --- File Upload Endpoint (Unchanged) ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}")

    file_contents = await file.read()
    pdf_stream = io.BytesIO(file_contents)
    extracted_text = ""

    try:
        pdf_reader = PdfReader(pdf_stream)
        page_count = len(pdf_reader.pages)
        print(f"File has {page_count} pages.")

        for page in pdf_reader.pages:
            extracted_text += page.extract_text()

        print(f"Successfully extracted text. Total length: {len(extracted_text)}")

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=350,
            chunk_overlap=50,
            length_function=len
        )
        chunks = text_splitter.split_text(extracted_text)
        chunk_count = len(chunks)
        print(f"Split text into {chunk_count} chunks.")

        print("Generating embeddings for chunks...")
        embeddings = model.encode(chunks)
        print(f"Generated {len(embeddings)} embeddings.")

        ids = [f"{file.filename}_{i}" for i in range(chunk_count)]
        metadatas = [{"source": file.filename} for i in range(chunk_count)]

        try:
            print(f"Deleting existing entries for {file.filename}...")
            collection.delete(where={"source": file.filename})
            print("Existing entries deleted.")
        except Exception as e:
            print(f"Error deleting entries (it's ok if none existed): {e}")

        collection.add(
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )

        print(f"Successfully added {chunk_count} vectors to ChromaDB.")

        return {
            "status": "success",
            "filename": file.filename,
            "chunk_count": chunk_count,
            "vectors_stored": chunk_count
        }

    except Exception as e:
        print(f"Error processing PDF: {e}")
        return {
            "status": "error",
            "filename": file.filename,
            "message": f"Could not process PDF file. Error: {e}"
        }

# --- NEW: Summarization Endpoint ---
@app.post("/summarize")
async def summarize_document(request: SummarizeRequest):
    try:
        filename = request.filename
        print(f"\nReceived summarize request for: '{filename}'")

        # 1. RETRIEVAL: Find all chunks related to the document
        results = collection.get(
            where={"source": filename}, 
            include=['documents']
        )
        
        retrieved_chunks = results['documents']
        
        if not retrieved_chunks:
            print(f"No chunks found for {filename}.")
            return {
                "status": "success",
                "summary": "Document not found or is empty.",
            }
            
        # 2. GENERATION: Combine chunks into one context
        context = " ".join(retrieved_chunks)
        context = context.replace("\n", " ").replace("|", " ") # Clean the context

        # 3. GENERATION: Create the final prompt
        prompt = f"""
        Provide a concise, professional summary of the document below.
        Focus on key skills, professional history, or main points.

        Document Content:
        {context}

        Summary:
        """
        
        print("Generating summary...")
        
        # 4. GENERATION: Feed the prompt to the LLM
        llm_response = qa_pipeline(
            prompt, 
            max_new_tokens=150 # Allow a longer answer for a useful summary
        )
        
        # 5. Get the clean answer text
        summary = llm_response[0]['generated_text']
        print(f"Generated Summary: {summary}")

        return {
            "status": "success",
            "filename": filename,
            "summary": summary,
        }
        
    except Exception as e:
        print(f"Error processing summarization: {e}")
        return {
            "status": "error",
            "filename": filename,
            "message": f"Error processing summarization. Error: {e}"
        }


# --- Query Endpoint (Unchanged) ---
@app.post("/query")
async def query_collection(request: QueryRequest):
    try:
        query_text = request.query_text
        print(f"\nReceived query: '{query_text}'")

        query_embedding = model.encode([query_text])[0].tolist()

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3 
        )

        retrieved_chunks = results['documents'][0]

        if not retrieved_chunks:
            print("No relevant chunks found.")
            return {
                "status": "success",
                "query": query_text,
                "answer": "I could not find that information.",
                "relevant_chunks": []
            }

        context = " ".join(retrieved_chunks)
        context = context.replace("\n", " ").replace("|", " ") # Clean the context

        prompt = f"""
        Answer the following question using *only* the information in the context.
        Your answer must be *extremely* concise. Do not add any extra words.
        If the answer is not in the context, say "I could not find that information."

        Context:
        {context}

        Question:
        {query_text}

        Answer:
        """

        print("Generating answer with generative LLM...")

        llm_response = qa_pipeline(
            prompt,
            max_new_tokens=50
        )

        answer = llm_response[0]['generated_text']
        print(f"Generated Answer: {answer}")

        return {
            "status": "success",
            "query": query_text,
            "answer": answer,
            "relevant_chunks": retrieved_chunks
        }

    except Exception as e:
        print(f"Error processing query: {e}")
        return {
            "status": "error",
            "query": request.query_text,
            "message": f"Error processing query. Error: {e}"
        }

# --- Main entry point ---
if __name__ == "__main__":
    pass