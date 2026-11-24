import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './UserContexts';
import Register from './components/Register';
import Login from './components/Login';
import Home from './components/Home';
import Classification from './components/Classification';
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
          <Route path="/classification" element={<Classification />} />
          <Route path="/imageaesthetic" element={<ImageAesthetic />} />
          <Route path="/captiongenerator" element={<CaptionGenerator />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
