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
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = '../uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
CHROMA_PATH = './chroma_db'
METADATA_FILE = './documents_metadata.json'
CONVERSATIONS_FILE = './conversations.json'
MODEL_CONFIG_FILE = './model_config.json'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CHROMA_PATH, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

documents_metadata = {}
conversations = []
model_config = {
    'embedding_model': 'nomic-embed-text',
    'llm_model': 'llama3.2',
    'ollama_base_url': 'http://localhost:11434'
}

embeddings = None

def load_metadata():
    global documents_metadata
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r') as f:
                documents_metadata = json.load(f)
        except Exception as e:
            print(f"Error loading metadata: {e}")
            documents_metadata = {}

def save_metadata():
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(documents_metadata, f, indent=2)
    except Exception as e:
        print(f"Error saving metadata: {e}")

def load_conversations():
    global conversations
    if os.path.exists(CONVERSATIONS_FILE):
        try:
            with open(CONVERSATIONS_FILE, 'r') as f:
                conversations = json.load(f)
        except Exception as e:
            print(f"Error loading conversations: {e}")
            conversations = []

def save_conversations():
    try:
        with open(CONVERSATIONS_FILE, 'w') as f:
            json.dump(conversations, f, indent=2)
    except Exception as e:
        print(f"Error saving conversations: {e}")

def load_model_config():
    global model_config, embeddings
    if os.path.exists(MODEL_CONFIG_FILE):
        try:
            with open(MODEL_CONFIG_FILE, 'r') as f:
                model_config = json.load(f)
        except Exception as e:
            print(f"Error loading model config: {e}")
    
    embeddings = OllamaEmbeddings(
        model=model_config['embedding_model'], 
        base_url=model_config['ollama_base_url']
    )

def save_model_config():
    try:
        with open(MODEL_CONFIG_FILE, 'w') as f:
            json.dump(model_config, f, indent=2)
    except Exception as e:
        print(f"Error saving model config: {e}")

def check_ollama_connection():
    try:
        ollama.list(host=model_config['ollama_base_url'])
        return True, None
    except Exception as e:
        return False, str(e)

load_metadata()
load_conversations()
load_model_config()

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

