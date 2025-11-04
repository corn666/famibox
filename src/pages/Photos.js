import React, { useState, useEffect, useContext, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import useTVNavigation from '../hooks/useTVNavigation';

const Container = styled.div`
  padding: 2rem;
  max-width: 1400px;
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

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Tab = styled.button`
  background: ${props => props.active ? '#632ce4' : 'transparent'};
  color: #fff;
  border: 1px solid #632ce4;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.active ? '#5020c0' : 'rgba(99, 44, 228, 0.2)'};
  }
`;

const UploadButton = styled.button`
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

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const MediaCard = styled.div`
  background: linear-gradient(145deg, #1a1d24, #15171c);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border: 2px solid ${props => props.unviewed ? '#632ce4' : 'transparent'};

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(99, 44, 228, 0.3);
  }
`;

const MediaPreview = styled.div`
  width: 100%;
  height: 200px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const MediaInfo = styled.div`
  padding: 1rem;
`;

const MediaName = styled.h3`
  color: #fff;
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MediaDetails = styled.p`
  color: #888;
  font-size: 0.8rem;
  margin: 0.25rem 0;
`;

const Badge = styled.span`
  position: absolute;
  top: 10px;
  right: 10px;
  background: #632ce4;
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: #1a1d24;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
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
`;

const Select = styled.select`
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
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: block;
  width: 100%;
  padding: 2rem;
  margin: 1rem 0;
  border: 2px dashed #632ce4;
  border-radius: 8px;
  text-align: center;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(99, 44, 228, 0.1);
    color: #632ce4;
  }
`;

const FileList = styled.div`
  margin: 1rem 0;
  max-height: 200px;
  overflow-y: auto;
`;

const FileItem = styled.div`
  background: #15171c;
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 5px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RemoveButton = styled.button`
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: #c0392b;
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

