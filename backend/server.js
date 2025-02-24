const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/jengarace';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use('/api/users', require('./routes/user'));
app.use('/api/friends', require('./routes/friend'));
app.use('/api/rankings', require('./routes/ranking'));
app.use('/api/game', require('./routes/game'));
app.use('/api/matchmaking', require('./routes/matchmaking'));
app.use('/api/replay', require('./routes/replay'));
app.use('/api/item', require('./routes/item'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notification', require('./routes/notification'));
app.use('/api/chat', require('./routes/chat'));

// Simple REST endpoint
app.get('/', (req, res) => {
  res.send('Jenga Race Backend is running');
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Example event: chat message (can be replaced with game events)
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
