import React, { useEffect, useState, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import useTVNavigation from '../hooks/useTVNavigation';

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

const dotPulse = keyframes`
  0%, 80%, 100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
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

const ContactAvatar = styled.div`
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

const ContactName = styled.h1`
  color: #fff;
  font-size: 2.5rem;
  margin: 1rem 0;
`;

const CallStatus = styled.p`
  color: #aaa;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
`;

const Dot = styled.span`
  animation: ${dotPulse} 1.4s ease-in-out infinite;
  animation-delay: ${props => props.delay || '0s'};
  font-size: 1.5rem;
`;

const CancelButton = styled.button`
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
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.5);
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

const CallingScreen = ({ contactName, onCancel }) => {
  const containerRef = useRef(null);
  
  // Navigation TV
  useTVNavigation(containerRef, {
    enabled: true,
    onBack: onCancel, // Bouton retour = annuler
    initialFocusIndex: 0
  });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Container ref={containerRef}>
      <ContactAvatar>{getInitials(contactName)}</ContactAvatar>
      <ContactName>{contactName || 'Contact'}</ContactName>
      <CallStatus>
        Appel en cours
        <Dot delay="0s">.</Dot>
        <Dot delay="0.2s">.</Dot>
        <Dot delay="0.4s">.</Dot>
      </CallStatus>
      
      <ButtonWrapper>
        <CancelButton 
          onClick={onCancel}
          data-tv-navigable
        >
          ✕
        </CancelButton>
        <ButtonLabel>Annuler</ButtonLabel>
      </ButtonWrapper>
    </Container>
  );
};

export default CallingScreen;