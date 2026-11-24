import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ScanSearch,
  Sparkles,
  MessageSquareText,
  LogOut,
} from 'lucide-react';
import { useUser } from '../UserContexts';
import './Sidebar.css';

const SECTIONS = [
  {
    title: 'Tools',
    links: [
      { to: '/home', label: 'Overview', icon: BookOpen },
      { to: '/classification', label: 'Genre Classification', icon: ScanSearch },
      { to: '/imageaesthetic', label: 'Aesthetic Assessment', icon: Sparkles },
      { to: '/captiongenerator', label: 'Caption Generation', icon: MessageSquareText },
    ],
  },
];

function Sidebar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>CrAItor</h3>
        <p className="sidebar-subtitle">Photo analysis toolkit</p>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((section) => (
          <div key={section.title} className="nav-section">
            <p className="nav-section-title">{section.title}</p>
            {section.links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && <p className="sidebar-user">Signed in as @{user.username}</p>}
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={16} strokeWidth={1.8} />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
