import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const Settings = ({ onClose }) => {
  const [models, setModels] = useState([]);
  const [config, setConfig] = useState({
    embedding_model: '',
    llm_model: '',
    ollama_base_url: 'http://localhost:11434'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ollamaConnected, setOllamaConnected] = useState(false);

  useEffect(() => {
    loadModels();
    loadConfig();
  }, []);

  const loadModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/models`);
      setModels(response.data.models || []);
      setOllamaConnected(response.data.ollama_connected);
      setError('');
    } catch (err) {
      setError('Failed to load available models. Make sure Ollama is running.');
      setOllamaConnected(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/models/config`);
      setConfig(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load model configuration');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(`${API_URL}/models/config`, config);
      if (response.data.embedding_changed) {
        setSuccess('Model configuration saved! Note: All documents will need to be re-uploaded with the new embedding model.');
      } else {
        setSuccess('Model configuration saved successfully! Changes will apply to new operations.');
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save configuration';
      const warning = err.response?.data?.warning;
      setError(warning ? `${errorMessage}\n\n${warning}` : errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadModels();
    await loadConfig();
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <p className="text-center text-secondary">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text">Model Settings</h2>
            <p className="text-sm text-secondary mt-1">Configure which Ollama models to use</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${ollamaConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-text">
                Ollama Status: {ollamaConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          {!ollamaConnected && (
            <p className="text-sm text-red-600 mt-2">
              Make sure Ollama is running at {config.ollama_base_url}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Embedding Model
              <span className="text-xs text-secondary ml-2">(for document processing)</span>
            </label>
            <select
              value={config.embedding_model}
              onChange={(e) => setConfig({ ...config, embedding_model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a model...</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-secondary mt-1">
              Current: {config.embedding_model || 'None selected'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              LLM Model
              <span className="text-xs text-secondary ml-2">(for answering questions)</span>
            </label>
            <select
              value={config.llm_model}
              onChange={(e) => setConfig({ ...config, llm_model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a model...</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-secondary mt-1">
              Current: {config.llm_model || 'None selected'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Ollama Base URL
            </label>
            <input
              type="text"
              value={config.ollama_base_url}
              onChange={(e) => setConfig({ ...config, ollama_base_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="http://localhost:11434"
            />
          </div>

          {models.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-text mb-3">Available Models ({models.length})</h3>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-text">Model Name</th>
                      <th className="text-right px-3 py-2 text-text">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-text">{model.name}</td>
                        <td className="px-3 py-2 text-right text-secondary">
                          {(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {models.length === 0 && ollamaConnected && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                No models found. Install models using:
              </p>
              <code className="block mt-2 p-2 bg-yellow-100 rounded text-xs">
                ollama pull nomic-embed-text<br/>
                ollama pull llama3.2
              </code>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving || !config.embedding_model || !config.llm_model}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
