import { useState, useEffect } from 'react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import Settings from './components/Settings';
import axios from 'axios';
import './index.css';

const API_URL = '/api';

function App() {
  const [hasDocuments, setHasDocuments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    checkDocuments();
  }, []);

  const checkDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setHasDocuments(response.data.documents.length > 0);
    } catch (err) {
      console.error('Failed to check documents:', err);
    }
  };

  const handleDocumentUploaded = () => {
    setHasDocuments(true);
  };

  const handleDocumentDeleted = async () => {
    await checkDocuments();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Document Q&A System</h1>
            <p className="text-sm text-secondary">Upload documents and ask questions using AI</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-1/3 border-r border-gray-200 bg-white">
          <DocumentUpload 
            onDocumentUploaded={handleDocumentUploaded}
            onDocumentDeleted={handleDocumentDeleted}
          />
        </div>
        
        <div className="w-2/3 bg-background">
          <ChatInterface hasDocuments={hasDocuments} />
        </div>
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
