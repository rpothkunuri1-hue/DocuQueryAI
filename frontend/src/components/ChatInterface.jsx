import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const ChatInterface = ({ hasDocuments }) => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/conversations`);
      setConversations(response.data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !hasDocuments) return;

    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/ask`, { 
        question,
        conversation_id: currentConversationId 
      });
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentConversationId(response.data.conversation_id);
      await loadConversations();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to get answer';
      const errorType = err.response?.data?.error_type;
      
      let displayError = errorMsg;
      if (errorType === 'ollama_connection') {
        displayError = `⚠️ ${errorMsg}`;
      }
      
      const errorMessage = {
        role: 'error',
        content: displayError,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const response = await axios.get(`${API_URL}/conversations/${convId}`);
      const conv = response.data;
      
      const loadedMessages = [];
      conv.messages.forEach(msg => {
        loadedMessages.push({ role: 'user', content: msg.question });
        loadedMessages.push({ 
          role: 'assistant', 
          content: msg.answer, 
          sources: msg.sources 
        });
      });
      
      setMessages(loadedMessages);
      setCurrentConversationId(convId);
      setShowHistory(false);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const deleteConversation = async (convId) => {
    if (!confirm('Delete this conversation?')) return;
    
    try {
      await axios.delete(`${API_URL}/conversations/${convId}`);
      await loadConversations();
      
      if (currentConversationId === convId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const exportConversation = async (format = 'markdown') => {
    if (!currentConversationId) return;
    
    try {
      const response = await axios.get(
        `${API_URL}/conversations/${currentConversationId}/export?format=${format}`,
        format === 'pdf' ? { responseType: 'blob' } : {}
      );
      
      if (format === 'pdf') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${currentConversationId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([response.data.content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${currentConversationId}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export conversation:', err);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="border-b border-gray-200 p-4 bg-white flex justify-between items-center">
        <h2 className="font-semibold text-text">
          {currentConversationId ? 'Conversation' : 'New Conversation'}
        </h2>
        <div className="flex gap-2">
          {currentConversationId && (
            <div className="flex gap-1">
              <button
                onClick={() => exportConversation('markdown')}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Export as Markdown"
              >
                📥 MD
              </button>
              <button
                onClick={() => exportConversation('pdf')}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Export as PDF"
              >
                📄 PDF
              </button>
            </div>
          )}
          {messages.length > 0 && (
            <button
              onClick={startNewConversation}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ➕ New
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 text-sm bg-primary text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            📜 History
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="absolute top-16 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-80 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-text mb-3">Conversation History</h3>
            {conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div key={conv.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => loadConversation(conv.id)}
                      >
                        <p className="text-sm font-medium text-text truncate">
                          {conv.messages[0]?.question || 'Untitled'}
                        </p>
                        <p className="text-xs text-secondary mt-1">
                          {conv.messages.length} messages • {formatDate(conv.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary text-center py-4">
                No conversations yet
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-text mb-2">
                {hasDocuments ? 'Ask a question about your documents' : 'Upload a document to get started'}
              </h3>
              <p className="text-secondary">
                {hasDocuments
                  ? 'Type your question below and get AI-powered answers'
                  : 'Upload a PDF, DOCX, or TXT file on the left panel'}
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : message.role === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-secondary mb-2">Sources:</p>
                  <div className="space-y-2">
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                        <p className="font-medium text-text">
                          {source.source} (Chunk {source.chunk + 1})
                        </p>
                        <p className="text-secondary mt-1">{source.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animation-delay-400"></div>
                </div>
                <span className="text-secondary text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-6 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={hasDocuments ? "Ask a question about your documents..." : "Upload a document first..."}
            disabled={!hasDocuments || loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!hasDocuments || loading || !question.trim()}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
