import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './AITools.css';

function AITools() {
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleToolClick = (toolPath) => {
    navigate(toolPath);
  };

  if (!user) {
    return (
      <div className="loading-container">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <div className="ai-tools-container">
          <div className="ai-tools-header">
            <div className="header-title">
              <span className="header-icon">✨</span>
              <h1>AI Tools</h1>
            </div>
            <p className="header-subtitle">
              Choose your AI tool
            </p>
          </div>

          <div className="tools-grid">
            <button 
              className="tool-card"
              onClick={() => handleToolClick('/imageaesthetic')}
            >
              <div className="tool-icon">
                <span>🎨</span>
              </div>
              <h3>Image Aesthetic (Photography)</h3>
              <p>Analyze and score the aesthetic quality of your images using AI</p>
            </button>
            <button 
              className="tool-card"
              onClick={() => handleToolClick('/Captiongenerator')}
            >
              <div className="tool-icon">
                <span>🎨</span>
              </div>
              <h3>Caption Generator</h3>
              <p>Awww</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AITools;