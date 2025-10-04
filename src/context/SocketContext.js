import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Connecter le socket dès qu'un utilisateur est authentifié
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
        console.log('📴 Appel terminé par l\'autre partie');
      });
    }

    // Déconnecter le socket si l'utilisateur se déconnecte
    if (!user && socketRef.current) {
      console.log('👋 Déconnexion du socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIncomingCall(null);
    }

    return () => {
      // Nettoyage lors du démontage du composant
      if (socketRef.current && !user) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider 
      value={{ 
        socket: socketRef.current, 
        isConnected,
        incomingCall,
        clearIncomingCall
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;