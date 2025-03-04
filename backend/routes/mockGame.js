const express = require('express');

module.exports = function() {
  const router = express.Router();
  
  // インメモリゲームデータ
  const games = [];
  let gameIdCounter = 1;

  // 部屋操作のハンドラー設定
  function setupSocketHandlers(io) {
    // ゲームルームデータ
    const gameRooms = {};

    // ソケット接続
    io.on('connection', (socket) => {
      console.log('DEBUG: New socket connection:', socket.id);

      // ゲーム参加
      socket.on('joinGame', (roomId, userId) => {
        console.log(`DEBUG: User ${userId} joining room ${roomId}`);
        
        // シングルプレイヤーモードの処理
        if (roomId.startsWith('single_')) {
          console.log(`DEBUG: Setting up single player mode for ${userId} in room ${roomId}`);
          
          // シングルプレイヤー用のルームを設定
          gameRooms[roomId] = {
            id: roomId,
            players: [userId],
            currentTurn: userId,
            gameState: 'playing',
            blocks: [],
            isSinglePlayer: true
          };
          
          socket.join(roomId);
          
          // ルーム参加通知
          io.to(roomId).emit('playerJoined', {
            roomId,
            userId,
            players: gameRooms[roomId].players
          });
          
          return;
        }
        
        // 通常のマルチプレイヤーモード
        try {
          // 部屋が存在しない場合は作成
          if (!gameRooms[roomId]) {
            console.log(`DEBUG: Creating new room ${roomId}`);
            gameRooms[roomId] = {
              id: roomId,
              players: [],
              currentTurn: null,
              gameState: 'waiting',
              blocks: []
            };
          }

          // プレイヤーがすでに部屋にいる場合は何もしない
          if (gameRooms[roomId].players.includes(userId)) {
            console.log(`DEBUG: User ${userId} already in room ${roomId}`);
            return;
          }

          // プレイヤーをルームに追加（最大2人）
          if (gameRooms[roomId].players.length < 2) {
            gameRooms[roomId].players.push(userId);
            socket.join(roomId);

            // ルーム参加通知
            io.to(roomId).emit('playerJoined', {
              roomId,
              userId,
              players: gameRooms[roomId].players
            });

            // 2人集まったらゲーム開始
            if (gameRooms[roomId].players.length === 2) {
              console.log(`DEBUG: Starting game in room ${roomId}`);
              gameRooms[roomId].gameState = 'playing';
              gameRooms[roomId].currentTurn = gameRooms[roomId].players[0];
              
              io.to(roomId).emit('gameStarted', {
                roomId,
                currentTurn: gameRooms[roomId].currentTurn,
                players: gameRooms[roomId].players
              });
            }
          } else {
            console.log(`DEBUG: Room ${roomId} is full`);
            socket.emit('error', { message: 'Room is full' });
          }
        } catch (err) {
          console.error('ERROR in joinGame:', err);
          socket.emit('error', { message: 'Failed to join game' });
        }
      });
    });
  }

  // @route   POST api/game/create
  // @desc    Create a new game
  // @access  Private
  router.post('/create', (req, res) => {
    try {
      const { userId, gameType, maxPlayers } = req.body;
      
      // 新しいゲームを作成
      const newGame = {
        id: `game${gameIdCounter++}`,
        creator: userId,
        players: [userId],
        gameType: gameType || 'standard',
        maxPlayers: maxPlayers || 2,
        status: 'waiting',
        createdAt: new Date(),
        blocks: [],
        turns: [],
        winner: null
      };
      
      games.push(newGame);
      
      res.json({ game: newGame });
    } catch (err) {
      console.error('Error creating game:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   GET api/game/list
  // @desc    Get list of available games
  // @access  Public
  router.get('/list', (req, res) => {
    try {
      // 参加可能なゲームのみをフィルタリング
      const availableGames = games.filter(game => 
        game.status === 'waiting' && 
        game.players.length < game.maxPlayers
      );
      
      res.json({ games: availableGames });
    } catch (err) {
      console.error('Error getting game list:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   POST api/game/join
  // @desc    Join an existing game
  // @access  Private
  router.post('/join', (req, res) => {
    try {
      const { userId, gameId } = req.body;
      
      // ゲームを検索
      const gameIndex = games.findIndex(game => game.id === gameId);
      if (gameIndex === -1) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      const game = games[gameIndex];
      
      // ゲームが参加可能か確認
      if (game.status !== 'waiting') {
        return res.status(400).json({ message: 'Game already started or ended' });
      }
      
      if (game.players.length >= game.maxPlayers) {
        return res.status(400).json({ message: 'Game is full' });
      }
      
      // プレイヤーが既に参加しているか確認
      if (game.players.includes(userId)) {
        return res.status(400).json({ message: 'Already joined this game' });
      }
      
      // プレイヤーを追加
      game.players.push(userId);
      
      // 最大プレイヤー数に達したらゲームを開始
      if (game.players.length === game.maxPlayers) {
        game.status = 'ready';
      }
      
      res.json({ game });
    } catch (err) {
      console.error('Error joining game:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   POST api/game/ready
  // @desc    Mark player as ready
  // @access  Private
  router.post('/ready', (req, res) => {
    try {
      const { userId, gameId, isReady } = req.body;
      
      // ゲームを検索
      const gameIndex = games.findIndex(game => game.id === gameId);
      if (gameIndex === -1) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      const game = games[gameIndex];
      
      // プレイヤーがゲームに参加しているか確認
      if (!game.players.includes(userId)) {
        return res.status(400).json({ message: 'Not a player in this game' });
      }
      
      // プレイヤーの準備状態を更新
      if (!game.readyPlayers) {
        game.readyPlayers = [];
      }
      
      if (isReady && !game.readyPlayers.includes(userId)) {
        game.readyPlayers.push(userId);
      } else if (!isReady && game.readyPlayers.includes(userId)) {
        game.readyPlayers = game.readyPlayers.filter(id => id !== userId);
      }
      
      // 全プレイヤーが準備完了したらゲームを開始
      if (game.readyPlayers.length === game.players.length && game.status === 'ready') {
        game.status = 'playing';
        game.startedAt = new Date();
        game.currentTurn = game.players[0];
        
        // 初期ブロック状態を設定（簡易版）
        game.blocks = Array(54).fill().map((_, i) => ({
          id: i,
          position: { x: 0, y: Math.floor(i / 3) * 0.6, z: 0 },
          removed: false
        }));
      }
      
      res.json({ game });
    } catch (err) {
      console.error('Error setting ready status:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   GET api/game/:id
  // @desc    Get game by ID
  // @access  Private
  router.get('/:id', (req, res) => {
    try {
      const gameId = req.params.id;
      
      // ゲームを検索
      const game = games.find(game => game.id === gameId);
      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      res.json({ game });
    } catch (err) {
      console.error('Error getting game:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   POST api/game/end
  // @desc    End a game
  // @access  Private
  router.post('/end', (req, res) => {
    try {
      const { gameId, winnerId, reason } = req.body;
      
      // ゲームを検索
      const gameIndex = games.findIndex(game => game.id === gameId);
      if (gameIndex === -1) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      const game = games[gameIndex];
      
      // ゲームを終了
      game.status = 'ended';
      game.endedAt = new Date();
      game.winner = winnerId;
      game.endReason = reason || 'normal';
      
      res.json({ game });
    } catch (err) {
      console.error('Error ending game:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};
