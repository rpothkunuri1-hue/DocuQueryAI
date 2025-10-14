import { useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import './index.css';

function App() {
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const handleDocumentUploaded = (docInfo) => {
    setUploadedDocs(prev => [...prev, docInfo]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <h1 className="text-2xl font-bold text-primary">Document Q&A System</h1>
        <p className="text-sm text-secondary">Upload documents and ask questions using AI</p>
      </header>
      
      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
          <DocumentUpload 
            onDocumentUploaded={handleDocumentUploaded}
            uploadedDocs={uploadedDocs}
          />
        </div>
        
        <div className="w-2/3 bg-background">
          <ChatInterface hasDocuments={uploadedDocs.length > 0} />
        </div>
      </div>
    </div>
  );
}

export default App;
