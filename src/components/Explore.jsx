import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './Explore.css';

function Explore() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else {
      fetchCreators();
    }
  }, [user, navigate]);

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

  const calculateTopTags = (posts) => {
    const verifiedPosts = posts.filter(post => isAIVerified(post));

    if (verifiedPosts.length < 5) {
      return [];
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
      .slice(0, 2)
      .map(([tag]) => tag);

    return sortedTags;
  };

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users');
      const users = await response.json();
      
      const usersWithData = await Promise.all(
        users.map(async (creator) => {
          const postsResponse = await fetch(`http://localhost:5000/api/posts/user/${creator.id}`);
          const postsData = await postsResponse.json();
          const posts = postsData.posts || [];
          
          return {
            ...creator,
            postCount: posts.length,
            topTags: calculateTopTags(posts)
          };
        })
      );
      
      setCreators(usersWithData);
      setError(null);
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('Failed to load creators. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = creators.filter(creator => {
    const search = searchTerm.toLowerCase();
    
    const matchesBasic = 
      creator.username.toLowerCase().includes(search) ||
      creator.full_name.toLowerCase().includes(search) ||
      creator.role?.toLowerCase().includes(search);
    
    const matchesInstagram = creator.instagram_username?.toLowerCase().includes(search);
    
    const matchesTags = creator.topTags?.some(tag => 
      tag.toLowerCase().includes(search)
    );
    
    const matchesSearch = matchesBasic || matchesInstagram || matchesTags;
    
    // Apply role filter
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && creator.role?.toLowerCase() === activeFilter.toLowerCase();
  });

  const handleCreatorClick = (creatorId) => {
    navigate(`/profile/${creatorId}`);
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
        <div className="explore-container">
          {/* Hero Section */}
          <div className="explore-hero">
            <h1>Discover Creators</h1>
            <p>Connect with talented artists and photographers</p>
          </div>

          {/* Search Bar */}
          <div className="search-wrapper">
            <div className="search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'photographer' ? 'active' : ''}`}
              onClick={() => setActiveFilter('photographer')}
            >
              📸 Photographers
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'artist' ? 'active' : ''}`}
              onClick={() => setActiveFilter('artist')}
            >
              🎨 Artists
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'other' ? 'active' : ''}`}
              onClick={() => setActiveFilter('other')}
            >
              ✨ Other
            </button>
          </div>

          {/* Creators Feed */}
          <div className="creators-feed">
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={fetchCreators}>Retry</button>
              </div>
            )}

            {loading ? (
              <div className="loading-skeleton">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-info">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCreators.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No creators found</h3>
                <p>{searchTerm ? 'Try a different search term' : 'No creators available'}</p>
              </div>
            ) : (
              <div className="creators-list">
                {filteredCreators.map((creator) => (
                  <div 
                    key={creator.id} 
                    className="creator-card-social"
                    onClick={() => handleCreatorClick(creator.id)}
                  >
                    <div className="creator-card-left">
                      <div className="creator-avatar-social">
                        <span>{creator.username.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className="creator-card-center">
                      <h3 className="creator-name">{creator.full_name}</h3>
                      <p className="creator-handle">@{creator.username}</p>
                      
                      {creator.instagram_username && (
                        <a 
                          href={`https://instagram.com/${creator.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="creator-instagram-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          @{creator.instagram_username}
                        </a>
                      )}
                      
                      {creator.topTags && creator.topTags.length > 0 && (
                        <div className="creator-specialties">
                          {creator.topTags.map((tag, index) => (
                            <span key={index} className="specialty-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="creator-card-right">
                      <div className="creator-card-top-row">
                        <div className="creator-stats-social">
                          <span className="stat-number">{creator.postCount}</span>
                          <span className="stat-label">posts</span>
                        </div>
                        <span className="creator-role-badge">{creator.role || 'Creator'}</span>
                      </div>
                      <button className="view-profile-btn">
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Explore;