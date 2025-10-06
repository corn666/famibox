import React, { useEffect, useState, useContext, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { SocketContext } from '../context/SocketContext';

const pulse = keyframes`
  0%, 100% { 
    transform: scale(1); 
    opacity: 0.8; 
  }
  50% { 
    transform: scale(1.05); 
    opacity: 1; 
  }
`;

const ring = keyframes`
  0%, 100% { 
    transform: rotate(-15deg); 
  }
  50% { 
    transform: rotate(15deg); 
  }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #1a1d24 0%, #0a0c10 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 3000;
`;

const CallerAvatar = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: linear-gradient(135deg, #632ce4, #9d50bb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  color: #fff;
  font-weight: bold;
  margin-bottom: 2rem;
  animation: ${pulse} 2s ease-in-out infinite;
  box-shadow: 0 0 40px rgba(99, 44, 228, 0.5);
`;

const CallerName = styled.h1`
  color: #fff;
  font-size: 2.5rem;
  margin: 1rem 0;
`;

const CallerEmail = styled.p`
  color: #888;
  font-size: 1.2rem;
  margin: 0 0 1rem;
`;

const CallStatus = styled.p`
  color: #aaa;
  font-size: 1rem;
  margin-bottom: 3rem;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 3rem;
  margin-top: 2rem;
`;

const DeclineButton = styled.button`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: #fff;
  animation: ${ring} 0.5s ease-in-out infinite;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.5);
    animation: none;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const AcceptButton = styled.button`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(39, 174, 96, 0.5);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ButtonLabel = styled.span`
  color: #aaa;
  font-size: 0.9rem;
  margin-top: 0.75rem;
  text-align: center;
`;

const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const IncomingCall = ({ callerName, callerEmail, roomId, onAccept, onDecline }) => {
  const [dots, setDots] = useState('');
  const { socket } = useContext(SocketContext);
  const audioRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Jouer la sonnerie quand le composant s'affiche
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true; // Boucler la sonnerie
      audioRef.current.play().catch(err => {
        console.error('Erreur lecture sonnerie:', err);
      });
    }

    // Arrêter la sonnerie quand le composant se démonte
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : '?';
  };

  const handleDecline = () => {
    // Arrêter la sonnerie
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (socket) {
      socket.emit('call-declined', { 
        roomId,
        targetEmail: callerEmail
      });
    }
    onDecline();
  };

  const handleAccept = () => {
    // Arrêter la sonnerie
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    onAccept();
  };

  return (
    <Container>
      {/* Élément audio caché pour la sonnerie */}
      <audio ref={audioRef} src="/sounds/ringtone.mp3" />
      
      <CallerAvatar>{getInitials(callerName)}</CallerAvatar>
      <CallerName>{callerName || 'Contact'}</CallerName>
      <CallStatus>Appel entrant{dots}</CallStatus>
      
      <ButtonContainer>
        <ButtonWrapper>
          <DeclineButton onClick={handleDecline}>
            ✖
          </DeclineButton>
          <ButtonLabel>Refuser</ButtonLabel>
        </ButtonWrapper>
        
        <ButtonWrapper>
          <AcceptButton onClick={handleAccept}>
            ✓
          </AcceptButton>
          <ButtonLabel>Décrocher</ButtonLabel>
        </ButtonWrapper>
      </ButtonContainer>
    </Container>
  );
};

export default IncomingCall;