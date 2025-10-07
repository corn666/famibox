import React, { useEffect, useState, useCallback, useContext } from 'react';
import styled from 'styled-components';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { useCall } from '../context/CallContext';

const PiPContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  height: 240px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  z-index: 2000;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  border: 2px solid #632ce4;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 12px 40px rgba(99, 44, 228, 0.6);
  }
`;

const PiPVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PiPLocalVideo = styled.video`
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #fff;
`;

const PiPLabel = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '📞';
  }
`;

const PiPEndButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e74c3c;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
  z-index: 10;

  &:hover {
    background: #c0392b;
    transform: scale(1.1);
  }
`;

const VideoCall = ({ sidebar, setCurrentPage, onEndCall, isPiP = false }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const {
    callData,
    localStreamRef,
    remoteStreamRef,
    peerConnectionRef,
    screenStreamRef,
    callStartedRef,
    hasSetupConnectionRef,
    endCall: contextEndCall,
  } = useCall();

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [streamUpdate, setStreamUpdate] = useState(0); // Pour forcer le re-render

  const roomId = callData?.roomId;
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const endCall = useCallback(() => {
    console.log('Ending call...');
    
    if (socket) {
      socket.emit('call-ended', { roomId });
    }
    
    contextEndCall();
    
    if (onEndCall) {
      onEndCall();
    }
  }, [socket, roomId, contextEndCall, onEndCall]);

  // Attacher les streams aux éléments vidéo quand ils sont prêts
  useEffect(() => {
    const videoElements = document.querySelectorAll('video');
    
    videoElements.forEach(video => {
      // Vidéo locale (muted)
      if (video.muted && localStreamRef.current && !video.srcObject) {
        video.srcObject = localStreamRef.current;
        console.log('✅ Local video attached');
      }
      // Vidéo distante (non muted)
      else if (!video.muted && remoteStreamRef.current && !video.srcObject) {
        video.srcObject = remoteStreamRef.current;
        console.log('✅ Remote video attached');
      }
    });
  }, [streamUpdate, isPiP]); // Se déclenche à chaque mise à jour de stream ou changement de mode

  // Écouter l'événement call-ended
  useEffect(() => {
    if (socket) {
      const handleCallEnded = () => {
        console.log('🔴 Appel terminé par l\'autre partie');
        setCallEnded(true);
        
        contextEndCall();
        
        setTimeout(() => {
          setCallEnded(false); // Reset pour permettre un nouvel appel
          if (setCurrentPage) {
            setCurrentPage('contacts');
          }
        }, 4000);
      };

      const handleUserUnavailable = (data) => {
        console.log('❌ Utilisateur non disponible:', data.targetEmail);
        alert(`${data.targetEmail} n'est pas disponible actuellement`);
        contextEndCall();
        if (setCurrentPage) {
          setCurrentPage('contacts');
        }
      };
      
      socket.on('call-ended', handleCallEnded);
      socket.on('user-unavailable', handleUserUnavailable);
      
      return () => {
        socket.off('call-ended', handleCallEnded);
        socket.off('user-unavailable', handleUserUnavailable);
      };
    }
  }, [socket, contextEndCall, setCurrentPage]);

  // Initialiser l'appel une seule fois
  useEffect(() => {
    if (callData && !callStartedRef.current && socket && !hasSetupConnectionRef.current) {
      hasSetupConnectionRef.current = true;
      
      if (callData.isCaller) {
        initiateCall();
      } else if (callData.isIncoming) {
        acceptCall();
      }
    }
  }, [callData, socket]);

  const initiateCall = async () => {
    if (callStartedRef.current || !roomId || !socket) {
      return;
    }

    try {
      callStartedRef.current = true;
      console.log('📞 Initiation de l\'appel vers:', callData.contactEmail);

      socket.emit('call-user', {
        roomId,
        callerEmail: user.email,
        targetEmail: callData.contactEmail,
        callerName: user.email.split('@')[0]
      });

      socket.emit('join-room', roomId);
      await setupMediaAndPeerConnection(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      endCall();
    }
  };

  const acceptCall = async () => {
    if (callStartedRef.current || !roomId || !socket) {
      return;
    }

    try {
      console.log('✅ Acceptation de l\'appel');
      callStartedRef.current = true;

      socket.emit('join-room', roomId);
      await setupMediaAndPeerConnection(false);
      socket.emit('ready-for-call', { roomId });
    } catch (error) {
      console.error('Error accepting call:', error);
      endCall();
    }
  };

  const setupMediaAndPeerConnection = async (isInitiator) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    });
    
    localStreamRef.current = stream;
    console.log('✅ Local stream created');
    setStreamUpdate(prev => prev + 1); // Forcer le re-render pour attacher le stream
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { 
          candidate: event.candidate, 
          roomId
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('📺 Setting remote stream');
        remoteStreamRef.current = event.streams[0];
        setStreamUpdate(prev => prev + 1); // Forcer le re-render pour attacher le stream
      }
    };

    const handleOffer = async (data) => {
      if (data.sender !== socket.id) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { answer, roomId });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      }
    };

    const handleAnswer = async (data) => {
      if (data.sender !== socket.id) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.sender !== socket.id) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    if (isInitiator) {
      const handleReadyForCall = async (data) => {
        if (data.roomId === roomId) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { offer, roomId });
          } catch (error) {
            console.error('Error creating offer:', error);
          }
          socket.off('ready-for-call', handleReadyForCall);
        }
      };
      
      socket.on('ready-for-call', handleReadyForCall);
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) {
      return;
    }

    try {
      if (!isScreenSharing) {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        setIsScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        screenTrack.onended = () => endScreenShare();
        
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
      } else {
        endScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsScreenSharing(false);
    }
  };

  const endScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      if (localStreamRef.current && peerConnectionRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
    }
  };

  const handlePiPClick = () => {
    setCurrentPage('appels');
  };

  if (!socket) {
    return (
      <div style={{ padding: '2rem', color: '#fff' }}>
        <h2>Connexion au serveur...</h2>
      </div>
    );
  }

  if (callEnded && !isPiP) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #1a1d24 0%, #0a0c10 100%)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '1rem' }}>
            Appel terminé...
          </h1>
        </div>
      </div>
    );
  }

  // Mode Picture-in-Picture
  if (isPiP) {
    return (
      <PiPContainer onClick={handlePiPClick}>
        <PiPVideo autoPlay playsInline />
        <PiPLocalVideo autoPlay playsInline muted />
        <PiPLabel>En appel</PiPLabel>
        <PiPEndButton 
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
        >
          ✕
        </PiPEndButton>
      </PiPContainer>
    );
  }

  // Mode plein écran
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: 'black',
        width: sidebar ? 'calc(100vw - 150px)' : '100vw',
        height: 'calc(100vh - 80px)',
        position: 'relative',
        transition: 'all 350ms',
      }}
    >
      <video
        autoPlay
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          background: '#000',
        }}
      />
      <video
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '20vw',
          height: '20vh',
          objectFit: 'cover',
          zIndex: 60,
          borderRadius: '10px',
          border: '2px solid #fff',
        }}
      />
      <button
        onClick={endCall}
        style={{
          position: 'absolute',
          zIndex: 100,
          top: '20px',
          left: '20px',
          background: '#e74c3c',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Raccrocher
      </button>
      <button
        onClick={toggleScreenShare}
        disabled={!callStartedRef.current}
        style={{
          position: 'absolute',
          zIndex: 100,
          top: '80px',
          left: '20px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '10px',
          border: 'none',
          borderRadius: '5px',
          cursor: !callStartedRef.current ? 'not-allowed' : 'pointer',
        }}
      >
        {isScreenSharing ? 'Arrêter Partage' : 'Partager Écran'}
      </button>
    </div>
  );
};

export default VideoCall;