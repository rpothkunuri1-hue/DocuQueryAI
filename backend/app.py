from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import ollama
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
import chromadb
from werkzeug.utils import secure_filename
import PyPDF2
from docx import Document
import uuid

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = '../uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
CHROMA_PATH = './chroma_db'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CHROMA_PATH, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url="http://localhost:11434")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

documents_metadata = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    text = ""
    with open(filepath, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(filepath):
    doc = Document(filepath)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_text_from_txt(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        return file.read()

def process_document(filepath, filename):
    ext = filename.rsplit('.', 1)[1].lower()
    
    if ext == 'pdf':
        text = extract_text_from_pdf(filepath)
    elif ext == 'docx':
        text = extract_text_from_docx(filepath)
    elif ext == 'txt':
        text = extract_text_from_txt(filepath)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    
    doc_id = str(uuid.uuid4())
    
    vectorstore = Chroma(
        client=chroma_client,
        collection_name="documents",
        embedding_function=embeddings
    )
    
    metadatas = [{"source": filename, "doc_id": doc_id, "chunk": i} for i in range(len(chunks))]
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    
    documents_metadata[doc_id] = {
        "filename": filename,
        "chunks": len(chunks),
        "filepath": filepath
    }
    
    return doc_id, len(chunks)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            doc_id, num_chunks = process_document(filepath, filename)
            return jsonify({
                "message": "File uploaded and processed successfully",
                "doc_id": doc_id,
                "filename": filename,
                "chunks": num_chunks
            }), 200
        except Exception as e:
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.json
    question = data.get('question', '')
    
    if not question:
        return jsonify({"error": "No question provided"}), 400
    
    try:
        vectorstore = Chroma(
            client=chroma_client,
            collection_name="documents",
            embedding_function=embeddings
        )
        
        relevant_docs = vectorstore.similarity_search(question, k=3)
        
        if not relevant_docs:
            return jsonify({
                "answer": "I couldn't find any relevant information in the uploaded documents to answer your question.",
                "sources": []
            }), 200
        
        context = "\n\n".join([doc.page_content for doc in relevant_docs])
        
        prompt = f"""Based on the following context from the uploaded documents, please answer the question. If the answer cannot be found in the context, say so.

Context:
{context}

Question: {question}

Answer:"""
        
        response = ollama.generate(
            model='llama3.2',
            prompt=prompt
        )
        
        answer = response['response']
        
        sources = []
        for doc in relevant_docs:
            sources.append({
                "source": doc.metadata.get('source', 'Unknown'),
                "chunk": doc.metadata.get('chunk', 0),
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            })
        
        return jsonify({
            "answer": answer,
            "sources": sources
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error processing question: {str(e)}"}), 500

@app.route('/documents', methods=['GET'])
def list_documents():
    return jsonify({"documents": list(documents_metadata.values())}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
