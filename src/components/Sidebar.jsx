import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../UserContexts';
import './Sidebar.css'; // Make sure you have your CSS file

function Sidebar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>CrAItor</h3>
        {user && <p>Welcome, @{user.username}!</p>}
      </div>
      
      <nav className="sidebar-nav">
        <Link to="/home" className="nav-link">
          Home
        </Link>
        <Link to="/explore" className="nav-link">
          Explore
        </Link>
        <Link to="/AITools" className="nav-link">
          AI Tools
        </Link>
        <Link to="/Portfolio" className="nav-link">
          Portfolio
        </Link>
        <Link to="/profile" className="nav-link">
          Profile
        </Link>
        {/* Add more navigation links as needed */}
      </nav>
      
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;