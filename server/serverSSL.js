require('dotenv').config({ path: './secret.vars' });

const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());

// Configuration CORS améliorée pour supporter le développement local
const allowedOrigins = [
  'https://famibox.cazapp.fr',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (comme Postman, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Vérifier que JWT_SECRET est défini
if (!process.env.JWT_SECRET) {
  console.error('❌ ERREUR : JWT_SECRET non défini dans secret.vars');
  process.exit(1);
}

// Configuration du stockage multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(7);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non autorisé'));
  }
});

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✅ Dossier uploads créé');
}

// Charger les certificats SSL
const options = {
  cert: fs.readFileSync('/etc/ssl/certs/fullchain.pem'),
  key: fs.readFileSync('/home/caza/ssl/private/ssl-priv.key')
};

const server = https.createServer(options, app);

// Configuration Socket.IO avec CORS amélioré
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Initialiser la base de données SQLite
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('❌ Erreur connexion base de données:', err);
    process.exit(1);
  }
  console.log('✅ Base de données connectée');
});

// Créer les tables
db.serialize(() => {
  // Table users
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)", (err) => {
    if (err) {
      console.error('❌ Erreur création table users:', err);
    } else {
      console.log('✅ Table users prête');
    }
  });

  // Table contacts
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_email TEXT NOT NULL,
    prenom TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, contact_email)
  )`, (err) => {
    if (err) {
      console.error('❌ Erreur création table contacts:', err);
    } else {
      console.log('✅ Table contacts prête');
    }
  });

  // Table media_shares
  db.run(`CREATE TABLE IF NOT EXISTS media_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    sender_email TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    viewed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    viewed_at DATETIME,
    FOREIGN KEY (sender_id) REFERENCES users(id)
  )`, (err) => {
    if (err) {
      console.error('❌ Erreur création table media_shares:', err);
    } else {
      console.log('✅ Table media_shares prête');
    }
  });
});

// Middleware d'authentification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token invalide:', error.message);
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

// Route pour l'inscription
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hash], function(err) {
      if (err) {
        console.error('Erreur insertion utilisateur:', err);
        return res.status(400).json({ error: 'Cet email existe déjà' });
      }
      console.log(`✅ Utilisateur créé: ${email} (ID: ${this.lastID})`);
      res.json({ success: true, message: 'Inscription réussie' });
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Route pour la connexion
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error('Erreur base de données:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!user) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '90d' }
      );

      console.log(`✅ Connexion réussie: ${email}`);
      res.json({ token });
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
});

// ============================================
// ROUTES GESTION CONTACTS
// ============================================

// Récupérer tous les contacts d'un utilisateur
app.get('/api/contacts', verifyToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    "SELECT id, contact_email as email, prenom, created_at FROM contacts WHERE user_id = ? ORDER BY prenom ASC",
    [userId],
    (err, contacts) => {
      if (err) {
        console.error('Erreur récupération contacts:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(contacts);
    }
  );
});

// Ajouter un contact
app.post('/api/contacts', verifyToken, (req, res) => {
  const userId = req.user.id;
  const { email, prenom } = req.body;

  if (!email || !prenom) {
    return res.status(400).json({ error: 'Email et prénom requis' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  if (email === req.user.email) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même' });
  }

  db.run(
    "INSERT INTO contacts (user_id, contact_email, prenom) VALUES (?, ?, ?)",
    [userId, email, prenom],
    function(err) {
      if (err) {
        console.error('Erreur ajout contact:', err);
        return res.status(400).json({ error: 'Ce contact existe déjà' });
      }
      console.log(`✅ Contact ajouté: ${prenom} (${email}) par user ${userId}`);
      res.json({
        success: true,
        contact: { id: this.lastID, email, prenom }
      });
    }
  );
});

// Supprimer un contact
app.delete('/api/contacts/:id', verifyToken, (req, res) => {
  const userId = req.user.id;
  const contactId = req.params.id;

  db.run(
    "DELETE FROM contacts WHERE id = ? AND user_id = ?",
    [contactId, userId],
    function(err) {
      if (err) {
        console.error('Erreur suppression contact:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Contact non trouvé' });
      }

      console.log(`✅ Contact ${contactId} supprimé par user ${userId}`);
      res.json({ success: true });
    }
  );
});

// ============================================
// ROUTES GESTION PHOTOS/VIDÉOS - VERSION CORRIGÉE
// ============================================

// Upload de médias
app.post('/api/media/upload', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    const senderId = req.user.id;
    const senderEmail = req.user.email;

    if (!recipientEmail || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Destinataire et fichiers requis' });
    }

    // Vérifier que le destinataire existe
    db.get("SELECT id FROM users WHERE email = ?", [recipientEmail], async (err, recipient) => {
      if (err || !recipient) {
        // Supprimer les fichiers uploadés
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
        return res.status(400).json({ error: 'Destinataire non trouvé' });
      }

      // Insérer les enregistrements dans la base
      const insertPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO media_shares (sender_id, sender_email, recipient_email, filename, original_name, file_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [senderId, senderEmail, recipientEmail, file.filename, file.originalname, file.mimetype, file.size],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      });

      try {
        const mediaIds = await Promise.all(insertPromises);
        console.log(`✅ ${req.files.length} fichier(s) partagé(s) vers ${recipientEmail}`);

        // Notifier le destinataire s'il est connecté
        const recipientSocketId = connectedUsers.get(recipientEmail);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new-media-notification', {
            senderEmail,
            count: req.files.length
          });
        }

        res.json({
          success: true,
          message: `${req.files.length} fichier(s) partagé(s)`,
          mediaIds
        });
      } catch (error) {
        console.error('Erreur insertion médias:', error);
        res.status(500).json({ error: 'Erreur lors du partage' });
      }
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// Récupérer les médias reçus
app.get('/api/media/received', verifyToken, (req, res) => {
  const userEmail = req.user.email;

  db.all(
    `SELECT id, sender_email, filename, original_name, file_type, file_size, viewed, created_at, viewed_at
     FROM media_shares
     WHERE recipient_email = ?
     ORDER BY created_at DESC`,
    [userEmail],
    (err, media) => {
      if (err) {
        console.error('Erreur récupération médias:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(media);
    }
  );
});

// Récupérer les médias non consultés
app.get('/api/media/unviewed-count', verifyToken, (req, res) => {
  const userEmail = req.user.email;

  db.get(
    "SELECT COUNT(*) as count FROM media_shares WHERE recipient_email = ? AND viewed = 0",
    [userEmail],
    (err, result) => {
      if (err) {
        console.error('Erreur comptage médias non vus:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json({ count: result.count });
    }
  );
});

// Télécharger un média
app.get('/api/media/download/:id', verifyToken, (req, res) => {
  const mediaId = req.params.id;
  const userEmail = req.user.email;

  db.get(
    "SELECT * FROM media_shares WHERE id = ? AND recipient_email = ?",
    [mediaId, userEmail],
    (err, media) => {
      if (err) {
        console.error('Erreur récupération média:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!media) {
        return res.status(404).json({ error: 'Média non trouvé' });
      }

      const filePath = path.join(__dirname, 'uploads', media.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
      }

      res.download(filePath, media.original_name);
    }
  );
});

// Marquer un média comme consulté
app.post('/api/media/mark-viewed/:id', verifyToken, (req, res) => {
  const mediaId = req.params.id;
  const userEmail = req.user.email;

  db.get(
    "SELECT * FROM media_shares WHERE id = ? AND recipient_email = ?",
    [mediaId, userEmail],
    (err, media) => {
      if (err || !media) {
        return res.status(404).json({ error: 'Média non trouvé' });
      }

      // Si déjà consulté, ne rien faire
      if (media.viewed) {
        return res.json({ success: true, alreadyViewed: true });
      }

      // Marquer comme consulté
      db.run(
        "UPDATE media_shares SET viewed = 1, viewed_at = CURRENT_TIMESTAMP WHERE id = ?",
        [mediaId],
        (err) => {
          if (err) {
            console.error('Erreur marquage média:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
          }

          console.log(`✅ Média ${mediaId} marqué comme consulté`);

          // Notifier l'expéditeur
          const senderSocketId = connectedUsers.get(media.sender_email);
          if (senderSocketId) {
            io.to(senderSocketId).emit('media-viewed-notification', {
              recipientEmail: userEmail,
              originalName: media.original_name
            });
          }

          res.json({ success: true });
        }
      );
    }
  );
});

// NOUVELLE ROUTE : Streaming avec token dans l'URL (query string)
app.get('/api/media/stream/:id', (req, res) => {
  const mediaId = req.params.id;
  const token = req.query.token; // Token passé en query string

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  // Vérifier le token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }

  const userEmail = decoded.email;

  db.get(
    "SELECT * FROM media_shares WHERE id = ? AND recipient_email = ?",
    [mediaId, userEmail],
    (err, media) => {
      if (err) {
        console.error('Erreur récupération média:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!media) {
        return res.status(404).json({ error: 'Média non trouvé' });
      }

      const filePath = path.join(__dirname, 'uploads', media.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
      }

      // Définir le bon Content-Type
      res.setHeader('Content-Type', media.file_type);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 an
      
      // Envoyer le fichier
      res.sendFile(filePath);
    }
  );
});

// ============================================
// SIGNALISATION WEBRTC AVEC SOCKET.IO
// ============================================

// Map pour suivre les utilisateurs connectés (email -> socket.id)
const connectedUsers = new Map();
// Map pour suivre les rooms actives (roomId -> [email1, email2])
const activeRooms = new Map();
// Map pour suivre les utilisateurs en appel (email -> roomId)
const usersInCall = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Peer connecté :', socket.id, '- User:', socket.user.email);

  // Enregistrer l'utilisateur connecté
  connectedUsers.set(socket.user.email, socket.id);
  console.log('👥 Utilisateurs connectés:', connectedUsers.size);

  // Diffuser à tous que cet utilisateur est en ligne
  socket.broadcast.emit('user-online', socket.user.email);

  // Quand un client demande la liste des utilisateurs en ligne
  socket.on('request-online-users', () => {
    const onlineEmails = Array.from(connectedUsers.keys());
    socket.emit('online-users-list', onlineEmails);
    console.log('📋 Liste des utilisateurs en ligne envoyée à', socket.user.email);
  });

  // Quand un client demande la liste des utilisateurs en appel
  socket.on('request-users-in-call', () => {
    const usersInCallList = Array.from(usersInCall.keys());
    socket.emit('users-in-call-list', usersInCallList);
    console.log('📞 Liste des utilisateurs en appel envoyée à', socket.user.email);
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📞 ${socket.id} (${socket.user.email}) a rejoint la room: ${roomId}`);
    
    // Enregistrer la room active
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, []);
    }
    const roomUsers = activeRooms.get(roomId);
    if (!roomUsers.includes(socket.user.email)) {
      roomUsers.push(socket.user.email);
    }
    
    socket.to(roomId).emit('user-connected', socket.id);
  });

  // Marquer l'utilisateur comme "en appel"
  socket.on('call-started', (data) => {
    const { roomId } = data;
    usersInCall.set(socket.user.email, roomId);
    console.log(`📞 ${socket.user.email} est maintenant en appel (room: ${roomId})`);
    
    // Diffuser à tous que cet utilisateur est en appel
    socket.broadcast.emit('user-call-status-changed', {
      email: socket.user.email,
      inCall: true
    });
  });

  // Gérer l'initiation d'un appel
  socket.on('call-user', (data) => {
    const { roomId, targetEmail, callerName } = data;
    console.log(`📞 Appel de ${socket.user.email} vers ${targetEmail}`);

    const targetSocketId = connectedUsers.get(targetEmail);

    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        roomId,
        callerEmail: socket.user.email,
        callerName: callerName || socket.user.email.split('@')[0]
      });
      console.log(`✅ Notification envoyée à ${targetEmail}`);
    } else {
      console.log(`❌ ${targetEmail} n'est pas connecté`);
      socket.emit('user-unavailable', { targetEmail });
    }
  });

  // Signal que l'utilisateur est prêt à recevoir l'offre WebRTC
  socket.on('ready-for-call', (data) => {
    console.log(`✅ ${socket.user.email} est prêt pour l'appel dans room ${data.roomId}`);
    socket.to(data.roomId).emit('ready-for-call', data);
  });

  // Gérer le refus d'appel
  socket.on('call-declined', (data) => {
    const { roomId, targetEmail } = data;
    console.log(`❌ Appel refusé par ${socket.user.email}`);

    const targetSocketId = connectedUsers.get(targetEmail);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-declined');
    }
  });

  socket.on('offer', (data) => {
    console.log(`📤 Offer de ${socket.id} vers room ${data.roomId}`);
    socket.to(data.roomId).emit('offer', { offer: data.offer, sender: socket.id });
  });

  socket.on('answer', (data) => {
    console.log(`📥 Answer de ${socket.id} vers room ${data.roomId}`);
    socket.to(data.roomId).emit('answer', { answer: data.answer, sender: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    console.log(`🧊 ICE candidate de ${socket.id} vers room ${data.roomId}`);
    socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
  });

  socket.on('call-ended', (data) => {
    console.log(`🔴 Appel terminé par ${socket.id} dans room ${data.roomId}`);
    socket.to(data.roomId).emit('call-ended');
    
    // Retirer l'utilisateur de la liste "en appel"
    if (usersInCall.has(socket.user.email)) {
      usersInCall.delete(socket.user.email);
      console.log(`✅ ${socket.user.email} n'est plus en appel`);
      
      // Diffuser à tous que cet utilisateur n'est plus en appel
      socket.broadcast.emit('user-call-status-changed', {
        email: socket.user.email,
        inCall: false
      });
    }
    
    // Nettoyer la room
    if (activeRooms.has(data.roomId)) {
      const roomUsers = activeRooms.get(data.roomId);
      // Retirer tous les utilisateurs de cette room de la liste "en appel"
      roomUsers.forEach(email => {
        if (usersInCall.has(email)) {
          usersInCall.delete(email);
          // Notifier tout le monde
          io.emit('user-call-status-changed', {
            email: email,
            inCall: false
          });
        }
      });
      activeRooms.delete(data.roomId);
      console.log(`🧹 Room ${data.roomId} nettoyée`);
    }
  });

  // Gérer l'annulation d'appel (avant que l'autre décroche)
  socket.on('cancel-call', (data) => {
    const { targetEmail, roomId } = data;
    console.log(`❌ Appel annulé par ${socket.user.email} vers ${targetEmail}`);
    
    const targetSocketId = connectedUsers.get(targetEmail);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-cancelled', { roomId });
      console.log(`✅ Notification d'annulation envoyée à ${targetEmail}`);
      
      // Enregistrer comme appel manqué
      io.to(targetSocketId).emit('missed-call', {
        callerEmail: socket.user.email,
        callerName: socket.user.email.split('@')[0],
        timestamp: new Date().toISOString()
      });
      console.log(`📵 Appel manqué enregistré pour ${targetEmail}`);
    }
    
    // Nettoyer la room si elle existe
    if (activeRooms.has(roomId)) {
      activeRooms.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Peer déconnecté :', socket.id, '- User:', socket.user.email);
    const userEmail = socket.user.email;
    connectedUsers.delete(userEmail);
    
    // Retirer l'utilisateur de la liste "en appel"
    if (usersInCall.has(userEmail)) {
      usersInCall.delete(userEmail);
      // Diffuser à tous
      io.emit('user-call-status-changed', {
        email: userEmail,
        inCall: false
      });
    }
    
    // Nettoyer toutes les rooms où l'utilisateur était présent
    activeRooms.forEach((users, roomId) => {
      if (users.includes(userEmail)) {
        console.log(`🔴 Déconnexion brutale détectée - Notification des participants de room ${roomId}`);
        socket.to(roomId).emit('call-ended');
        
        // Retirer tous les utilisateurs de cette room de la liste "en appel"
        users.forEach(email => {
          if (usersInCall.has(email)) {
            usersInCall.delete(email);
            io.emit('user-call-status-changed', {
              email: email,
              inCall: false
            });
          }
        });
        
        activeRooms.delete(roomId);
      }
    });
    
    // Diffuser à tous que cet utilisateur est hors ligne
    socket.broadcast.emit('user-offline', userEmail);
    
    console.log('👥 Utilisateurs connectés:', connectedUsers.size);
    console.log('📞 Utilisateurs en appel:', usersInCall.size);
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
const PORT = 3000;
server.listen(PORT, () => {
  console.log('┌────────────────────────────────────────┐');
  console.log('🚀 Serveur HTTPS Famibox démarré !');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Configuré' : '❌ MANQUANT'}`);
  console.log(`📁 Dossier uploads: ${fs.existsSync(uploadsDir) ? '✅ Prêt' : '❌ Manquant'}`);
  console.log('🌐 CORS activé pour développement local');
  console.log('└────────────────────────────────────────┘');
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du serveur...');
  db.close((err) => {
    if (err) {
      console.error('Erreur fermeture DB:', err);
    } else {
      console.log('✅ Base de données fermée');
    }
    process.exit(0);
  });
});