import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  max-width: 300px;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border: 1px solid #000000ff;
  border-radius: 5px;
  background: transparent;
  color: #000000ff;
  font-size: 1rem;
  outline: none;

  &::placeholder {
    color: #6b6a6aff;
  }
`;

const Button = styled.button`
  color: #000000ff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid #000000ff;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-top: 1rem;

  &:hover {
    background: #888888ff;
  }
`;

const Error = styled.p`
  color: red;
  font-size: 0.9rem;
  margin: 0.5rem 0;
`;

const Login = ({ openSidebar, setCurrentPage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://famibox.cazapp.fr:3000/login', { email, password });
      login(res.data.token);
      openSidebar();
      setCurrentPage('home');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    }
  };

  return (
    <Container>
      <h2 style={{ color: '#fff' }}>Connexion</h2>
      {error && <Error>{error}</Error>}
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit">Se connecter</Button>
      </form>
    </Container>
  );
  // Commentaire : Formulaire de connexion avec navigation via setCurrentPage.
};

export default Login;