import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Register.css';

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
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
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5050/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Registration successful!');
        setFormData({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });
      } else {
        setMessage(data.error || 'Registration failed');
      }
    } catch (error) {
      setMessage('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
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
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                placeholder="Choose a username"
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
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Message */}
            {message && (
              <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Footer */}
          {/* Footer */}
          <div className="form-footer">
            <p>Already have an account? <Link to="/login" className="link">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;