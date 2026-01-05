import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './UserContexts';
import Register from './components/Register';
import Login from './components/Login';
import Home from './components/Home';
import Profile from './components/Profile';
import AITools from './components/AITools';
import Portfolio from './components/Portfolio';
import PostContent from './components/PostContent';
import Explore from './components/Explore';
import UserProfile from './components/UserProfile';
import ImageAesthetic from './components/ImageAesthetic';
import CaptionGenerator from './components/Captiongenerator';
import './App.css';


function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/aitools" element={<AITools />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/portfolio/:id" element={<Portfolio />} />
          <Route path="/postcontent" element={<PostContent />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile/:userId" element={<UserProfile />} />
          <Route path="/imageaesthetic" element={<ImageAesthetic />} />
          <Route path="/captiongenerator" element={<CaptionGenerator />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
