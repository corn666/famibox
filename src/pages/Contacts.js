import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #fff;
  font-size: 2rem;
`;

const AddButton = styled.button`
  background: #632ce4;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;

  &:hover {
    background: #5020c0;
  }
`;

const ContactsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const ContactCard = styled.div`
  background: linear-gradient(145deg, #1a1d24, #15171c);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-5px);
    border-color: #632ce4;
    box-shadow: 0 8px 20px rgba(99, 44, 228, 0.3);
  }
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #632ce4, #9d50bb);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 2rem;
  color: #fff;
  font-weight: bold;
`;

const ContactName = styled.h3`
  color: #fff;
  margin: 0.5rem 0;
  font-size: 1.2rem;
`;

const ContactEmail = styled.p`
  color: #888;
  margin: 0;
  font-size: 0.9rem;
  word-break: break-word;
`;

const DeleteButton = styled.button`
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 0.75rem;
  font-size: 0.9rem;
  transition: background 0.3s ease;

  &:hover {
    background: #c0392b;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: #1a1d24;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  border: 2px solid #632ce4;
`;

const ModalTitle = styled.h2`
  color: #fff;
  margin-bottom: 1.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin: 0.5rem 0;
  border: 1px solid #333;
  border-radius: 5px;
  background: #15171c;
  color: #fff;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: #632ce4;
  }

  &::placeholder {
    color: #666;
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ModalButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;

  ${props => props.primary ? `
    background: #632ce4;
    color: #fff;
    &:hover {
      background: #5020c0;
    }
  ` : `
    background: transparent;
    color: #fff;
    border: 1px solid #333;
    &:hover {
      border-color: #666;
    }
  `}
`;

const Error = styled.p`
  color: #e74c3c;
  font-size: 0.9rem;
  margin: 0.5rem 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
`;

const Contacts = ({ sidebar, setCurrentPage, setCallData }) => {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newContact, setNewContact] = useState({ email: '', prenom: '' });
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://famibox.cazapp.fr:3000/api/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(res.data);
    } catch (err) {
      console.error('Erreur chargement contacts:', err);
    }
  };

  const handleAddContact = async () => {
    setError('');
    
    if (!newContact.email || !newContact.prenom) {
      setError('Email et prénom requis');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContact.email)) {
      setError('Format email invalide');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('https://famibox.cazapp.fr:3000/api/contacts', 
        newContact, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowModal(false);
      setNewContact({ email: '', prenom: '' });
      loadContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout');
    }
  };

  const handleDeleteContact = async (contactId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Supprimer ce contact ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://famibox.cazapp.fr:3000/api/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadContacts();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const handleCallContact = (contact) => {
    // Générer un roomId unique basé sur les IDs des utilisateurs
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Passer les données d'appel au parent
    setCallData({
      roomId,
      contactEmail: contact.email,
      contactName: contact.prenom,
      isCaller: true
    });
    
    // Naviguer vers la page d'appel
    setCurrentPage('appels');
  };

  const getInitials = (prenom) => {
    return prenom.substring(0, 2).toUpperCase();
  };

  return (
    <Container>
      <Header>
        <Title>Mes Contacts</Title>
        <AddButton onClick={() => setShowModal(true)}>
          + Ajouter un contact
        </AddButton>
      </Header>

      {contacts.length === 0 ? (
        <EmptyState>
          <h2>Aucun contact pour le moment</h2>
          <p>Ajoutez votre premier contact pour commencer à passer des appels !</p>
        </EmptyState>
      ) : (
        <ContactsGrid>
          {contacts.map((contact) => (
            <ContactCard key={contact.id} onClick={() => handleCallContact(contact)}>
              <Avatar>{getInitials(contact.prenom)}</Avatar>
              <ContactName>{contact.prenom}</ContactName>
              <DeleteButton onClick={(e) => handleDeleteContact(contact.id, e)}>
                Supprimer
              </DeleteButton>
            </ContactCard>
          ))}
        </ContactsGrid>
      )}

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Ajouter un contact</ModalTitle>
            {error && <Error>{error}</Error>}
            <Input
              type="text"
              placeholder="Prénom"
              value={newContact.prenom}
              onChange={(e) => setNewContact({ ...newContact, prenom: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Email"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            />
            <ModalButtons>
              <ModalButton onClick={() => setShowModal(false)}>
                Annuler
              </ModalButton>
              <ModalButton primary onClick={handleAddContact}>
                Ajouter
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default Contacts;