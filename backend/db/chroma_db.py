import chromadb
import os
import tempfile
import logging
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_data")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Note: We use the models/gemini-embedding-2 which is the correct supported model in this API version
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2", google_api_key=api_key)

def get_collection():
    return chroma_client.get_or_create_collection(name="resume_collection")

def is_resume_loaded() -> bool:
    try:
        collection = get_collection()
        return collection.count() > 0
    except Exception:
        return False

def process_and_store_pdf(file_bytes: bytes):
    # Write to a temp file so PyPDFLoader can read it
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name

    try:
        loader = PyPDFLoader(temp_path)
        docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(docs)

        # Clear existing collection to ensure we only have the latest resume
        try:
            chroma_client.delete_collection("resume_collection")
        except Exception:
            pass
        collection = chroma_client.create_collection("resume_collection")

        texts = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]
        ids = [f"chunk_{i}" for i in range(len(chunks))]

        # Get embeddings individually to bypass batching bugs in the wrapper
        embedded_texts = []
        for text in texts:
            embedded_texts.append(embeddings.embed_query(text))

        collection.add(
            documents=texts,
            embeddings=embedded_texts,
            metadatas=metadatas,
            ids=ids
        )
        
        logging.info(f"Stored {len(chunks)} chunks in ChromaDB")
    finally:
        os.remove(temp_path)

def retrieve_context(query: str, n_results: int = 5) -> str:
    collection = get_collection()
    if collection.count() == 0:
        return "No resume data available."
        
    query_embedding = embeddings.embed_query(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    
    if results and results.get('documents') and results['documents'][0]:
        context = "\n\n".join(results['documents'][0])
        return context
    
    return "No relevant resume data found."
