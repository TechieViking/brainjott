/*
 * server.js
 * This file sets up the Node.js/Express server for the chat application.
 * It uses Socket.IO for real-time messaging and Mongoose to connect to a MongoDB database.
 */

// 1. Import Dependencies
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');

// 2. Initialize Express App and HTTP Server
const app = express();
const server = http.createServer(app);

// 3. Configure CORS and Middleware
app.use(cors());
app.use(express.json());

// 4. Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 5. Connect to MongoDB
const MONGO_URI = 'mongodb+srv://hello_123:hello123@vdb.xldmdgp.mongodb.net/chat-app?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => console.error('MongoDB connection error:', err));

// 6. Define the Mongoose Schema and Model for Chat Messages
const messageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
// Routes
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const notesRoutes = require('./routes/notes.routes');
const userRoutes = require('./routes/user.routes'); // <-- Import the user routes

// ... further down, with other app.use() statements
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/users', userRoutes);
// A simple route for testing
app.get('/', (req, res) => {
    res.send('Brainjot API is running!');
});
// 7. Define API Routes
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages.", error: error.message });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await Message.distinct('user');
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
});



// 8. Configure Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('A user connected with socket id:', socket.id);

  socket.on('sendMessage', async (msg) => {
    if (!msg || !msg.user || typeof msg.message !== 'string') {
        return console.error('Invalid message received:', msg);
    }
    
    const message = new Message({
        user: msg.user,
        message: msg.message
    });

    try {
        const savedMessage = await message.save();
        io.emit('newMessage', savedMessage);

        const userCount = await Message.countDocuments({ user: msg.user });
        if (userCount === 1) {
            io.emit('userListUpdated');
        }
    } catch (error) {
        console.error("Error saving message:", error);
    }
  });

  socket.on('userStartedTyping', (username) => {
    socket.broadcast.emit('isTyping', username);
  });

  socket.on('userStoppedTyping', () => {
    socket.broadcast.emit('stoppedTyping');
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('stoppedTyping');
    console.log('User disconnected');
  });
});

// 9. Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
