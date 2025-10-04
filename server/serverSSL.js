const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Ajout du middleware CORS
var secvar = require ('./secret.vars');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'https://famibox.cazapp.fr' })); // Autorise les requêtes depuis ton domaine

// Charger les certificats SSL
const options = {
  cert: fs.readFileSync('/etc/ssl/certs/fullchain.pem'),
  key: fs.readFileSync('/home/caza/ssl/private/ssl-priv.key')
};

const server = https.createServer(options, app);
const io = socketIo(server, { cors: { origin: 'https://famibox.cazapp.fr' } });

// Initialiser la base de données SQLite
const db = new sqlite3.Database('./users.db');
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)");
  // Commentaire : Crée la table des utilisateurs si elle n'existe pas.
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

// Middleware d'authentification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  try {
    const decoded = jwt.verify(token, secvar.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token invalide:', error.message);
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

// Route pour l'inscription
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hash], (err) => {
      if (err) {
        return res.status(400).json({ error: 'Cet email existe déjà' });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Erreur inscription:', error); // Log pour debug
    res.status(500).json({ error: 'Erreur serveur' });
  }
  // Commentaire : Crée un nouvel utilisateur avec mot de passe haché.
});

// Route pour la connexion
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, secvar.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
  // Commentaire : Vérifie les credentials et renvoie un token JWT.
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
  
  // Vérifier que l'utilisateur n'ajoute pas son propre email
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
// SIGNALISATION WEBRTC AVEC SOCKET.IO
// ============================================

// Map pour suivre les utilisateurs connectés (email -> socket.id)
const connectedUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, secvar.JWT_SECRET);
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

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📞 ${socket.id} (${socket.user.email}) a rejoint la room: ${roomId}`);
    socket.to(roomId).emit('user-connected', socket.id);
  });

  // Gérer l'initiation d'un appel
  socket.on('call-user', (data) => {
    const { roomId, targetEmail, callerName } = data;
    console.log(`📞 Appel de ${socket.user.email} vers ${targetEmail}`);
    
    // Trouver le socket du destinataire
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
    console.log(`📴 Appel terminé par ${socket.id}`);
    socket.to(data.roomId).emit('call-ended');
  });

  socket.on('disconnect', () => {
    console.log('🔴 Peer déconnecté :', socket.id, '- User:', socket.user.email);
    connectedUsers.delete(socket.user.email);
    console.log('👥 Utilisateurs connectés:', connectedUsers.size);
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
const PORT = 3000;
server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Serveur HTTPS Famibox démarré !');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔒 JWT Secret: ${secvar.JWT_SECRET ? '✅ Configuré' : '❌ MANQUANT'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

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