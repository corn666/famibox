import './App.css';
import Sidebar from './components/Sidebar';
import { Photos } from './pages/Famille';
import { Sante } from './pages/Sante';
import VideoCall from './pages/VideoCall';
import Contacts from './pages/Contacts';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import IncomingCall from './pages/IncomingCall';
import { useState, useContext } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SocketProvider, SocketContext } from './context/SocketContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const [sidebar, setSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [callData, setCallData] = useState(null);
  const { user } = useContext(AuthContext);
  const { incomingCall, clearIncomingCall } = useContext(SocketContext);

  const toggleSidebar = () => setSidebar(!sidebar);
  const openSidebar = () => setSidebar(true);

  const handleAcceptCall = () => {
    // Passer les données de l'appel entrant à VideoCall
    setCallData({
      roomId: incomingCall.roomId,
      contactEmail: incomingCall.callerEmail,
      contactName: incomingCall.callerName,
      isCaller: false, // C'est nous qui recevons l'appel
      isIncoming: true
    });
    clearIncomingCall();
    setCurrentPage('appels');
  };

  const handleDeclineCall = () => {
    clearIncomingCall();
  };

  const renderPage = () => {
    // Afficher l'écran d'appel entrant en priorité
    if (incomingCall) {
      return (
        <IncomingCall
          callerName={incomingCall.callerName}
          callerEmail={incomingCall.callerEmail}
          roomId={incomingCall.roomId}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      );
    }

    if (!user && currentPage !== 'login' && currentPage !== 'register') {
      return <Login openSidebar={openSidebar} setCurrentPage={setCurrentPage} />;
    }
    
    switch (currentPage) {
      case 'home':
        return <Home sidebar={sidebar} />;
      case 'appels':
        return <VideoCall sidebar={sidebar} callData={callData} setCurrentPage={setCurrentPage} />;
      case 'contacts':
        return <Contacts sidebar={sidebar} setCurrentPage={setCurrentPage} setCallData={setCallData} />;
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
};

export default App;