import './App.css';
import './tvNavigation.css';
import Sidebar from './components/Sidebar';
import { Photos } from './pages/Photos';
import { Sante } from './pages/Sante';
import VideoCall from './pages/VideoCall';
import Contacts from './pages/Contacts';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import IncomingCall from './pages/IncomingCall';
import { useState, useContext, useEffect } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SocketProvider, SocketContext } from './context/SocketContext';
import { CallProvider, useCall } from './context/CallContext';
import styled from 'styled-components';

// Fonction helper pour gérer les appels manqués
const useMissedCallsHandler = () => {
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (socket) {
      const handleMissedCall = (data) => {
        console.log('📵 Appel manqué reçu dans App.js:', data);
        
        const savedMissedCalls = localStorage.getItem('missedCalls');
        const missedCalls = savedMissedCalls ? JSON.parse(savedMissedCalls) : {};
        
        missedCalls[data.callerEmail] = {
          timestamp: data.timestamp,
          callerName: data.callerName
        };
        
        localStorage.setItem('missedCalls', JSON.stringify(missedCalls));
        console.log('✅ Appel manqué sauvegardé dans localStorage');
        
        window.dispatchEvent(new CustomEvent('missedCallUpdated'));
      };

      socket.on('missed-call', handleMissedCall);
      console.log('👂 Écoute des appels manqués activée dans App.js');

      return () => {
        socket.off('missed-call', handleMissedCall);
      };
    }
  }, [socket]);
};

const NotificationBanner = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #632ce4, #9d50bb);
  color: #fff;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(99, 44, 228, 0.5);
  z-index: 2500;
  animation: slideIn 0.3s ease;
  cursor: pointer;
  max-width: 350px;

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const NotificationTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
`;

const NotificationMessage = styled.p`
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
`;

const HelpText = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '💡';
  }
`;

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const [sidebar, setSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [showHelp, setShowHelp] = useState(true);
  const { user } = useContext(AuthContext);
  const { isInCall, callData, startCall, endCall } = useCall();
  const { 
    socket,
    incomingCall, 
    clearIncomingCall,
    newMediaNotification,
    clearMediaNotification,
    mediaViewedNotification,
    clearViewedNotification
  } = useContext(SocketContext);

  const toggleSidebar = () => setSidebar(!sidebar);
  const openSidebar = () => setSidebar(true);

  useMissedCallsHandler();

  // Raccourci clavier global pour toggle la sidebar
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      if (e.key === 'm' || e.key === 'M' || e.key === 'ContextMenu') {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
        console.log('🎮 Toggle sidebar via raccourci clavier');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyPress);
    };
  }, [sidebar]);

  // Masquer l'aide après 10 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelp(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleCallCancelled = (data) => {
        console.log('❌ Appel annulé par l\'appelant');
        clearIncomingCall();
      };
      
      socket.on('call-cancelled', handleCallCancelled);
      
      return () => {
        socket.off('call-cancelled', handleCallCancelled);
      };
    }
  }, [socket, clearIncomingCall]);

  useEffect(() => {
    if (user && currentPage === 'login') {
      setCurrentPage('home');
      openSidebar();
    }
  }, [user]);

  useEffect(() => {
    if (newMediaNotification) {
      const timer = setTimeout(() => {
        clearMediaNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newMediaNotification, clearMediaNotification]);

  useEffect(() => {
    if (mediaViewedNotification) {
      const timer = setTimeout(() => {
        clearViewedNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mediaViewedNotification, clearViewedNotification]);

  const handleAcceptCall = () => {
    startCall({
      roomId: incomingCall.roomId,
      contactEmail: incomingCall.callerEmail,
      contactName: incomingCall.callerName,
      isCaller: false,
      isIncoming: true
    });
    clearIncomingCall();
    setCurrentPage('appels');
  };

  const handleDeclineCall = () => {
    clearIncomingCall();
  };

  const handleMediaNotificationClick = () => {
    setCurrentPage('photos');
    clearMediaNotification();
  };

  const handleEndCall = () => {
    endCall();
    setCurrentPage('contacts');
  };

  const renderPage = () => {
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
        return (
          <VideoCall 
            sidebar={sidebar}
            setCurrentPage={setCurrentPage}
            onEndCall={handleEndCall}
            isPiP={false}
          />
        );
      case 'contacts':
        return (
          <Contacts 
            sidebar={sidebar} 
            setCurrentPage={setCurrentPage} 
            setCallData={startCall}
            isInCall={isInCall}
          />
        );
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
      
      {newMediaNotification && (
        <NotificationBanner onClick={handleMediaNotificationClick}>
          <NotificationTitle>📸 Nouveaux médias reçus !</NotificationTitle>
          <NotificationMessage>
            {newMediaNotification.senderEmail} vous a envoyé {newMediaNotification.count} fichier(s)
          </NotificationMessage>
        </NotificationBanner>
      )}

      {mediaViewedNotification && (
        <NotificationBanner onClick={clearViewedNotification}>
          <NotificationTitle>👁️ Média consulté</NotificationTitle>
          <NotificationMessage>
            {mediaViewedNotification.recipientEmail} a consulté "{mediaViewedNotification.originalName}"
          </NotificationMessage>
        </NotificationBanner>
      )}

      {isInCall && currentPage !== 'appels' && (
        <VideoCall 
          sidebar={sidebar}
          setCurrentPage={setCurrentPage}
          onEndCall={handleEndCall}
          isPiP={true}
        />
      )}

      {/* Aide contextuelle */}
      {showHelp && user && !sidebar && (
        <HelpText onClick={() => setShowHelp(false)}>
          Appuyez sur <strong>M</strong> pour ouvrir le menu
        </HelpText>
      )}

      {/* Contenu principal - PLUS de marginTop car plus de navbar */}
      <div
        style={{
          marginLeft: sidebar ? '150px' : '0',
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