def process_document(filepath, filename, folder=None):
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
    
    is_connected, error = check_ollama_connection()
    if not is_connected:
        raise ConnectionError(f"Cannot connect to Ollama: {error}. Make sure Ollama is running at {model_config['ollama_base_url']}")
    
    vectorstore = Chroma(
        client=chroma_client,
        collection_name="documents",
        embedding_function=embeddings
    )
    
    metadatas = [{"source": filename, "doc_id": doc_id, "chunk": i} for i in range(len(chunks))]
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    
    documents_metadata[doc_id] = {
        "id": doc_id,
        "filename": filename,
        "chunks": len(chunks),
        "filepath": filepath,
        "folder": folder,
        "uploaded_at": datetime.now().isoformat(),
        "text_preview": text[:500] if len(text) > 500 else text
    }
    
    save_metadata()
    
    return doc_id, len(chunks)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    folder = request.form.get('folder', None)
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            doc_id, num_chunks = process_document(filepath, filename, folder)
            doc_data = documents_metadata[doc_id]
            return jsonify({
                "message": "File uploaded and processed successfully",
                "doc_id": doc_id,
                "filename": filename,
                "chunks": num_chunks,
                "folder": folder,
                "uploaded_at": doc_data['uploaded_at']
            }), 200
        except ConnectionError as e:
            os.remove(filepath)
            return jsonify({
                "error": str(e),
                "error_type": "ollama_connection"
            }), 503
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    
    return jsonify({"error": "File type not allowed. Supported formats: PDF, DOCX, TXT"}), 400

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.json
    question = data.get('question', '')
    conversation_id = data.get('conversation_id', None)
    
    if not question:
        return jsonify({"error": "No question provided"}), 400
    
    try:
        is_connected, error = check_ollama_connection()
        if not is_connected:
            return jsonify({
                "error": f"Cannot connect to Ollama: {error}. Make sure Ollama is running at {model_config['ollama_base_url']} with the configured models ({model_config['embedding_model']}, {model_config['llm_model']}) installed.",
                "error_type": "ollama_connection"
            }), 503
        
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
            model=model_config['llm_model'],
            prompt=prompt,
            host=model_config['ollama_base_url']
        )
        
        answer = response['response']
        
        sources = []
        for doc in relevant_docs:
            sources.append({
                "source": doc.metadata.get('source', 'Unknown'),
                "chunk": doc.metadata.get('chunk', 0),
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            })
        
        qa_entry = {
            "question": question,
            "answer": answer,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
        
        if conversation_id:
            for conv in conversations:
                if conv['id'] == conversation_id:
                    conv['messages'].append(qa_entry)
                    conv['updated_at'] = datetime.now().isoformat()
                    break
        else:
            conversation_id = str(uuid.uuid4())
            conversations.append({
                "id": conversation_id,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "messages": [qa_entry]
            })
        
        save_conversations()
        
        return jsonify({
            "answer": answer,
            "sources": sources,
            "conversation_id": conversation_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error processing question: {str(e)}"}), 500

@app.route('/documents', methods=['GET'])
def list_documents():
    folder = request.args.get('folder', None)
    if folder:
        filtered_docs = [doc for doc in documents_metadata.values() if doc.get('folder') == folder]
        return jsonify({"documents": filtered_docs}), 200
    return jsonify({"documents": list(documents_metadata.values())}), 200

@app.route('/documents/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    if doc_id not in documents_metadata:
        return jsonify({"error": "Document not found"}), 404
    
    try:
        doc = documents_metadata[doc_id]
        filepath = doc['filepath']
        
        if os.path.exists(filepath):
            os.remove(filepath)
        
        vectorstore = Chroma(
            client=chroma_client,
            collection_name="documents",
            embedding_function=embeddings
        )
        vectorstore.delete(where={"doc_id": doc_id})
        
        del documents_metadata[doc_id]
        save_metadata()
        
        return jsonify({"message": "Document deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Error deleting document: {str(e)}"}), 500

@app.route('/documents/<doc_id>/preview', methods=['GET'])
def get_document_preview(doc_id):
    if doc_id not in documents_metadata:
        return jsonify({"error": "Document not found"}), 404
    
    doc = documents_metadata[doc_id]
    return jsonify({
        "id": doc_id,
        "filename": doc['filename'],
        "preview": doc.get('text_preview', ''),
        "chunks": doc['chunks']
    }), 200

@app.route('/documents/<doc_id>/folder', methods=['PUT'])
def update_document_folder(doc_id):
    if doc_id not in documents_metadata:
        return jsonify({"error": "Document not found"}), 404
    
    data = request.json
    folder = data.get('folder', None)
    
    documents_metadata[doc_id]['folder'] = folder
    save_metadata()
    
    return jsonify({"message": "Document folder updated", "folder": folder}), 200

@app.route('/folders', methods=['GET'])
def get_folders():
    folders = set()
    for doc in documents_metadata.values():
        folder = doc.get('folder')
        if folder:
            folders.add(folder)
    return jsonify({"folders": sorted(list(folders))}), 200

@app.route('/conversations', methods=['GET'])
def get_conversations():
    return jsonify({"conversations": conversations}), 200

@app.route('/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    for conv in conversations:
        if conv['id'] == conversation_id:
            return jsonify(conv), 200
    return jsonify({"error": "Conversation not found"}), 404

@app.route('/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    global conversations
    conversations = [c for c in conversations if c['id'] != conversation_id]
    save_conversations()
    return jsonify({"message": "Conversation deleted successfully"}), 200

@app.route('/conversations/<conversation_id>/export', methods=['GET'])
def export_conversation(conversation_id):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_LEFT
    import io
    
    format_type = request.args.get('format', 'markdown')
    
    for conv in conversations:
        if conv['id'] == conversation_id:
            if format_type == 'pdf':
                buffer = io.BytesIO()
                doc = SimpleDocTemplate(buffer, pagesize=letter,
                                      rightMargin=72, leftMargin=72,
                                      topMargin=72, bottomMargin=18)
                
                styles = getSampleStyleSheet()
                title_style = ParagraphStyle(
                    'CustomTitle',
                    parent=styles['Heading1'],
                    fontSize=24,
                    textColor='#2563EB'
                )
                heading_style = ParagraphStyle(
                    'CustomHeading',
                    parent=styles['Heading2'],
                    fontSize=16,
                    textColor='#1E293B'
                )
                normal_style = styles['BodyText']
                
                story = []
                
                story.append(Paragraph("Conversation Export", title_style))
                story.append(Spacer(1, 12))
                story.append(Paragraph(f"<b>Created:</b> {conv['created_at']}", normal_style))
                story.append(Paragraph(f"<b>Last Updated:</b> {conv['updated_at']}", normal_style))
                story.append(Spacer(1, 24))
                
                for i, msg in enumerate(conv['messages']):
                    if i > 0:
                        story.append(Spacer(1, 24))
                    
                    timestamp = msg.get('timestamp', '')
                    if timestamp:
                        story.append(Paragraph(f"<i>{timestamp}</i>", normal_style))
                        story.append(Spacer(1, 6))
                    
                    story.append(Paragraph("Question", heading_style))
                    story.append(Spacer(1, 6))
                    story.append(Paragraph(msg['question'], normal_style))
                    story.append(Spacer(1, 12))
                    
                    story.append(Paragraph("Answer", heading_style))
                    story.append(Spacer(1, 6))
                    story.append(Paragraph(msg['answer'], normal_style))
                    
                    if msg.get('sources'):
                        story.append(Spacer(1, 12))
                        story.append(Paragraph("Sources", heading_style))
                        story.append(Spacer(1, 6))
                        for src in msg['sources']:
                            source_text = f"<b>{src['source']}</b> (Chunk {src['chunk'] + 1}): {src['content']}"
                            story.append(Paragraph(source_text, normal_style))
                            story.append(Spacer(1, 4))
                
                doc.build(story)
                pdf_data = buffer.getvalue()
                buffer.close()
                
                return pdf_data, 200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': f'attachment; filename=conversation-{conversation_id}.pdf'
                }
            
            elif format_type == 'markdown':
                md_content = f"# Conversation Export\n\n"
                md_content += f"**Created:** {conv['created_at']}\n\n"
                md_content += f"**Last Updated:** {conv['updated_at']}\n\n"
                md_content += "---\n\n"
                
                for msg in conv['messages']:
                    timestamp = msg.get('timestamp', '')
                    if timestamp:
                        md_content += f"*{timestamp}*\n\n"
                    
                    md_content += f"## Question\n{msg['question']}\n\n"
                    md_content += f"## Answer\n{msg['answer']}\n\n"
                    if msg.get('sources'):
                        md_content += "### Sources\n"
                        for src in msg['sources']:
                            md_content += f"- **{src['source']}** (Chunk {src['chunk'] + 1}): {src['content']}\n"
                    md_content += "\n---\n\n"
                
                return jsonify({"content": md_content, "format": "markdown"}), 200
            else:
                return jsonify(conv), 200
    
    return jsonify({"error": "Conversation not found"}), 404

@app.route('/models', methods=['GET'])
def list_models():
    try:
        is_connected, error = check_ollama_connection()
        if not is_connected:
            return jsonify({
                "error": f"Cannot connect to Ollama: {error}",
                "models": []
            }), 503
        
        models_response = ollama.list(host=model_config['ollama_base_url'])
        models = []
        
        for model in models_response.get('models', []):
            model_name = model.get('name', '').split(':')[0]
            models.append({
                'name': model_name,
                'size': model.get('size', 0),
                'modified': model.get('modified_at', '')
            })
        
        return jsonify({
            "models": models,
            "ollama_connected": True
        }), 200
    except Exception as e:
        return jsonify({
            "error": str(e),
            "models": [],
            "ollama_connected": False
        }), 500

@app.route('/models/config', methods=['GET'])
def get_model_config():
    return jsonify(model_config), 200

@app.route('/models/config', methods=['PUT'])
def update_model_config():
    global model_config, embeddings
    
    data = request.json
    
    embedding_model_changed = False
    if 'embedding_model' in data and data['embedding_model'] != model_config['embedding_model']:
        if documents_metadata:
            return jsonify({
                "error": "Cannot change embedding model while documents exist. Please delete all documents first, or they will need to be re-uploaded after changing the model.",
                "warning": "Changing embedding model requires re-uploading all documents"
            }), 400
        embedding_model_changed = True
        model_config['embedding_model'] = data['embedding_model']
    
    if 'llm_model' in data:
        model_config['llm_model'] = data['llm_model']
    
    if 'ollama_base_url' in data:
        model_config['ollama_base_url'] = data['ollama_base_url']
    
    if embedding_model_changed or 'ollama_base_url' in data:
        embeddings = OllamaEmbeddings(
            model=model_config['embedding_model'], 
            base_url=model_config['ollama_base_url']
        )
    
    save_model_config()
    
    return jsonify({
        "message": "Model configuration updated successfully",
        "config": model_config,
        "embedding_changed": embedding_model_changed
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
