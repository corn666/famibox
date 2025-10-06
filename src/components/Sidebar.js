import React, { useContext } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import { SidebarData } from './SidebarData';
import SubMenu from './SubMenu';
import { IconContext } from 'react-icons/lib';
import { AuthContext } from '../context/AuthContext';

const Nav = styled.div`
  background: #15171c;
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  padding: 0 2rem;
`;

const NavIcon = styled.div`
  font-size: 2rem;
  height: 80px;
  display: flex;
  align-items: center;
  color: #fff;
  cursor: pointer;
`;

const NavAuth = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const AuthButton = styled.div`
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid #fff;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const LogoutButton = styled.button`
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid #fff;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const UserIcon = styled.span`
  font-size: 1.5rem;
  color: #fff;
  display: flex;
  align-items: center;
`;

const Username = styled.span`
  color: #fff;
  font-size: 1rem;
  margin-left: 0.5rem;
  font-weight: 500;
`;

const SidebarNav = styled.nav`
  background: #15171c;
  width: 150px;
  height: calc(100vh - 80px);
  display: flex;
  justify-content: center;
  position: fixed;
  top: 80px;
  left: ${({ sidebar }) => (sidebar ? '0' : '-100%')};
  transition: 350ms;
  z-index: 900;
`;

const SidebarWrap = styled.div`
  width: 100%;
`;

const Sidebar = ({ sidebar, toggleSidebar, setCurrentPage }) => {
  const { user, logout } = useContext(AuthContext);

  // Extraire le nom d'utilisateur (partie avant le @)
  const getUserName = () => {
    if (!user || !user.email) return '';
    return user.email.split('@')[0];
  };

  return (
    <IconContext.Provider value={{ color: '#fff' }}>
      <Nav>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <NavIcon onClick={toggleSidebar}>
            <FaIcons.FaBars />
          </NavIcon>
        </div>
        <NavAuth>
          {user ? (
            <>
              <UserIcon>
                <FaIcons.FaUser />
                <Username>{getUserName()}</Username>
              </UserIcon>
              <LogoutButton onClick={() => {
                logout();
                setCurrentPage('login');
              }}>
                Déconnexion
              </LogoutButton>
            </>
          ) : (
            <>
              <AuthButton onClick={() => setCurrentPage('login')}>Connexion</AuthButton>
              <AuthButton onClick={() => setCurrentPage('register')}>Inscription</AuthButton>
            </>
          )}
        </NavAuth>
      </Nav>
      <SidebarNav sidebar={sidebar}>
        <SidebarWrap>
          {SidebarData.map((item, index) => (
            <SubMenu item={item} key={index} setCurrentPage={setCurrentPage} />
          ))}
        </SidebarWrap>
      </SidebarNav>
    </IconContext.Provider>
  );
};

export default Sidebar;