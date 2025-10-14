import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const DocumentUpload = ({ onDocumentUploaded, uploadedDocs }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      onDocumentUploaded(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }, [onDocumentUploaded]);

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
    <div className="p-6">
      <h2 className="text-lg font-semibold text-text mb-4">Upload Documents</h2>
      
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

      {uploadedDocs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text mb-3">Uploaded Documents</h3>
          <div className="space-y-2">
            {uploadedDocs.map((doc, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-2xl">{getFileIcon(doc.filename)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{doc.filename}</p>
                  <p className="text-xs text-secondary">{doc.chunks} chunks processed</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-white">
                    ✓ Ready
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
