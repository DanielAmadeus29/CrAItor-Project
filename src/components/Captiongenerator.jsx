import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import { Upload } from 'lucide-react';
import './Captiongenerator.css';

function CaptionGenerator() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [rawLabels, setRawLabels] = useState([]);
  const [customTags, setCustomTags] = useState('');
  const [finalCaption, setFinalCaption] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState('upload'); // upload, edit-tags, caption
  const [error, setError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  // API endpoint
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

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
      
      // Automatically analyze image for tags
      analyzeImage(file);
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

  const analyzeImage = async (file) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${API_URL}/api/caption/analyze-image`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }
      
      setSuggestedTags(data.suggested_tags || []);
      setRawLabels((data.raw_labels || []).map((l, i) => ({ label: l, p: data.scores?.[i] ?? 0 })));
      setStep('edit-tags');
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError(error.message || 'Failed to analyze image. Please make sure the backend server is running.');
      setStep('upload');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptTags = () => {
    generateCaption(suggestedTags);
  };

  const handleCustomTags = () => {
    const tags = customTags.split(',').map(t => t.trim()).filter(t => t);
    if (tags.length > 0) {
      generateCaption(tags);
    } else {
      generateCaption(suggestedTags);
    }
  };

  const generateCaption = async (tags) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/caption/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Caption generation failed');
      }
      
      setFinalCaption(data.caption);
      setStep('caption');
    } catch (error) {
      console.error('Error generating caption:', error);
      setError(error.message || 'Failed to generate caption. Please try again.');
      setStep('edit-tags');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSuggestedTags([]);
    setRawLabels([]);
    setCustomTags('');
    setFinalCaption('');
    setStep('upload');
    setError(null);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(finalCaption)
      .then(() => {
        alert('Caption copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setError('Failed to copy caption');
      });
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
        <div className="caption-generator-container">
          <div className="caption-header">
            <button className="back-button" onClick={() => navigate('/home')}>
              ← Back to Overview
            </button>
            <div className="header-title">
              <h1>Tag-Conditioned Caption Generation</h1>
            </div>
            <p className="header-subtitle">
              Two-stage pipeline: EfficientNet-B0 image tagging followed by Phi-1.5 caption generation
            </p>
            <button className="about-model-button" onClick={() => setShowInfo(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              About this Model
            </button>
          </div>

          <div className="caption-content">
            {step === 'upload' && (
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
                  <div className="upload-icon"><Upload size={40} strokeWidth={1.5} /></div>
                  <h3>Upload your photo</h3>
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
            )}

            {isAnalyzing && (
              <div className="loading-section">
                <div className="spinner-large"></div>
                <p className="loading-text">Analyzing your image...</p>
              </div>
            )}

            {step === 'edit-tags' && !isAnalyzing && (
              <div className="tags-section">
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                </div>

                <div className="tags-content">
                  <div className="detected-block">
                    <h3 className="input-label">Stage 1 output: cleaned tags</h3>
                    <div className="tags-display-small">
                      {suggestedTags.map((tag) => (
                        <span key={tag} className="tag-small">{tag}</span>
                      ))}
                    </div>
                    <button
                      onClick={handleAcceptTags}
                      className="btn-primary"
                      disabled={isGenerating || suggestedTags.length === 0}
                    >
                      {isGenerating ? 'Generating…' : 'Generate from detected tags'}
                    </button>
                  </div>

                  {rawLabels.length > 0 && (
                    <details className="raw-labels">
                      <summary>Raw ImageNet labels ({rawLabels.length}) with softmax probabilities</summary>
                      <table>
                        <tbody>
                          {rawLabels.map(({ label, p }) => (
                            <tr key={label} className={p < 0.05 ? 'below-threshold' : ''}>
                              <td>{label}</td>
                              <td>{p.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="raw-note">Greyed rows fall below the 0.05 threshold and are dropped during cleaning.</p>
                    </details>
                  )}

                  <div className="tags-actions">
                    <div className="custom-tags-input">
                      <label htmlFor="custom-tags" className="input-label">
                        Replace tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        id="custom-tags"
                        placeholder="dog, beach, sunset, friends..."
                        value={customTags}
                        onChange={(e) => setCustomTags(e.target.value)}
                        className="text-input"
                        disabled={isGenerating}
                      />
                      <button 
                        onClick={handleCustomTags} 
                        className="btn-secondary"
                        disabled={isGenerating}
                      >
                        Generate from these tags
                      </button>
                    </div>

                    <button 
                      onClick={handleReset}
                      className="btn-text"
                      disabled={isGenerating}
                    >
                      ← Start Over
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
              </div>
            )}

            {step === 'caption' && (
              <div className="caption-section">
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                </div>

                <div className="caption-result">
                  <h2 className="section-title">Your Caption</h2>
                  <p className="section-subtitle">
                    Generated by Phi-1.5 from the tags listed below
                  </p>

                  <div className="caption-box">
                    <p className="caption-text">{finalCaption}</p>
                  </div>

                  <div className="caption-actions">
                    <button 
                      onClick={handleCopyCaption}
                      className="btn-primary"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy Caption
                    </button>
                    <button 
                      onClick={handleReset}
                      className="btn-secondary"
                    >
                      Create Another
                    </button>
                  </div>

                  <div className="tags-used">
                    <p className="tags-label">Tags used:</p>
                    <div className="tags-display-small">
                      {(customTags ? customTags.split(',').map(t => t.trim()) : suggestedTags).map((tag, idx) => (
                        <span key={idx} className="tag-small">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
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
              <h2>About This Pipeline</h2>
              <button className="modal-close" onClick={() => setShowInfo(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="info-section">
                <h3>How It Works</h3>
                <p>A two-stage pipeline:</p>
                <ul>
                  <li><strong>EfficientNet-B0</strong> (ImageNet-1k): top-15 labels, cleaned to at most 8 tags</li>
                  <li><strong>Phi-1.5</strong> (1.3B parameters): writes a caption conditioned on the tags</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>Prompting and Decoding</h3>
                <p>Generation settings:</p>
                <ul>
                  <li>Few-shot prompt with 3 tags-to-caption examples; the top 6 tags are inserted</li>
                  <li>Instructed to describe the content accurately in under 20 words</li>
                  <li>Sampling: temperature 0.7, top-p 0.92, top-k 50, repetition penalty 1.2</li>
                  <li>Output truncated to the first line and at most 25 words</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>Customization</h3>
                <p>
                  The language model only sees the tags, never the image. Replacing the detected tags
                  lets you examine how the tag set alone determines the caption.
                </p>
              </div>

              <div className="warning-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Note</strong>
                  <p>
                    Captions are sampled, so the same tags can produce different text. Accuracy is
                    bounded by the ImageNet-1k tag vocabulary.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaptionGenerator;