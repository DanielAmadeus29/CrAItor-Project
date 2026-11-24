import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../UserContexts';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser(); // Get setUser from context
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    console.log('Attempting login with:', formData.username);
    
    try {
      console.log('Sending request to:', 'http://localhost:5050/api/login');
      
      const response = await fetch('http://localhost:5050/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setMessage('Login successful!');
        
        // Save user to context (this also saves to localStorage)
        setUser(data.user);
        
        // Navigate to home page after 1 second
        setTimeout(() => {
          navigate('/home');
        }, 1000);
      } else {
        setMessage(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="header">
          <div className="logo-container">
            <div className="logo">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#667eea"/>
                <path d="M2 17L12 22L22 17" stroke="#764ba2" strokeWidth="2" strokeLinecap="round"/>
                <path d="M2 12L12 17L22 12" stroke="#764ba2" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h1 className="title">CrAItor</h1>
          <p className="subtitle">Photo analysis toolkit</p>
        </div>

        {/* Form Card */}
        <div className="form-card">
          <div className="form-content">
            {/* Username */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="submit-btn"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Message */}
            {message && (
              <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="form-footer">
            <p>Don't have an account? <Link to="/register" className="link">Sign up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;