import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  
  // Editing states
  const [isEditingFullName, setIsEditingFullName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);
  
  // Form values
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [instagramUsername, setInstagramUsername] = useState(user?.instagram_username || '');
  
  // Loading and error states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setInstagramUsername(user.instagram_username || '');
    }
  }, [user, navigate]);

  const handleSaveField = async (field, value) => {
    setSaving(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value })
      });

      const data = await response.json();

      if (data.success) {
        setUser({ ...user, [field]: value });
        // Close edit mode
        if (field === 'full_name') setIsEditingFullName(false);
        if (field === 'username') setIsEditingUsername(false);
        if (field === 'email') setIsEditingEmail(false);
        if (field === 'instagram_username') setIsEditingInstagram(false);
      } else {
        setError(data.message || 'Failed to update');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (field) => {
    if (field === 'full_name') {
      setFullName(user.full_name || '');
      setIsEditingFullName(false);
    }
    if (field === 'username') {
      setUsername(user.username || '');
      setIsEditingUsername(false);
    }
    if (field === 'email') {
      setEmail(user.email || '');
      setIsEditingEmail(false);
    }
    if (field === 'instagram_username') {
      setInstagramUsername(user.instagram_username || '');
      setIsEditingInstagram(false);
    }
    setError('');
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
        <div className="profile-container">
          <h1>Profile</h1>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              {/* Editable Full Name */}
              {isEditingFullName ? (
                <div className="edit-field header-edit">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={saving}
                    placeholder="Full Name"
                  />
                  <button 
                    onClick={() => handleSaveField('full_name', fullName)}
                    disabled={saving}
                    className="save-btn"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => handleCancel('full_name')}
                    disabled={saving}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h2 
                  onClick={() => setIsEditingFullName(true)} 
                  className="editable-name"
                >
                  {user.full_name || 'No name provided'} ✏️
                </h2>
              )}
            </div>

            <div className="profile-details">
              {/* Username Field */}
              <div className="detail-item">
                <label>Username</label>
                {isEditingUsername ? (
                  <div className="edit-field">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={saving}
                    />
                    <button 
                      onClick={() => handleSaveField('username', username)}
                      disabled={saving}
                      className="save-btn"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleCancel('username')}
                      disabled={saving}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p onClick={() => setIsEditingUsername(true)} className="editable">
                    @{user.username || 'unknown'} ✏️
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="detail-item">
                <label>Email</label>
                {isEditingEmail ? (
                  <div className="edit-field">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={saving}
                    />
                    <button 
                      onClick={() => handleSaveField('email', email)}
                      disabled={saving}
                      className="save-btn"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleCancel('email')}
                      disabled={saving}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p onClick={() => setIsEditingEmail(true)} className="editable">
                    {user.email || 'No email provided'} ✏️
                  </p>
                )}
              </div>

              {/* Instagram Field */}
              <div className="detail-item">
                <label>Instagram</label>
                {isEditingInstagram ? (
                  <div className="edit-field">
                    <span>@</span>
                    <input
                      type="text"
                      value={instagramUsername}
                      onChange={(e) => setInstagramUsername(e.target.value)}
                      placeholder="username"
                      disabled={saving}
                    />
                    <button 
                      onClick={() => handleSaveField('instagram_username', instagramUsername)}
                      disabled={saving}
                      className="save-btn"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleCancel('instagram_username')}
                      disabled={saving}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p onClick={() => setIsEditingInstagram(true)} className="editable">
                    {instagramUsername ? `@${instagramUsername}` : 'Add Instagram'} ✏️
                  </p>
                )}
              </div>

              {/* Member Since (not editable) */}
              <div className="detail-item">
                <label>Member Since</label>
                <p>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Date not available'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;