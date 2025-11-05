import React, { useRef } from "react";
import styled from 'styled-components';
import useTVNavigation from '../hooks/useTVNavigation';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh;
  font-size: 3rem;
  position: relative;
`;

const MenuButton = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #632ce4, #9d50bb);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: ${props => props.show ? 'flex' : 'none'};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  z-index: 999;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 44, 228, 0.4);

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(99, 44, 228, 0.6);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const MenuLine = styled.div`
  width: 25px;
  height: 3px;
  background: #fff;
  border-radius: 2px;
  transition: all 0.3s ease;
`;

export const Sante = ({ sidebar, toggleSidebar }) => {
    const containerRef = useRef(null);
    
    useTVNavigation(containerRef, {
        enabled: !sidebar,
        onBack: () => {},
        initialFocusIndex: 0
    });

    return (
        <Container ref={containerRef} className="sante">
            <MenuButton 
                show={!sidebar} 
                onClick={toggleSidebar}
                data-tv-navigable
            >
                <MenuLine />
                <MenuLine />
                <MenuLine />
            </MenuButton>
            <h1>Santé</h1>
        </Container>
    );
}

export const Bilan = ({ sidebar, toggleSidebar }) => {
    const containerRef = useRef(null);
    
    useTVNavigation(containerRef, {
        enabled: !sidebar,
        onBack: () => {},
        initialFocusIndex: 0
    });

    return (
        <Container ref={containerRef} className="sante">
            <MenuButton 
                show={!sidebar} 
                onClick={toggleSidebar}
                data-tv-navigable
            >
                <MenuLine />
                <MenuLine />
                <MenuLine />
            </MenuButton>
            <h1>Bilan</h1>
        </Container>
    );
}

export const Contact = ({ sidebar, toggleSidebar }) => {
    const containerRef = useRef(null);
    
    useTVNavigation(containerRef, {
        enabled: !sidebar,
        onBack: () => {},
        initialFocusIndex: 0
    });

    return (
        <Container ref={containerRef} className="sante">
            <MenuButton 
                show={!sidebar} 
                onClick={toggleSidebar}
                data-tv-navigable
            >
                <MenuLine />
                <MenuLine />
                <MenuLine />
            </MenuButton>
            <h1>Contact</h1>
        </Container>
    );
}