import React, { createContext, useState, useRef, useContext, useEffect } from 'react';

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [callData, setCallData] = useState(null);
  const [isCallConnected, setIsCallConnected] = useState(false); // Nouveau state
  
  // Refs pour persister les streams et connexions entre les rendus
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callStartedRef = useRef(false);
  const hasSetupConnectionRef = useRef(false);

  // Nettoyer complètement au chargement de la page (en cas de rafraîchissement pendant un appel)
  useEffect(() => {
    console.log('🔄 CallContext initialisé - Nettoyage des ressources');
    cleanupResources();
  }, []);

  const cleanupResources = () => {
    // Nettoyer les streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track local arrêté:', track.kind);
      });
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track écran arrêté:', track.kind);
      });
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      console.log('🛑 PeerConnection fermée');
      peerConnectionRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }

    // Réinitialiser les refs
    callStartedRef.current = false;
    hasSetupConnectionRef.current = false;
    setIsCallConnected(false);

    console.log('✅ Ressources nettoyées');
  };

  const startCall = (data) => {
    console.log('📞 Démarrage d\'un nouvel appel');
    // S'assurer que tout est nettoyé avant de commencer un nouvel appel
    cleanupResources();
    setCallData(data);
    setIsInCall(true);
    setIsCallConnected(false); // Pas encore connecté
  };

  const markCallAsConnected = () => {
    console.log('✅ Appel marqué comme connecté (flux établi)');
    setIsCallConnected(true);
  };

  const endCall = () => {
    console.log('🔴 Fin d\'appel - Nettoyage');
    cleanupResources();

    // Réinitialiser les states
    setIsInCall(false);
    setCallData(null);
    setIsCallConnected(false);
  };

  return (
    <CallContext.Provider
      value={{
        isInCall,
        callData,
        isCallConnected,
        startCall,
        endCall,
        markCallAsConnected,
        localStreamRef,
        remoteStreamRef,
        peerConnectionRef,
        screenStreamRef,
        callStartedRef,
        hasSetupConnectionRef,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};