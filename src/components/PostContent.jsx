// PostContent.js
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './PostContent.css';

function PostContent() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    user_category: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
 
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to get AI prediction
  const predictImage = async (file) => {
    console.log('=== STARTING AI PREDICTION ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    
    setIsPredicting(true);
    setPredictionError(null);
    setPrediction(null);
    
    try {
      const predictionData = new FormData();
      predictionData.append('file', file);
      
      console.log('Sending request to: http://localhost:5000/api/predict');

      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        body: predictionData
      });

      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Response data:', result);

      if (result.success) {
        console.log('✅ SUCCESS! Prediction:', result.prediction);
        setPrediction(result);
        
        setFormData(prev => ({
          ...prev,
          user_category: result.prediction
        }));
        console.log('User category automatically set to:', result.prediction);
      } else {
        console.error('❌ PREDICTION FAILED:', result.error);
        setPredictionError(result.error || 'Failed to predict image');
      }
    } catch (error) {
      console.error('❌ FETCH ERROR:', error);
      setPredictionError('Failed to get AI prediction. You can still post manually.');
    } finally {
      setIsPredicting(false);
      console.log('=== AI PREDICTION COMPLETED ===');
    }
  };

  const handleImageChange = async (e) => {
    console.log('=== IMAGE SELECTED ===');
    const file = e.target.files[0];
    
    if (file) {
      console.log('File selected:', file.name);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setPrediction(null);
      
      // Clear user_category when new image is selected
      setFormData(prev => ({
        ...prev,
        user_category: ''
      }));
      
      // Automatically trigger AI prediction
      await predictImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== SUBMITTING POST ===');
    console.log('Form data:', formData);
    console.log('Prediction data:', prediction);
    
    if (!formData.title || !imageFile) {
      alert('Please fill in at least the title and upload an image');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('user_id', user.id);
      data.append('username', user.username);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('user_category', formData.user_category);
      data.append('image', imageFile);
      
      // Add AI prediction data as JSON string for ai_tags field
      if (prediction) {
        const aiTags = {
          prediction: prediction.prediction,
          confidence: prediction.confidence,
          top_predictions: prediction.top_predictions,
          timestamp: new Date().toISOString()
        };
        data.append('ai_tags', JSON.stringify(aiTags));
        console.log('AI tags being saved:', aiTags);
      } else {
        console.log('No AI tags to save');
      }

      console.log('Sending post to: http://localhost:5000/api/posts');
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        body: data
      });

      const result = await response.json();
      console.log('Post creation result:', result);

      if (result.success) {
        console.log('✅ POST CREATED SUCCESSFULLY!');
        alert('Post created successfully! 🎉');
        navigate('/portfolio');
      } else {
        console.error('❌ POST CREATION FAILED:', result.error);
        alert('Failed to create post: ' + result.error);
      }
    } catch (error) {
      console.error('❌ SUBMIT ERROR:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
      console.log('=== POST SUBMISSION COMPLETED ===');
    }
  };

  const handleCancel = () => {
    navigate('/portfolio');
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
        <div className="post-content-container">
          <div className="post-form-header">
            <h1>Create New Post</h1>
            <p>Share your creative work with the world</p>
          </div>

          <form onSubmit={handleSubmit} className="post-form">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter post title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your work..."
                rows="4"
              />
            </div>

            {/* Category Dropdown - MOVED ABOVE UPLOAD */}
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a category</option>
                <option value="Photography">Photography</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Upload Image Section */}
            <div className="form-group">
              <label htmlFor="image">Upload Image *</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                />
                {imagePreview && (
                  <div className="image-preview-container">
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                    </div>
                    
                    {/* AI Prediction Loading */}
                    {isPredicting && (
                      <div className="ai-prediction-loading">
                        <div className="spinner"></div>
                        <p>AI is analyzing your image...</p>
                      </div>
                    )}

                    {/* AI Prediction Error */}
                    {predictionError && (
                      <div className="ai-prediction-error">
                        <p>⚠️ {predictionError}</p>
                        <small>You can still post without AI tags</small>
                      </div>
                    )}

                    {/* AI Prediction Results */}
                    {prediction && !isPredicting && (
                      <div className="ai-tags-section">
                        <div className="ai-main-prediction">
                          <div className="prediction-label">Detected:</div>
                          <div className="prediction-value-large">{prediction.prediction}</div>
                          <div className="confidence-container-large">
                            <span className="confidence-label-large">Confidence:</span>
                            <span className="confidence-value-large">
                              {(prediction.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="confidence-bar">
                            <div 
                              className="confidence-fill"
                              style={{ width: `${prediction.confidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {prediction.top_predictions && prediction.top_predictions.length > 1 && (
                          <div className="ai-other-predictions">
                            <div className="other-predictions-label">Other suggestions:</div>
                            {prediction.top_predictions.slice(1).map((pred, index) => (
                              <div key={index} className="prediction-row">
                                <span className="pred-name">{pred.class}</span>
                                <span className="pred-percent">
                                  {(pred.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="user_category">
                User Category
                {prediction && (
                  <span className="auto-filled-indicator"></span>
                )}
              </label>
              <input
                type="text"
                id="user_category"
                name="user_category"
                value={formData.user_category}
                onChange={handleInputChange}
                placeholder={prediction ? "AI detected: " + prediction.prediction : "Your custom category"}
              />
              {prediction && (
                <small className="field-hint">
                  Auto-filled based on AI prediction. You can still edit it.
                </small>
              )}
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting || isPredicting}
              >
                {isSubmitting ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostContent;