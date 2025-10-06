import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [newMediaNotification, setNewMediaNotification] = useState(null);
  const [mediaViewedNotification, setMediaViewedNotification] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && !socketRef.current) {
      const token = localStorage.getItem('token');
      
      console.log('🔌 Connexion au serveur socket...');
      socketRef.current = io('https://famibox.cazapp.fr:3000', {
        auth: { token }
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connecté:', socketRef.current.id);
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('❌ Socket déconnecté');
        setIsConnected(false);
      });

      socketRef.current.on('incoming-call', (data) => {
        console.log('📞 Appel entrant reçu:', data);
        setIncomingCall(data);
      });

      socketRef.current.on('call-declined', () => {
        console.log('❌ Appel refusé');
        alert('Appel refusé par le destinataire');
      });

      socketRef.current.on('user-unavailable', (data) => {
        console.log('⚠️ Utilisateur non disponible:', data.targetEmail);
        alert(`${data.targetEmail} n'est pas connecté actuellement`);
      });

      socketRef.current.on('call-ended', () => {
        console.log('🔴 Appel terminé par l\'autre partie');
      });

      // Nouvelles notifications pour les médias
      socketRef.current.on('new-media-notification', (data) => {
        console.log('📸 Nouveaux médias reçus:', data);
        setNewMediaNotification(data);
        
        // Afficher une notification visuelle
        if (Notification.permission === 'granted') {
          new Notification('Nouveaux médias reçus !', {
            body: `${data.senderEmail} vous a envoyé ${data.count} fichier(s)`,
            icon: '/logo192.png'
          });
        }
      });

      socketRef.current.on('media-viewed-notification', (data) => {
        console.log('👁️ Média consulté:', data);
        setMediaViewedNotification(data);
        
        // Afficher une notification
        if (Notification.permission === 'granted') {
          new Notification('Média consulté', {
            body: `${data.recipientEmail} a consulté votre fichier "${data.originalName}"`,
            icon: '/logo192.png'
          });
        }
      });
    }

    if (!user && socketRef.current) {
      console.log('👋 Déconnexion du socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIncomingCall(null);
      setNewMediaNotification(null);
      setMediaViewedNotification(null);
    }

    return () => {
      if (socketRef.current && !user) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // Demander la permission pour les notifications
  useEffect(() => {
    if (user && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  const clearMediaNotification = () => {
    setNewMediaNotification(null);
  };

  const clearViewedNotification = () => {
    setMediaViewedNotification(null);
  };

  return (
    <SocketContext.Provider 
      value={{ 
        socket: socketRef.current, 
        isConnected,
        incomingCall,
        clearIncomingCall,
        newMediaNotification,
        clearMediaNotification,
        mediaViewedNotification,
        clearViewedNotification
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;