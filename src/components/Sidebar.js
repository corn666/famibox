import React, { useContext, useRef } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { SidebarData } from './SidebarData';
import SubMenu from './SubMenu';
import { IconContext } from 'react-icons/lib';
import { AuthContext } from '../context/AuthContext';
import useTVNavigation from '../hooks/useTVNavigation';

const SidebarNav = styled.nav`
  background: #15171c;
  width: 150px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: ${({ sidebar }) => (sidebar ? '0' : '-100%')};
  transition: 350ms;
  z-index: 1000;
`;

const SidebarWrap = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const MenuItems = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const UserSection = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
  padding: 0.5rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
`;

const UserIcon = styled.div`
  font-size: 1.5rem;
  color: #632ce4;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  overflow: hidden;
`;

const UserName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.span`
  font-size: 0.7rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AuthButton = styled.div`
  color: #fff;
  text-decoration: none;
  padding: 0.75rem;
  border: 1px solid #632ce4;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  font-size: 0.9rem;

  &:hover {
    background: rgba(99, 44, 228, 0.2);
    border-color: #9d50bb;
  }
`;

const LogoutButton = styled.button`
  color: #fff;
  text-decoration: none;
  padding: 0.75rem;
  border: 1px solid #e74c3c;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  font-size: 0.9rem;
  width: 100%;

  &:hover {
    background: rgba(231, 76, 60, 0.2);
    border-color: #c0392b;
  }
`;

const Sidebar = ({ sidebar, toggleSidebar, setCurrentPage }) => {
  const { user, logout } = useContext(AuthContext);
  const sidebarRef = useRef(null);

  // Navigation TV pour la sidebar
  useTVNavigation(sidebarRef, {
    enabled: sidebar,
    onBack: toggleSidebar,
    initialFocusIndex: 0
  });

  const getUserName = () => {
    if (!user || !user.email) return '';
    return user.email.split('@')[0];
  };

  const handleLogout = () => {
    logout();
    toggleSidebar(); // Fermer la sidebar après déconnexion
    setCurrentPage('login');
  };

  return (
    <IconContext.Provider value={{ color: '#fff' }}>
      <SidebarNav sidebar={sidebar} ref={sidebarRef}>
        <SidebarWrap>
          {/* Items du menu */}
          <MenuItems>
            {SidebarData.map((item, index) => (
              <SubMenu 
                item={item} 
                key={index} 
                setCurrentPage={setCurrentPage}
                toggleSidebar={toggleSidebar}
              />
            ))}
          </MenuItems>
          
          {/* Section utilisateur en bas */}
          <UserSection>
            {user ? (
              <>
                <UserInfo>
                  <UserIcon>
                    <FaIcons.FaUser />
                  </UserIcon>
                  <UserDetails>
                    <UserName>{getUserName()}</UserName>
                    <UserEmail>{user.email}</UserEmail>
                  </UserDetails>
                </UserInfo>
                
                <LogoutButton 
                  onClick={handleLogout}
                  data-tv-navigable
                >
                  Déconnexion
                </LogoutButton>
              </>
            ) : (
              <>
                <AuthButton 
                  onClick={() => {
                    setCurrentPage('login');
                    toggleSidebar();
                  }}
                  data-tv-navigable
                >
                  Connexion
                </AuthButton>
                <AuthButton 
                  onClick={() => {
                    setCurrentPage('register');
                    toggleSidebar();
                  }}
                  data-tv-navigable
                >
                  Inscription
                </AuthButton>
              </>
            )}
          </UserSection>
        </SidebarWrap>
      </SidebarNav>
    </IconContext.Provider>
  );
};

export default Sidebar;