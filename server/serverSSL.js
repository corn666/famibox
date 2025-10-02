const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Ajout du middleware CORS

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
    const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key_change_moi', { expiresIn: '1h' });
    res.json({ token });
  });
  // Commentaire : Vérifie les credentials et renvoie un token JWT.
});

io.on('connection', (socket) => {
  console.log('Un peer connecté :', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
  });

  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', { offer: data.offer, sender: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', { answer: data.answer, sender: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('Peer déconnecté :', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Serveur HTTPS sur port 3000');
});