const MediaViewer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
`;

const MediaViewerContent = styled.div`
  max-width: 90%;
  max-height: 90%;
  position: relative;

  img, video {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(231, 76, 60, 0.8);
  color: #fff;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  z-index: 3001;

  &:hover {
    background: #e74c3c;
  }
`;

const DownloadButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(99, 44, 228, 0.8);
  color: #fff;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  z-index: 3001;

  &:hover {
    background: #632ce4;
  }
`;

export const Photos = ({ sidebar }) => {
  const [activeTab, setActiveTab] = useState('received');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [receivedMedia, setReceivedMedia] = useState([]);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(AuthContext);
  const { newMediaNotification, clearMediaNotification } = useContext(SocketContext);
  
  // Refs pour navigation TV
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const viewerRef = useRef(null);
  
  // Navigation TV pour la page principale
  useTVNavigation(containerRef, {
    enabled: !showUploadModal && !viewingMedia && !sidebar,
    onBack: () => {
      // Navigation vers home ou autre
    },
    initialFocusIndex: 0
  });
  
  // Navigation TV pour le modal
  useTVNavigation(modalRef, {
    enabled: showUploadModal,
    onBack: () => setShowUploadModal(false),
    initialFocusIndex: 0
  });
  
  // Navigation TV pour la visionneuse
  useTVNavigation(viewerRef, {
    enabled: viewingMedia !== null,
    onBack: () => setViewingMedia(null),
    initialFocusIndex: 0
  });

  useEffect(() => {
    loadContacts();
    loadReceivedMedia();
  }, []);

  useEffect(() => {
    if (newMediaNotification) {
      loadReceivedMedia();
      clearMediaNotification();
    }
  }, [newMediaNotification]);

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

  const loadReceivedMedia = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://famibox.cazapp.fr:3000/api/media/received', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceivedMedia(res.data);
    } catch (err) {
      console.error('Erreur chargement médias:', err);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setError('');

    if (selectedFiles.length === 0) {
      setError('Veuillez sélectionner au moins un fichier');
      return;
    }

    if (!selectedRecipient) {
      setError('Veuillez sélectionner un destinataire');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('recipientEmail', selectedRecipient);

      const token = localStorage.getItem('token');
      await axios.post('https://famibox.cazapp.fr:3000/api/media/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowUploadModal(false);
      setSelectedFiles([]);
      setSelectedRecipient('');
      alert('Fichiers partagés avec succès !');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setUploading(false);
    }
  };

  const handleViewMedia = async (media) => {
    setViewingMedia(media);

    if (!media.viewed) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`https://famibox.cazapp.fr:3000/api/media/mark-viewed/${media.id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        loadReceivedMedia();
      } catch (err) {
        console.error('Erreur marquage média:', err);
      }
    }
  };

  const handleDownload = async (media) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`https://famibox.cazapp.fr:3000/api/media/download/${media.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', media.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      alert('Erreur lors du téléchargement');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isVideo = (fileType) => {
    return fileType.startsWith('video/');
  };

  const getMediaUrl = (mediaId) => {
    const token = localStorage.getItem('token');
    return `https://famibox.cazapp.fr:3000/api/media/stream/${mediaId}?token=${token}`;
  };

  const unviewedCount = receivedMedia.filter(m => !m.viewed).length;

  return (
    <Container ref={containerRef}>
      <Header>
        <Title>Photos & Vidéos {unviewedCount > 0 && `(${unviewedCount} nouveaux)`}</Title>
        <UploadButton 
          onClick={() => setShowUploadModal(true)}
          data-tv-navigable
        >
          📤 Partager des fichiers
        </UploadButton>
      </Header>

      <TabContainer>
        <Tab 
          active={activeTab === 'received'} 
          onClick={() => setActiveTab('received')}
          data-tv-navigable
        >
          📥 Fichiers reçus
        </Tab>
      </TabContainer>

      {activeTab === 'received' && (
        <>
          {receivedMedia.length === 0 ? (
            <EmptyState>
              <h2>Aucun fichier reçu</h2>
              <p>Les photos et vidéos que vous recevrez apparaîtront ici</p>
            </EmptyState>
          ) : (
            <MediaGrid>
              {receivedMedia.map((media) => (
                <MediaCard 
                  key={media.id} 
                  onClick={() => handleViewMedia(media)}
                  unviewed={!media.viewed}
                  data-tv-navigable
                >
                  <MediaPreview>
                    {isVideo(media.file_type) ? (
                      <video 
                        src={getMediaUrl(media.id)}
                        style={{ pointerEvents: 'none' }}
                        preload="metadata"
                      />
                    ) : (
                      <img 
                        src={getMediaUrl(media.id)}
                        alt={media.original_name}
                        loading="lazy"
                      />
                    )}
                    {!media.viewed && <Badge>Nouveau</Badge>}
                  </MediaPreview>
                  <MediaInfo>
                    <MediaName>{media.original_name}</MediaName>
                    <MediaDetails>De: {media.sender_email}</MediaDetails>
                    <MediaDetails>Date: {formatDate(media.created_at)}</MediaDetails>
                  </MediaInfo>
                </MediaCard>
              ))}
            </MediaGrid>
          )}
        </>
      )}

      {showUploadModal && (
        <Modal onClick={() => setShowUploadModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} ref={modalRef}>
            <ModalTitle>Partager des fichiers</ModalTitle>
            {error && <Error>{error}</Error>}
            
            <Select 
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              disabled={uploading}
              data-tv-navigable
            >
              <option value="">Sélectionner un destinataire</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.email}>
                  {contact.prenom} ({contact.email})
                </option>
              ))}
            </Select>

            <FileInput
              type="file"
              id="file-upload"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <FileInputLabel htmlFor="file-upload" data-tv-navigable>
              {selectedFiles.length === 0 
                ? '📁 Cliquez pour sélectionner des fichiers' 
                : `${selectedFiles.length} fichier(s) sélectionné(s)`}
            </FileInputLabel>

            {selectedFiles.length > 0 && (
              <FileList>
                {selectedFiles.map((file, index) => (
                  <FileItem key={index}>
                    <span>
                      {file.name} ({formatFileSize(file.size)})
                    </span>
                    <RemoveButton 
                      onClick={() => removeFile(index)} 
                      disabled={uploading}
                      data-tv-navigable
                    >
                      ✕
                    </RemoveButton>
                  </FileItem>
                ))}
              </FileList>
            )}

            <ModalButtons>
              <ModalButton 
                onClick={() => setShowUploadModal(false)} 
                disabled={uploading}
                data-tv-navigable
              >
                Annuler
              </ModalButton>
              <ModalButton 
                primary 
                onClick={handleUpload} 
                disabled={uploading}
                data-tv-navigable
              >
                {uploading ? 'Envoi en cours...' : 'Envoyer'}
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}

      {viewingMedia && (
        <MediaViewer onClick={() => setViewingMedia(null)} ref={viewerRef}>
          <CloseButton 
            onClick={() => setViewingMedia(null)}
            data-tv-navigable
          >
            ✕
          </CloseButton>
          <MediaViewerContent onClick={(e) => e.stopPropagation()}>
            {isVideo(viewingMedia.file_type) ? (
              <video 
                src={getMediaUrl(viewingMedia.id)}
                controls
                autoPlay
              />
            ) : (
              <img 
                src={getMediaUrl(viewingMedia.id)}
                alt={viewingMedia.original_name}
              />
            )}
          </MediaViewerContent>
          <DownloadButton 
            onClick={() => handleDownload(viewingMedia)}
            data-tv-navigable
          >
            ⬇️ Télécharger
          </DownloadButton>
        </MediaViewer>
      )}
    </Container>
  );
};

export default Photos;