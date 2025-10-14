# Document Q&A System

## Overview
A web-based document question-answering system that allows users to upload documents (PDF, DOCX, TXT) and ask questions about their content using AI-powered semantic search and local LLM inference through Ollama.

## Recent Changes
- **October 14, 2025**: Initial implementation with Python Flask backend, React frontend, ChromaDB vector storage, and Ollama integration

## Features
- Upload and process documents (PDF, DOCX, TXT) with automatic text extraction and chunking
- Ask questions about uploaded documents using natural language
- AI-generated answers based strictly on document content with source citations
- Local LLM inference using Ollama (Llama3.2, nomic-embed-text)
- Clean two-panel layout with document upload on left and Q&A chat on right
- Professional blue and slate color scheme with Inter fonts

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
- `POST /upload` - Upload and process documents
- `POST /ask` - Ask questions about documents
- `GET /documents` - List uploaded documents
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
