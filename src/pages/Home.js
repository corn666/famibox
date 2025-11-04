import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 90vh;
  text-align: center;
  padding: 2rem;
`;

const Greeting = styled.h1`
  color: #000000ff;
  font-size: 3.5rem;
  margin-bottom: 2rem;
  font-weight: 400;
`;

const DateText = styled.p`
  color: #000000ff;
  font-size: 2.5rem;
  margin: 1rem 0;
  font-weight: 300;
`;

const TimeText = styled.p`
  color: #000000ff;
  font-size: 4rem;
  margin: 1rem 0;
  font-weight: 500;
`;

const RappelText = styled.p`
  color: #000000ff;
  font-size: 1.8rem;
  margin: 1rem 0;
  font-weight: 500;
`;

export const Home = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Met à jour toutes les secondes

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = date.toLocaleDateString('fr-FR', options);
    // Capitaliser la première lettre
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}h${minutes}`;
  };

  return (
    <Container>
      <Greeting>Bonjour !</Greeting>
      <DateText>Nous sommes {formatDate(currentTime)}</DateText>
      <TimeText>Il est {formatTime(currentTime)}</TimeText>
      <RappelText>RAPPEL: prendre ses pilules a 17h00</RappelText>
    </Container>
  );
};

export default Home;