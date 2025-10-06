import React, { createContext, useState, useRef, useContext } from 'react';

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [callData, setCallData] = useState(null);
  
  // Refs pour persister les streams et connexions entre les rendus
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callStartedRef = useRef(false);
  const hasSetupConnectionRef = useRef(false);

  const startCall = (data) => {
    setCallData(data);
    setIsInCall(true);
  };

  const endCall = () => {
    // Nettoyer les streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Réinitialiser les refs
    callStartedRef.current = false;
    hasSetupConnectionRef.current = false;

    // Réinitialiser les states
    setIsInCall(false);
    setCallData(null);
  };

  return (
    <CallContext.Provider
      value={{
        isInCall,
        callData,
        startCall,
        endCall,
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