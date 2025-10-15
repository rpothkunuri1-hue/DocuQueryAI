# Document Q&A System

## Overview
A web-based document question-answering system that allows users to upload documents (PDF, DOCX, TXT) and ask questions about their content using AI-powered semantic search and local LLM inference through Ollama.

## Recent Changes
- **October 15, 2025**: Major feature update - Added persistent storage, error handling, document management, conversation history, and export functionality
- **October 14, 2025**: Initial implementation with Python Flask backend, React frontend, ChromaDB vector storage, and Ollama integration

## Features

### Core Features
- Upload and process documents (PDF, DOCX, TXT) with automatic text extraction and chunking
- Ask questions about uploaded documents using natural language
- AI-generated answers based strictly on document content with source citations
- Local LLM inference using Ollama (Llama3.2, nomic-embed-text)
- Clean two-panel layout with document upload on left and Q&A chat on right
- Professional blue and slate color scheme with Inter fonts

### Document Management
- **Persistent Storage**: Document metadata saved to JSON file, survives server restarts
- **Delete Documents**: Remove uploaded documents from both filesystem and vector database
- **Document Preview**: View first 500 characters of document content before asking questions
- **Folder Organization**: Organize documents into custom folders/categories
- **Document List**: View all uploaded documents with file type indicators, chunk count, and folder tags

### Conversation Features
- **Conversation History**: All Q&A interactions are automatically saved with timestamps
- **Load Previous Conversations**: Access and continue past conversations from history
- **Export Conversations**: Download conversation history as Markdown files
- **New Conversation**: Start fresh conversations while preserving history
- **Conversation Management**: Delete old conversations to keep history organized

### Error Handling
- **Ollama Connection Checks**: Clear error messages when Ollama is not running or models are missing
- **File Upload Validation**: Proper error handling for unsupported file types
- **Graceful Failures**: User-friendly error messages for all API failures

## Tech Stack

### Backend
- Python 3.11 with Flask
- LangChain for document processing
- ChromaDB for vector storage
- Ollama Python client for LLM integration
- PyPDF2 for PDF processing
- python-docx for DOCX processing

### Frontend
- React with Vite
- Tailwind CSS for styling
- Axios for API calls
- React Dropzone for file uploads

## Project Architecture

### Directory Structure
```
├── backend/
│   ├── app.py           # Flask application with API endpoints
│   ├── requirements.txt # Python dependencies
│   └── chroma_db/       # Vector database storage
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── DocumentUpload.jsx
│   │   │   └── ChatInterface.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── uploads/             # Uploaded documents storage
└── start.sh            # Startup script
```

### API Endpoints

**Document Endpoints:**
- `POST /upload` - Upload and process documents (with optional folder parameter)
- `GET /documents` - List uploaded documents (with optional folder filter)
- `GET /documents/<doc_id>/preview` - Get document preview
- `DELETE /documents/<doc_id>` - Delete a document
- `PUT /documents/<doc_id>/folder` - Update document folder
- `GET /folders` - List all document folders

**Question & Answer:**
- `POST /ask` - Ask questions about documents (with conversation tracking)

**Conversation Management:**
- `GET /conversations` - List all conversations
- `GET /conversations/<id>` - Get specific conversation
- `DELETE /conversations/<id>` - Delete a conversation
- `GET /conversations/<id>/export` - Export conversation as Markdown

**System:**
- `GET /health` - Health check

### Ports
- Frontend: 5000 (Vite dev server)
- Backend: 8000 (Flask API)

## Running the Application

The application uses a single workflow that starts both backend and frontend:

```bash
bash start.sh
```

This starts:
1. Python Flask backend on port 8000
2. React Vite frontend on port 5000

## Prerequisites

**Important**: This application requires Ollama to be installed and running on your local machine (localhost:11434) with the following models:
- `llama3.2` - For question answering
- `nomic-embed-text` - For text embeddings

To install Ollama models:
```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

## User Preferences
None specified yet.

## Design Specifications
- Primary Color: #2563EB (professional blue)
- Secondary Color: #64748B (slate grey)  
- Background: #F8FAFC (light grey)
- Text Color: #1E293B (dark slate)
- Success Color: #10B981 (emerald)
- Accent Color: #7C3AED (purple)
- Font: Inter/System fonts
- Layout: Two-panel with document upload on left, Q&A chat on right
- Spacing: 16px base spacing
- Responsive design with loading states and file type indicators
