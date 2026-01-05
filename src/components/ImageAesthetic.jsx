import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './ImageAesthetic.css';

function ImageAesthetic() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState(null);

  // API endpoint - change this to your backend URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const aestheticAttributes = [
    { name: 'BalancingElements', label: 'Balancing Elements', serverName: 'Balancing Elements' },
    { name: 'ColorHarmony', label: 'Color Harmony', serverName: 'Color Harmony' },
    { name: 'Content', label: 'Content', serverName: 'Content' },
    { name: 'DoF', label: 'Depth of Field', serverName: 'Depth of Field' },
    { name: 'Light', label: 'Light', serverName: 'Light' },
    { name: 'MotionBlur', label: 'Motion Blur', serverName: 'Motion Blur' },
    { name: 'Object', label: 'Object Emphasis', serverName: 'Object Emphasis' },
    { name: 'Repetition', label: 'Repetition', serverName: 'Repetition' },
    { name: 'RuleOfThirds', label: 'Rule of Thirds', serverName: 'Rule of Thirds' },
    { name: 'Symmetry', label: 'Symmetry', serverName: 'Symmetry' },
    { name: 'VividColor', label: 'Vivid Color', serverName: 'Vivid Color' }
  ];

  const attributeDescriptions = {
    BalancingElements: {
      positive: 'Visual weight distributed evenly across frame',
      negative: 'Heavy or unbalanced composition'
    },
    ColorHarmony: {
      positive: 'Colors that complement each other well',
      negative: 'Clashing or discordant color combinations'
    },
    Content: {
      positive: 'Interesting, meaningful, or engaging subject matter',
      negative: 'Boring or uninteresting content'
    },
    DoF: {
      positive: 'Appropriate depth creating focus and dimension',
      negative: 'Everything in focus or wrong focus area'
    },
    Light: {
      positive: 'Well-lit, good exposure, dramatic lighting',
      negative: 'Poor lighting, overexposed or underexposed'
    },
    MotionBlur: {
      positive: 'Intentional blur conveying movement or speed',
      negative: 'Unwanted blur or static feeling'
    },
    Object: {
      positive: 'Clear, well-defined main subject',
      negative: 'Unclear or competing focal points'
    },
    Repetition: {
      positive: 'Pleasing patterns or repeated elements',
      negative: 'Chaotic or lack of visual rhythm'
    },
    RuleOfThirds: {
      positive: 'Subject positioned along grid lines or intersections',
      negative: 'Subject centered or poorly positioned'
    },
    Symmetry: {
      positive: 'Well-balanced, mirror-like composition',
      negative: 'Unbalanced or asymmetrical layout'
    },
    VividColor: {
      positive: 'Rich, saturated, and vibrant colors that catch attention',
      negative: 'Dull, muted, or washed-out colors'
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (16MB max)
      const maxSize = 16 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 16MB');
        return;
      }

      setError(null);
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setResults(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const event = { target: { files: [file] } };
      handleImageSelect(event);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await fetch(`${API_URL}/api/aesthetic`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Create attribute lookup map
      const attributeLookup = {};
      if (data.attributes) {
        Object.keys(data.attributes).forEach(key => {
          attributeLookup[key] = data.attributes[key];
        });
      }

      // Map attributes to frontend format
      const formattedResults = {
        overallScore: data.overall_score.toFixed(3),
        percentage: data.percentage.toFixed(1),
        category: data.category,
        attributes: aestheticAttributes.map(attr => {
          const score = attributeLookup[attr.serverName] || 0;
          return {
            ...attr,
            score: score.toFixed(3),
            numericScore: score
          };
        }),
        topAttributes: data.top_attributes || [],
        bottomAttributes: data.bottom_attributes || []
      };

      setResults(formattedResults);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError(error.message || 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResults(null);
    setError(null);
  };

  const getScoreColor = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return '#27ae60';
    if (numScore >= 0.6) return '#2ecc71';
    if (numScore >= 0.4) return '#f39c12';
    if (numScore >= 0.2) return '#e67e22';
    return '#e74c3c';
  };

  const getScoreGrade = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.9) return 'A+';
    if (numScore >= 0.8) return 'A';
    if (numScore >= 0.7) return 'B+';
    if (numScore >= 0.6) return 'B';
    if (numScore >= 0.5) return 'C';
    return 'D';
  };

  // Helper function to normalize score for display (handles negative values)
  const normalizeScoreForDisplay = (score) => {
    const numScore = parseFloat(score);
    // Clamp between 0 and 100 for display purposes
    return Math.max(0, Math.min(100, numScore * 100));
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
        <div className="image-aesthetic-container">
          <div className="aesthetic-header">
            <button className="back-button" onClick={() => navigate('/aitools')}>
              ← Back to AI Tools
            </button>
            <div className="header-title">
              <div className="header-icon">🎨</div>
              <h1>Image Aesthetic Analysis</h1>
            </div>
            <p className="header-subtitle">
              Advanced AI-powered aesthetic quality assessment using deep learning
            </p>
            <button className="about-model-button" onClick={() => setShowInfo(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              About this Model
            </button>
          </div>

          <div className="aesthetic-content">
            {!imagePreview ? (
              <div className="upload-section">
                <label 
                  className="upload-box"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">📸</div>
                  <h3>Choose an image</h3>
                  <p>Click to browse or drag and drop</p>
                  <p className="file-types">Supports: JPG, PNG, WEBP, GIF • Max 16MB</p>
                </label>
                
                {error && (
                  <div className="error-banner">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="analysis-section">
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <div className="image-actions">
                    <button 
                      className="btn-primary"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="spinner-small"></span>
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Image'
                      )}
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={handleReset}
                      disabled={isAnalyzing}
                    >
                      Reset
                    </button>
                  </div>
                  
                  {error && (
                    <div className="error-banner">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                {results && (
                  <div className="results-container">
                    {/* Overall Score Card */}
                    <div className="overall-score-card">
                      <div className="score-header">
                        <h2>Overall Aesthetic Score</h2>
                        <span className="score-category" style={{ color: results.category.color }}>
                          {results.category.emoji} {results.category.name}
                        </span>
                      </div>
                      
                      <div className="score-display">
                        <div className="score-circle" style={{ 
                          background: `conic-gradient(${getScoreColor(results.overallScore)} ${results.percentage}%, #e9ecef 0%)` 
                        }}>
                          <div className="score-inner">
                            <div className="score-value">{results.overallScore}</div>
                            <div className="score-max">/ 1.0</div>
                          </div>
                        </div>
                        
                        <div className="score-details">
                          <div className="score-percentage">{results.percentage}%</div>
                          <div className="score-grade">Grade: {getScoreGrade(results.overallScore)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="highlights-section">
                      <div className="highlight-card strengths-card">
                        <h3>
                          <span className="icon">💪</span>
                          Strongest Attributes
                        </h3>
                        <div className="highlight-list">
                          {results.topAttributes.map((attr, index) => (
                            <div key={index} className="highlight-item">
                              <span className="highlight-name">{attr.name}</span>
                              <span className="highlight-score" style={{ color: '#27ae60' }}>
                                {attr.score.toFixed(3)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="highlight-card weaknesses-card">
                        <h3>
                          <span className="icon">⚠️</span>
                          Areas for Improvement
                        </h3>
                        <div className="highlight-list">
                          {results.bottomAttributes.map((attr, index) => (
                            <div key={index} className="highlight-item">
                              <span className="highlight-name">{attr.name}</span>
                              <span className="highlight-score" style={{ color: '#e74c3c' }}>
                                {attr.score.toFixed(3)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Detailed Attributes */}
                    <div className="attributes-section">
                      <h3>Detailed Attribute Scores</h3>
                      <div className="attributes-grid">
                        {results.attributes.map((attr, index) => (
                          <div key={index} className="attribute-card">
                            <div className="attribute-header">
                              <span className="attribute-name">{attr.label}</span>
                              <span className="score-value" style={{ color: getScoreColor(attr.score) }}>
                                {attr.score}
                              </span>
                            </div>
                            <div className="score-bar-container">
                              <div className="score-bar-track">
                                <div className="score-bar-center-line"></div>
                                <div 
                                  className="score-bar"
                                  style={{
                                    width: `${Math.abs(attr.numericScore) * 50}%`,
                                    left: attr.numericScore >= 0 ? '50%' : `${50 - Math.abs(attr.numericScore) * 50}%`,
                                    backgroundColor: getScoreColor(attr.score)
                                  }}
                                />
                              </div>
                            </div>
                            <div className="attribute-description">
                              {attr.numericScore >= 0.5 ? (
                                <span className="desc-positive">
                                  ✓ {attributeDescriptions[attr.name]?.positive}
                                </span>
                              ) : (
                                <span className="desc-negative">
                                  ✗ {attributeDescriptions[attr.name]?.negative}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>About This Model</h2>
              <button className="modal-close" onClick={() => setShowInfo(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Important Notice</strong>
                  <p>This model is trained on the AADB (Aesthetic Visual Analysis) dataset. Results are <strong>not 100% accurate</strong> and should be used as a reference only, not as definitive judgments of image quality.</p>
                </div>
              </div>

              <div className="info-section">
                <h3>Understanding the Scores</h3>
                <p>Each attribute is scored from <strong>-1.0 to +1.0</strong>:</p>
                <ul>
                  <li><span className="positive">Positive values (0.0 to +1.0)</span> indicate presence of the attribute</li>
                  <li><span className="neutral">Zero (0.0)</span> indicates neutral or baseline</li>
                  <li><span className="negative">Negative values (-1.0 to 0.0)</span> indicate absence or violation of the attribute</li>
                </ul>
                <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                  The bars visualize scores from -1 (far left) through 0 (center) to +1 (far right).
                </p>
              </div>

              <div className="attributes-info">
                <h3>Attribute Descriptions</h3>
                {aestheticAttributes.map((attr) => (
                  <div key={attr.name} className="attr-description">
                    <h4>{attr.label}</h4>
                    <div className="desc-row">
                      <span className="positive-label">✓ Good:</span>
                      <span>{attributeDescriptions[attr.name].positive}</span>
                    </div>
                    <div className="desc-row">
                      <span className="negative-label">✗ Poor:</span>
                      <span>{attributeDescriptions[attr.name].negative}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageAesthetic;