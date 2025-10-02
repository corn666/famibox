import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const VideoCall = ({ sidebar, roomId: propRoomId }) => {
  const socketRef = useRef(null);
  const localVideoRef = useRef(null); // Référence pour le flux vidéo local
  const remoteVideoRef = useRef(null);
  const remoteScreenRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isMounted = useRef(true);

  // Utilise propRoomId ou fallback vers 'visio123' pour les tests sans contacts
  const roomId = propRoomId || 'visio123';

  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const endCall = useCallback(() => {
    console.log('Ending call...');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      if (localVideoRef.current) localVideoRef.current.srcObject = null; // Nettoyer le flux local
      console.log('Stopped local stream');
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      console.log('Stopped screen stream');
    }
    if (peerConnection) {
      if (socketRef.current) {
        socketRef.current.off('offer', peerConnection._handleOffer);
        socketRef.current.off('answer', peerConnection._handleAnswer);
        socketRef.current.off('ice-candidate', peerConnection._handleIceCandidate);
      }
      peerConnection.close();
      setPeerConnection(null);
      console.log('Closed peer connection');
    }
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.disconnect();
      console.log('Socket disconnected');
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteScreenRef.current) {
      remoteScreenRef.current.srcObject = null;
    }
    if (isMounted.current) {
      setCallStarted(false);
    }
  }, [localStream, screenStream, peerConnection]);

  useEffect(() => {
    socketRef.current = io('https://famibox.cazapp.fr:3000', { autoConnect: false });
    console.log('Socket initialized but not connected');

    return () => {
      isMounted.current = false;
      console.log('Cleaning up...');
      endCall();
    };
  }, []);

  const startCall = async () => {
    if (callStarted) {
      console.log('Call already started, ignoring');
      return;
    }

    try {
      setCallStarted(true);
      console.log('Starting call...');

      if (!socketRef.current.connected) {
        socketRef.current.connect();
        console.log('Socket connected');
      }

      socketRef.current.emit('join-room', roomId);
      console.log('Joined room:', roomId); // Log pour vérifier le roomId utilisé

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      if (isMounted.current) {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream; // Attacher le flux local à la vidéo
          console.log('Assigned local stream to localVideoRef');
        }
        console.log('Local stream captured');
      }

      const pc = new RTCPeerConnection(config);
      if (isMounted.current) {
        setPeerConnection(pc);
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added track:', track.kind);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { candidate: event.candidate, roomId });
          console.log('Sent ICE candidate');
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote stream, kind:', event.track.kind);
        if (event.streams[0] && isMounted.current) {
          if (event.track.kind === 'video' && !event.streams[0].id.includes('screen')) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
              console.log('Assigned camera stream to remoteVideoRef');
            }
          } else if (event.track.kind === 'video' && event.streams[0].id.includes('screen')) {
            if (remoteScreenRef.current) {
              remoteScreenRef.current.srcObject = event.streams[0];
              console.log('Assigned screen stream to remoteScreenRef');
            }
          }
        } else {
          console.error('No stream available for track');
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('offer', { offer, roomId });
      console.log('Sent offer');

      const handleOffer = async (data) => {
        if (data.sender !== socketRef.current.id) {
          console.log('Received offer from:', data.sender);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit('answer', { answer, roomId });
            console.log('Sent answer');
          } catch (error) {
            console.error('Error handling offer:', error);
            endCall();
          }
        }
      };

      const handleAnswer = async (data) => {
        if (data.sender !== socketRef.current.id) {
          console.log('Received answer from:', data.sender);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (error) {
            console.error('Error handling answer:', error);
            endCall();
          }
        }
      };

      const handleIceCandidate = async (data) => {
        if (data.sender !== socketRef.current.id) {
          console.log('Received ICE candidate');
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      };

      socketRef.current.on('offer', handleOffer);
      socketRef.current.on('answer', handleAnswer);
      socketRef.current.on('ice-candidate', handleIceCandidate);

      pc._handleOffer = handleOffer;
      pc._handleAnswer = handleAnswer;
      pc._handleIceCandidate = handleIceCandidate;
    } catch (error) {
      console.error('Error starting call:', error);
      endCall();
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnection) {
      console.error('Peer connection not established');
      return;
    }

    try {
      if (!isScreenSharing) {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(screen);
        setIsScreenSharing(true);
        console.log('Screen stream captured');

        const screenTrack = screen.getVideoTracks()[0];
        screenTrack.onended = () => {
          endScreenShare();
        };
        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
          console.log('Replaced video track with screen track');
        } else {
          console.error('No video sender found for screen sharing');
          return;
        }

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketRef.current.emit('offer', { offer, roomId });
        console.log('Sent new offer for screen sharing');
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
      console.log('Stopped screen sharing');

      if (localStream && peerConnection) {
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
          console.log('Restored camera track');
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socketRef.current.emit('offer', { offer, roomId });
          console.log('Sent new offer to restore camera');
        }
      }
    }
  };

  const handleCallButtonClick = () => {
    if (callStarted) {
      endCall();
    } else {
      startCall();
    }
  };

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
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />
      <video
        ref={remoteScreenRef}
        autoPlay
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
        muted // Mute pour éviter l'écho du micro local
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '20vw',
          height: '20vh',
          objectFit: 'cover',
          zIndex: 60, // Au-dessus du flux distant et de l'écran partagé
          borderRadius: '10px',
          border: '2px solid #fff',
          display: localStream ? 'block' : 'none', // Visible seulement si localStream existe
        }}
      />
      <button
        onClick={handleCallButtonClick}
        style={{
          position: 'absolute',
          zIndex: 100,
          top: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '10px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {callStarted ? 'Raccrocher' : 'Appeler'}
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
          cursor: !callStarted ? 'not-allowed' : isScreenSharing ? 'pointer' : 'pointer',
        }}
      >
        {isScreenSharing ? 'Arrêter Partage' : 'Partager Écran'}
      </button>
    </div>
  );
  // Commentaire : Affiche le flux vidéo local en bas à droite en surimpression, avec fallback roomId pour les tests.
};

export default VideoCall;