import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './Portfolio.css';

function Portfolio() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user?.role || 'Creator');
  const [topTags, setTopTags] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const roleOptions = [
    'Photographer',
    'Artist',
    'Other'
  ];

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else {
      fetchPosts();
      setSelectedRole(user.role || 'Creator');
    }
  }, [user, navigate]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/posts/user/${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        calculateTopTags(data.posts);
        setError(null);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
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

  const handleRoleChange = async (newRole) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        setSelectedRole(newRole);
        setUser({ ...user, role: newRole });
        setIsEditingRole(false);
      } else {
        alert('Failed to update role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role. Please try again.');
    }
  };

  const handlePostClick = () => {
    navigate('/postcontent');
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedPosts = posts.filter(post => post.id !== postId);
        setPosts(updatedPosts);
        calculateTopTags(updatedPosts);
        alert('Post deleted successfully!');
      } else {
        alert(`Failed to delete post: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete post. Please check console for details.');
    }
  };

  const handleImageClick = (imageUrl, e) => {
    e.stopPropagation();
    setSelectedImage(imageUrl);
  };

  const closeModal = () => {
    setSelectedImage(null);
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
        <div className="portfolio-container">
          {/* User Header */}
          <div className="portfolio-header">
            <div className="user-avatar">
              <span>{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-info">
              {/* Full Name */}
              <h1 className="user-fullname">{user.full_name || 'No Name'}</h1>
              
              {/* Username */}
              <p className="user-username">@{user.username}</p>
              
              {/* Instagram Link - Display Only (Edit in Profile) */}
              {user.instagram_username && (
                <div className="user-instagram">
                  <a 
                    href={`https://instagram.com/${user.instagram_username}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="instagram-badge"
                  >
                    <svg 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      className="instagram-icon"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    @{user.instagram_username}
                  </a>
                </div>
              )}

              {/* Role */}
              <div className="user-role">
                {isEditingRole ? (
                  <select   
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    onBlur={() => setIsEditingRole(false)}
                    autoFocus
                    className="role-dropdown"
                  >
                    {roleOptions.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                ) : (
                  <span 
                    className="role-display"
                    onClick={() => setIsEditingRole(true)}
                  >
                    Creator: {selectedRole} ✏️
                  </span>
                )}
              </div>

              {/* Display Top Tags if 5+ verified posts */}
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
          
          {/* Post Button */}
          <div className="post-button-container">
            <button className="post-button" onClick={handlePostClick}>
              ➕ Create New Post
            </button>
          </div>
          
          {/* Posts Section */}
          <div className="posts-section">
            <h2>My Posts</h2>
            
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={fetchPosts}>Retry</button>
              </div>
            )}

            {loading ? (
              <div className="loading">
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="no-posts">
                <p>No posts yet. Click "Create New Post" to get started!</p>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map((post) => (
                  <div key={post.id} className="post-card">
                    {post.image_url && (
                      <img 
                        src={post.image_url}
                        alt={post.title}
                        onClick={(e) => handleImageClick(post.image_url, e)}
                        style={{ cursor: 'pointer' }}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                        }}
                      />
                    )}
                    <div className="post-info">
                      <h3>{post.title}</h3>
                      {post.description && <p className="post-caption">{post.description}</p>}
                      
                      <div className="post-meta">
                        <div className="post-tags">
                          {post.category && (
                            <span className="post-category">| {post.category} |</span>
                          )}
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
                      
                      <button 
                        className="delete-button"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Delete
                      </button>
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

export default Portfolio;