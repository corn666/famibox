import './App.css';
import Sidebar from './components/Sidebar';
import { Photos } from './pages/Famille';
import { Sante } from './pages/Sante';
import VideoCall from './pages/VideoCall';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { useState, useContext } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const [sidebar, setSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState('login'); // Page par défaut : login
  const { user } = useContext(AuthContext);

  const toggleSidebar = () => setSidebar(!sidebar);
  const openSidebar = () => setSidebar(true);

  // Rendu conditionnel basé sur l'état currentPage
  const renderPage = () => {
    if (!user && currentPage !== 'login' && currentPage !== 'register') {
      return <Login openSidebar={openSidebar} setCurrentPage={setCurrentPage} />;
    }
    switch (currentPage) {
      case 'home':
        return <Home sidebar={sidebar} />;
      case 'appels':
        return <VideoCall sidebar={sidebar} />;
      case 'photos':
        return <Photos sidebar={sidebar} />;
      case 'sante':
        return <Sante sidebar={sidebar} />;
      case 'login':
        return <Login openSidebar={openSidebar} setCurrentPage={setCurrentPage} />;
      case 'register':
        return <Register setCurrentPage={setCurrentPage} />;
      default:
        return user ? <Home sidebar={sidebar} /> : <Login openSidebar={openSidebar} setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar sidebar={sidebar} toggleSidebar={toggleSidebar} setCurrentPage={setCurrentPage} />
      <div
        style={{
          marginLeft: sidebar ? '150px' : '0',
          marginTop: '80px',
          flexGrow: 1,
          transition: 'margin-left 350ms',
        }}
      >
        {renderPage()}
      </div>
    </div>
  );
  // Commentaire : Gère la navigation via un état local (currentPage) sans changer l'URL.
};

export default App;