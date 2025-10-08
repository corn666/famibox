import './App.css';
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
        
        // Récupérer les appels manqués existants
        const savedMissedCalls = localStorage.getItem('missedCalls');
        const missedCalls = savedMissedCalls ? JSON.parse(savedMissedCalls) : {};
        
        // Ajouter le nouvel appel manqué
        missedCalls[data.callerEmail] = {
          timestamp: data.timestamp,
          callerName: data.callerName
        };
        
        // Sauvegarder
        localStorage.setItem('missedCalls', JSON.stringify(missedCalls));
        console.log('✅ Appel manqué sauvegardé dans localStorage');
        
        // Émettre un événement personnalisé pour que Contacts.js se mette à jour
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
  top: 100px;
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

  // Activer la gestion des appels manqués
  useMissedCallsHandler();

  // Écouter l'annulation d'appel
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

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    if (user && currentPage === 'login') {
      setCurrentPage('home');
      openSidebar();
    }
  }, [user]);

  // Auto-masquer les notifications après 5 secondes
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
      
      {/* Notifications pour nouveaux médias */}
      {newMediaNotification && (
        <NotificationBanner onClick={handleMediaNotificationClick}>
          <NotificationTitle>📸 Nouveaux médias reçus !</NotificationTitle>
          <NotificationMessage>
            {newMediaNotification.senderEmail} vous a envoyé {newMediaNotification.count} fichier(s)
          </NotificationMessage>
        </NotificationBanner>
      )}

      {/* Notification de consultation */}
      {mediaViewedNotification && (
        <NotificationBanner onClick={clearViewedNotification}>
          <NotificationTitle>👁️ Média consulté</NotificationTitle>
          <NotificationMessage>
            {mediaViewedNotification.recipientEmail} a consulté "{mediaViewedNotification.originalName}"
          </NotificationMessage>
        </NotificationBanner>
      )}

      {/* Appel en Picture-in-Picture si on est en appel mais pas sur la page appels */}
      {isInCall && currentPage !== 'appels' && (
        <VideoCall 
          sidebar={sidebar}
          setCurrentPage={setCurrentPage}
          onEndCall={handleEndCall}
          isPiP={true}
        />
      )}

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