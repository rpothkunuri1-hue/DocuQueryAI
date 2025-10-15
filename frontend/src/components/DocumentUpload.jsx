import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const DocumentUpload = ({ onDocumentUploaded, onDocumentDeleted }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    loadDocuments();
    loadFolders();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setUploadedDocs(response.data.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await axios.get(`${API_URL}/folders`);
      setFolders(response.data.folders);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (selectedFolder) {
      formData.append('folder', selectedFolder);
    }

    setUploading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      onDocumentUploaded(response.data);
      await loadDocuments();
      await loadFolders();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to upload document';
      const errorType = err.response?.data?.error_type;
      
      if (errorType === 'ollama_connection') {
        setError(`⚠️ ${errorMsg}`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  }, [onDocumentUploaded, selectedFolder]);

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await axios.delete(`${API_URL}/documents/${docId}`);
      await loadDocuments();
      onDocumentDeleted?.(docId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handlePreview = async (doc) => {
    try {
      const response = await axios.get(`${API_URL}/documents/${doc.id}/preview`);
      setPreviewDoc(response.data);
    } catch (err) {
      setError('Failed to load preview');
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      setSelectedFolder(newFolderName.trim());
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      docx: '📝',
      txt: '📃',
    };
    return icons[ext] || '📄';
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-text mb-4">Upload Documents</h2>
      
      <div className="mb-4">
        <label className="text-sm font-medium text-text mb-2 block">Folder (optional)</label>
        <div className="flex gap-2">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            + New
          </button>
        </div>
        {showNewFolder && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </div>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-blue-50'
            : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">📁</div>
        {uploading ? (
          <p className="text-secondary">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-primary font-medium">Drop the file here</p>
        ) : (
          <div>
            <p className="text-text font-medium mb-1">Drop your document here</p>
            <p className="text-sm text-secondary">or click to browse</p>
            <p className="text-xs text-secondary mt-2">Supports PDF, DOCX, TXT</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex-1 overflow-y-auto">
        {uploadedDocs.length > 0 ? (
          <>
            <h3 className="text-sm font-semibold text-text mb-3">Uploaded Documents</h3>
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <span className="text-2xl">{getFileIcon(doc.filename)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{doc.filename}</p>
                    <div className="flex gap-2 items-center">
                      <p className="text-xs text-secondary">{doc.chunks} chunks</p>
                      {doc.folder && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          📁 {doc.folder}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(doc)}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                      title="Preview"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-secondary text-sm py-8">
            No documents uploaded yet
          </div>
        )}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">{previewDoc.filename}</h3>
                <p className="text-sm text-secondary">{previewDoc.chunks} chunks</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-text whitespace-pre-wrap">{previewDoc.preview}</p>
              {previewDoc.preview.length >= 500 && (
                <p className="text-xs text-secondary mt-2 italic">... preview truncated</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
