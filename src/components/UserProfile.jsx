import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './UserProfile.css';

function UserProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: currentUser } = useUser();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topTags, setTopTags] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
    } else {
      fetchUserProfile();
      fetchUserPosts();
    }
  }, [currentUser, userId, navigate]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setProfileUser(data.user);
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile');
    }
  };

  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/posts/user/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        calculateTopTags(data.posts);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const calculateTopTags = (posts) => {
    const verifiedPosts = posts.filter(post => isAIVerified(post));

    if (verifiedPosts.length < 5) {
      setTopTags([]);
      return;
    }

    const tagCounts = {};
    verifiedPosts.forEach(post => {
      try {
        const aiTags = typeof post.ai_tags === 'string' 
          ? JSON.parse(post.ai_tags) 
          : post.ai_tags;
        
        const prediction = aiTags.prediction;
        if (prediction) {
          tagCounts[prediction] = (tagCounts[prediction] || 0) + 1;
        }
      } catch (err) {
        console.error('Error parsing AI tags:', err);
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }));

    setTopTags(sortedTags);
  };

  const isAIVerified = (post) => {
    if (!post.ai_tags) return false;
    
    try {
      const aiTags = typeof post.ai_tags === 'string' 
        ? JSON.parse(post.ai_tags) 
        : post.ai_tags;
      
      const aiPrediction = aiTags.prediction?.toLowerCase().trim();
      const userCategory = post.user_category?.toLowerCase().trim();
      
      return aiPrediction && userCategory && aiPrediction === userCategory;
    } catch (err) {
      console.error('Error parsing AI tags:', err);
      return false;
    }
  };

  const handleImageClick = (imageUrl, e) => {
    e.stopPropagation();
    setSelectedImage(imageUrl);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  if (!currentUser) {
    return (
      <div className="loading-container">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <div className="error-container">
            <h2>User Not Found</h2>
            <button onClick={() => navigate('/explore')}>Back to Explore</button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser.id === parseInt(userId);

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <div className="user-profile-container">
          <button className="back-button" onClick={() => navigate('/explore')}>
            ← Back to Explore
          </button>

          {/* Profile Header */}
          <div className="profile-header">
            <div className="user-avatar-large">
              <span>{profileUser.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-info-section">
              {/* Full Name */}
              <h1 className="user-fullname">{profileUser.full_name || 'No Name'}</h1>
              
              {/* Username */}
              <p className="user-username">@{profileUser.username}</p>
              
              {/* Instagram */}
              {profileUser.instagram_username && (
                <div className="user-instagram">
                  <a 
                    href={`https://instagram.com/${profileUser.instagram_username}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="instagram-badge"
                  >
                    <svg 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    @{profileUser.instagram_username}
                  </a>
                </div>
              )}
              
              {/* Role */}
              <div className="user-role">
                <span className="role-badge">
                  Creator: {profileUser.role || 'Creator'}
                </span>
              </div>

              {/* Badges/Tags */}
              {topTags.length > 0 && (
                <div className="user-tags">
                  <div className="tags-container">
                    {topTags.map((tagObj, index) => (
                      <span key={index} className="user-tag">
                        {tagObj.tag} ({tagObj.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-posts-section">
            <h2>{isOwnProfile ? 'My Posts' : `${profileUser.username}'s Posts`}</h2>
            
            {loading ? (
              <div className="loading">
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="no-posts">
                <p>{isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}</p>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map((post) => (
                  <div key={post.id} className="profile-post-card">
                    {post.image_url && (
                      <div className="post-image-container">
                        <img 
                          src={post.image_url}
                          alt={post.title}
                          onClick={(e) => handleImageClick(post.image_url, e)}
                          style={{ cursor: 'pointer' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                          }}
                        />
                      </div>
                    )}
                    <div className="post-info">
                      <h3>{post.title}</h3>
                      {post.description && <p className="post-caption">{post.description}</p>}
                      
                      <div className="post-meta">
                        <div className="post-tags">
                          {post.category && <span className="post-category">| {post.category} |</span>}
                          {post.user_category && (
                            <span className="post-user-category-container">
                              <span className="post-user-category">| {post.user_category} |</span>
                              {isAIVerified(post) && (
                                <span className="ai-verified-badge">
                                  <span className="ai-verified-icon">✓</span>
                                  AI Verified
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <span className="post-date">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="image-modal-content">
            <button className="modal-close" onClick={closeModal}>
              ✕
            </button>
            <img 
              src={selectedImage} 
              alt="Full size" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;