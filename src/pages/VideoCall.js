import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';

const VideoCall = ({ sidebar, callData, setCurrentPage }) => {
  const { socket } = useContext(SocketContext);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteScreenRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const isMounted = useRef(true);
  const hasSetupConnection = useRef(false);
  const { user } = useContext(AuthContext);

  const roomId = callData?.roomId;
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const endCall = useCallback(() => {
    console.log('Ending call...');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (socket) {
      socket.emit('call-ended', { roomId });
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
    if (isMounted.current) {
      setCallStarted(false);
    }
    hasSetupConnection.current = false;
    
    // Rediriger vers la page contacts après avoir raccroché
    if (setCurrentPage) {
      setCurrentPage('contacts');
    }
  }, [localStream, screenStream, peerConnection, roomId, socket, setCurrentPage]);

  useEffect(() => {
    isMounted.current = true;

    // Écouter l'événement call-ended
    if (socket) {
      const handleCallEnded = () => {
        console.log('📴 Appel terminé par l\'autre partie');
        setCallEnded(true);
        
        // Nettoyer les streams et connexions
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnection) {
          peerConnection.close();
        }
        
        // Rediriger après 4 secondes
        setTimeout(() => {
          if (setCurrentPage) {
            setCurrentPage('contacts');
          }
        }, 4000);
      };
      
      socket.on('call-ended', handleCallEnded);
      
      return () => {
        socket.off('call-ended', handleCallEnded);
      };
    }

    return () => {
      isMounted.current = false;
      endCall();
    };
  }, [socket, localStream, screenStream, peerConnection]);

  // Démarrer l'appel automatiquement si on a des données d'appel
  useEffect(() => {
    if (callData && !callStarted && socket && !hasSetupConnection.current) {
      hasSetupConnection.current = true;
      
      if (callData.isCaller) {
        // L'appelant commence immédiatement à se préparer
        initiateCall();
      } else if (callData.isIncoming) {
        // Le destinataire accepte l'appel (déjà fait via le bouton "Décrocher")
        acceptCall();
      }
    }
  }, [callData, socket]);

  const initiateCall = async () => {
    if (callStarted || !roomId || !socket) {
      console.log('Cannot start call:', { callStarted, roomId, socket: !!socket });
      return;
    }

    try {
      setCallStarted(true);
      console.log('📞 Initiation de l\'appel vers:', callData.contactEmail);

      // IMPORTANT : Envoyer la notification d'appel AVANT de rejoindre la room
      socket.emit('call-user', {
        roomId,
        callerEmail: user.email,
        targetEmail: callData.contactEmail,
        callerName: user.email.split('@')[0]
      });
      console.log('📤 Notification d\'appel envoyée');

      socket.emit('join-room', roomId);
      console.log('Joined room:', roomId);

      // Setup média et peer connection, mais attendre le signal "ready"
      await setupMediaAndPeerConnection(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      endCall();
    }
  };

  const acceptCall = async () => {
    if (callStarted || !roomId || !socket) {
      console.log('Cannot accept call:', { callStarted, roomId, socket: !!socket });
      return;
    }

    try {
      console.log('✅ Acceptation de l\'appel');
      setCallStarted(true);

      socket.emit('join-room', roomId);
      console.log('Joined room:', roomId);
      
      // Setup média et peer connection
      await setupMediaAndPeerConnection(false);
      
      // Signaler qu'on est prêt APRÈS avoir setup la connexion
      socket.emit('ready-for-call', { roomId });
      console.log('📢 Signal "ready-for-call" envoyé');
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
    
    if (isMounted.current) {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Local video set');
      }
    }

    const pc = new RTCPeerConnection(config);
    if (isMounted.current) {
      setPeerConnection(pc);
    }

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log('Added local track:', track.kind);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { 
          candidate: event.candidate, 
          roomId
        });
        console.log('Sent ICE candidate');
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      if (event.streams && event.streams[0] && isMounted.current) {
        console.log('🎥 Setting remote stream to video element');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log('✅ Remote video set successfully');
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        console.log('✅ Peers connected!');
      } else if (pc.iceConnectionState === 'failed') {
        console.log('❌ ICE connection failed');
      }
    };

    const handleOffer = async (data) => {
      if (data.sender !== socket.id) {
        console.log('📥 Received offer from:', data.sender);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          console.log('✅ Remote description set');
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { answer, roomId });
          console.log('📤 Sent answer');
        } catch (error) {
          console.error('❌ Error handling offer:', error);
        }
      }
    };

    const handleAnswer = async (data) => {
      if (data.sender !== socket.id) {
        console.log('📥 Received answer from:', data.sender);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ Remote description set from answer');
        } catch (error) {
          console.error('❌ Error handling answer:', error);
        }
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.sender !== socket.id) {
        console.log('🧊 Received ICE candidate');
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('✅ ICE candidate added');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    // Si on est l'initiateur (appelant), attendre le signal "ready"
    if (isInitiator) {
      const handleReadyForCall = async (data) => {
        if (data.roomId === roomId) {
          console.log('📞 Destinataire prêt, création et envoi de l\'offre');
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { offer, roomId });
            console.log('📤 Offer envoyée');
          } catch (error) {
            console.error('❌ Error creating offer:', error);
          }
          socket.off('ready-for-call', handleReadyForCall);
        }
      };
      
      socket.on('ready-for-call', handleReadyForCall);
      console.log('⏳ En attente du signal "ready-for-call"...');
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnection) {
      console.error('Peer connection not established');
      return;
    }

    try {
      if (!isScreenSharing) {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(screen);
        setIsScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        screenTrack.onended = () => endScreenShare();
        
        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
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
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      if (localStream && peerConnection) {
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
    }
  };

  if (!socket) {
    return (
      <div style={{ padding: '2rem', color: '#fff' }}>
        <h2>Connexion au serveur...</h2>
      </div>
    );
  }

  // Afficher le message "Appel terminé" si l'autre a raccroché
  if (callEnded) {
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
            📴 Appel terminé
          </h1>
          <p style={{ color: '#888', fontSize: '1.2rem' }}>
            Redirection vers vos contacts...
          </p>
        </div>
      </div>
    );
  }

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
        ref={remoteVideoRef}
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
        ref={remoteScreenRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '20px',
          width: '30vw',
          height: '30vh',
          objectFit: 'contain',
          zIndex: 50,
          borderRadius: '10px',
          display: isScreenSharing ? 'block' : 'none',
        }}
      />
      <video
        ref={localVideoRef}
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
          display: localStream ? 'block' : 'none',
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
        disabled={!callStarted}
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
          cursor: !callStarted ? 'not-allowed' : 'pointer',
        }}
      >
        {isScreenSharing ? 'Arrêter Partage' : 'Partager Écran'}
      </button>
    </div>
  );
};

export default VideoCall;