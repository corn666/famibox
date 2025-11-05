import React, { useState, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import styled from 'styled-components';
import useTVNavigation from '../hooks/useTVNavigation';

const Container = styled.div`
  padding: 2rem;
  max-width: 450px;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  justify-content: center;
`;

const Card = styled.div`
  background: linear-gradient(145deg, #1a1d24, #15171c);
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(99, 44, 228, 0.2);
`;

const Title = styled.h1`
  color: #fff;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem;
  border-radius: 8px;
`;

const Tab = styled.button`
  flex: 1;
  background: ${props => props.active ? '#632ce4' : 'transparent'};
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.active ? '#5020c0' : 'rgba(99, 44, 228, 0.2)'};
  }
`;

const Form = styled.form`
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem;
  margin: 0.75rem 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: #666;
  }

  &:focus {
    border-color: #632ce4;
    background: rgba(99, 44, 228, 0.1);
  }
`;

const Button = styled.button`
  width: 100%;
  color: #fff;
  text-decoration: none;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #632ce4, #9d50bb);
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(99, 44, 228, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 44, 228, 0.5);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const Error = styled.div`
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const Success = styled.div`
  background: rgba(39, 174, 96, 0.1);
  border: 1px solid rgba(39, 174, 96, 0.3);
  color: #27ae60;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const PasswordHint = styled.p`
  color: #888;
  font-size: 0.8rem;
  margin: 0.25rem 0 0.75rem 0;
  font-style: italic;
`;

const Login = ({ openSidebar, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' ou 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const containerRef = useRef(null);

  // Navigation TV
  useTVNavigation(containerRef, {
    enabled: true,
    initialFocusIndex: 2 // Commence sur le premier input
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('https://famibox.cazapp.fr:3000/login', { email, password });
      login(res.data.token);
      openSidebar();
      setCurrentPage('home');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    try {
      await axios.post('https://famibox.cazapp.fr:3000/register', { email, password });
      setSuccess('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      setEmail('');
      setPassword('');
      
      // Basculer vers l'onglet connexion après 2 secondes
      setTimeout(() => {
        setActiveTab('login');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
  };

  return (
    <Container ref={containerRef}>
      <Card>
        <Title>Bienvenue sur Famibox</Title>
        
        <TabContainer>
          <Tab 
            active={activeTab === 'login'} 
            onClick={() => handleTabChange('login')}
            type="button"
            data-tv-navigable
          >
            Connexion
          </Tab>
          <Tab 
            active={activeTab === 'register'} 
            onClick={() => handleTabChange('register')}
            type="button"
            data-tv-navigable
          >
            Inscription
          </Tab>
        </TabContainer>

        {error && <Error>{error}</Error>}
        {success && <Success>{success}</Success>}

        {activeTab === 'login' ? (
          <Form onSubmit={handleLogin}>
            <Input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              data-tv-navigable
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              data-tv-navigable
            />
            <Button 
              type="submit" 
              disabled={loading}
              data-tv-navigable
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handleRegister}>
            <Input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              data-tv-navigable
            />
            <Input
              type="password"
              placeholder="Mot de passe (min. 8 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              data-tv-navigable
            />
            <PasswordHint>
              Le mot de passe doit contenir au moins 8 caractères
            </PasswordHint>
            <Button 
              type="submit" 
              disabled={loading}
              data-tv-navigable
            >
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </Button>
          </Form>
        )}
      </Card>
    </Container>
  );
};

export default Login;