const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

console.log('DEBUG: Starting server initialization...');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

console.log('DEBUG: Express and Socket.io initialized');

// インメモリデータストア
const inMemoryDB = {
  users: [
    {
      id: "user1",
      username: "player1",
      email: "player1@example.com",
      password: "$2a$10$X7VYHy.2Xo4KFNUdRgO3A.9JVXgBIUvNfSHMZGkPeH4XKpgpvK9.C", // "password"
      stats: {
        gamesPlayed: 10,
        gamesWon: 5,
        fastestWin: 120
      }
    },
    {
      id: "user2",
      username: "player2",
      email: "player2@example.com",
      password: "$2a$10$X7VYHy.2Xo4KFNUdRgO3A.9JVXgBIUvNfSHMZGkPeH4XKpgpvK9.C", // "password"
      stats: {
        gamesPlayed: 8,
        gamesWon: 3,
        fastestWin: 180
      }
    }
  ]
};

console.log('Using in-memory database for development');

// ミドルウェア設定
try {
  // CORS設定
  app.use(cors());
  console.log('DEBUG: CORS enabled');

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  console.log('DEBUG: Middleware configured');
} catch (err) {
  console.error('ERROR configuring middleware:', err);
}

// 静的ファイルの提供設定
console.log('DEBUG: Setting up static file serving...');
try {
  const staticRoot = path.resolve(__dirname, '..');
  console.log('DEBUG: Static root path:', staticRoot);
  
  app.use(express.static(staticRoot));
  console.log('DEBUG: Static file serving setup complete');
  
  // 特定のディレクトリのエイリアス設定
  app.use('/public', express.static(path.join(staticRoot, 'public')));
  app.use('/game', express.static(path.join(staticRoot, 'game')));
  app.use('/js', express.static(path.join(staticRoot, 'game/js'))); 
  app.use('/frontend', express.static(path.join(staticRoot, 'frontend')));
  
  console.log('DEBUG: Directory aliases setup complete');
} catch (err) {
  console.error('ERROR setting up static directories:', err);
}

// モックルーターを使用
console.log('DEBUG: Setting up mock routers...');
try {
  const mockUserRouter = require('./routes/mockUser')(inMemoryDB);
  app.use('/api/users', mockUserRouter);
  console.log('DEBUG: mockUser router setup complete');

  // 簡易版のルーターを使用
  app.use('/api/game', require('./routes/mockGame')());
  console.log('DEBUG: mockGame router setup complete');
  
  app.use('/api/analytics', require('./routes/mockAnalytics')());
  console.log('DEBUG: mockAnalytics router setup complete');
} catch (err) {
  console.error('ERROR setting up mock routers:', err);
}

// Simple REST endpoint
app.get('/', (req, res) => {
  console.log('DEBUG: Root endpoint accessed');
  const gamePath = path.resolve(__dirname, '../game/index.html');
  console.log('DEBUG: Attempting to serve game file at:', gamePath);
  res.sendFile(gamePath);
});

// API status endpoint
app.get('/api', (req, res) => {
  console.log('DEBUG: API endpoint accessed');
  res.send('Jenga Race Backend is running');
});

// Socket.io ゲームハンドラー設定
console.log('DEBUG: Setting up game socket handlers...');
try {
  const gameSocketHandler = require('./handlers/gameSocketHandler')(io);
  console.log('DEBUG: Game socket handlers setup complete');
} catch (err) {
  console.error('ERROR setting up game socket handlers:', err);
}

// Start the server
console.log('DEBUG: Attempting to start server...');
const PORT = process.env.PORT || 3002; 
try {
  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
} catch (err) {
  console.error('ERROR starting server:', err);
}
