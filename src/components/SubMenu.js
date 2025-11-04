import React from 'react';
import styled from 'styled-components';

const SidebarLink = styled.div`
  display: flex;
  color: #fff;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  list-style: none;
  height: 60px;
  text-decoration: none;
  font-size: 18px;

  &:hover {
    background: #252831;
    border-left: 4px solid #632ce4;
    cursor: pointer;
  }
`;

const SubMenu = ({ item, setCurrentPage, toggleSidebar }) => {
  const handleClick = () => {
    setCurrentPage(item.path);
    // Fermer la sidebar après avoir changé de page
    if (toggleSidebar) {
      toggleSidebar();
    }
  };

  return (
    <SidebarLink onClick={handleClick} data-tv-navigable>
      <div>
        {item.icon}
        <span style={{ marginLeft: '16px' }}>{item.title}</span>
      </div>
    </SidebarLink>
  );
};

export default SubMenu;