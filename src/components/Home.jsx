import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

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
        <div className="home-container">
          <div className="welcome-card">
            <h1>Welcome to CrAItor</h1>
            <p className="tagline">World of Creative Creator</p>
          </div>
        </div>
      </div>
    </div>
  );
}   

export default Home;