const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// ゲーム関連のエンドポイント
router.post('/start', (req, res) => {
  // ゲーム開始のロジックをここに実装
  res.json({ message: 'Game started.' });
});

router.post('/join', (req, res) => {
  // ゲーム参加のロジックをここに実装
  res.json({ message: 'Joined game.' });
});

// Game state storage (in-memory for now, would use DB in production)
const activeGames = {};
const gameHistory = [];

// @route   POST api/game/create
// @desc    Create a new game
// @access  Private
router.post('/create', auth, async (req, res) => {
  try {
    const { gameType, isPrivate, maxPlayers } = req.body;
    
    // Generate unique game ID
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Create game object
    const game = {
      id: gameId,
      createdBy: req.user.id,
      createdAt: Date.now(),
      gameType: gameType || 'standard',
      isPrivate: isPrivate || false,
      maxPlayers: maxPlayers || 2,
      players: [{ id: req.user.id, ready: false }],
      status: 'waiting',
      blocks: [],
      currentTurn: null,
      moves: [],
      winner: null,
      startedAt: null,
      endedAt: null
    };
    
    // Store game in active games
    activeGames[gameId] = game;
    
    res.json({ 
      message: 'Game created successfully', 
      gameId,
      game
    });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/game/join
// @desc    Join an existing game
// @access  Private
router.post('/join', auth, async (req, res) => {
  try {
    const { gameId } = req.body;
    
    // Check if game exists
    if (!activeGames[gameId]) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    const game = activeGames[gameId];
    
    // Check if game is joinable
    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game is already in progress or ended' });
    }
    
    // Check if game is full
    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: 'Game is full' });
    }
    
    // Check if player is already in the game
    if (game.players.some(player => player.id === req.user.id)) {
      return res.status(400).json({ message: 'You are already in this game' });
    }
    
    // Add player to game
    game.players.push({ id: req.user.id, ready: false });
    
    res.json({ 
      message: 'Joined game successfully', 
      game
    });
  } catch (err) {
    console.error('Error joining game:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/game/ready
// @desc    Set player ready status
// @access  Private
router.post('/ready', auth, async (req, res) => {
  try {
    const { gameId, ready } = req.body;
    
    // Check if game exists
    if (!activeGames[gameId]) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    const game = activeGames[gameId];
    
    // Check if player is in the game
    const playerIndex = game.players.findIndex(player => player.id === req.user.id);
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'You are not in this game' });
    }
    
    // Update player ready status
    game.players[playerIndex].ready = ready === undefined ? true : ready;
    
    // Check if all players are ready
    const allReady = game.players.every(player => player.ready);
    
    // Start game if all players are ready and there are enough players
    if (allReady && game.players.length >= 2) {
      game.status = 'playing';
      game.startedAt = Date.now();
      game.currentTurn = game.players[0].id;
      
      // Initialize blocks (simplified)
      game.blocks = Array(54).fill().map((_, i) => ({
        id: i,
        position: { x: 0, y: Math.floor(i / 3) * 0.6, z: 0 },
        removed: false
      }));
    }
    
    res.json({ 
      message: ready ? 'Player is ready' : 'Player is not ready', 
      game
    });
  } catch (err) {
    console.error('Error setting ready status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/game/move
// @desc    Make a move in the game
// @access  Private
router.post('/move', auth, async (req, res) => {
  try {
    const { gameId, blockId, position } = req.body;
    
    // Check if game exists
    if (!activeGames[gameId]) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    const game = activeGames[gameId];
    
    // Check if game is in progress
    if (game.status !== 'playing') {
      return res.status(400).json({ message: 'Game is not in progress' });
    }
    
    // Check if it's the player's turn
    if (game.currentTurn !== req.user.id) {
      return res.status(400).json({ message: 'Not your turn' });
    }
    
    // Check if block exists
    const blockIndex = game.blocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) {
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Update block position
    game.blocks[blockIndex].position = position;
    
    // Record move
    game.moves.push({
      playerId: req.user.id,
      blockId,
      position,
      timestamp: Date.now()
    });
    
    res.json({ 
      message: 'Move recorded', 
      game
    });
  } catch (err) {
    console.error('Error making move:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/game/remove-block
// @desc    Remove a block from the tower
// @access  Private
router.post('/remove-block', auth, async (req, res) => {
  try {
    const { gameId, blockId } = req.body;
    
    // Check if game exists
    if (!activeGames[gameId]) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    const game = activeGames[gameId];
    
    // Check if game is in progress
    if (game.status !== 'playing') {
      return res.status(400).json({ message: 'Game is not in progress' });
    }
    
    // Check if it's the player's turn
    if (game.currentTurn !== req.user.id) {
      return res.status(400).json({ message: 'Not your turn' });
    }
    
    // Check if block exists
    const blockIndex = game.blocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) {
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Mark block as removed
    game.blocks[blockIndex].removed = true;
    
    // Record move
    game.moves.push({
      playerId: req.user.id,
      blockId,
      action: 'remove',
      timestamp: Date.now()
    });
    
    // Change turn to next player
    const currentPlayerIndex = game.players.findIndex(player => player.id === req.user.id);
    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    game.currentTurn = game.players[nextPlayerIndex].id;
    
    res.json({ 
      message: 'Block removed', 
      game
    });
  } catch (err) {
    console.error('Error removing block:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/game/end
// @desc    End a game (tower collapsed)
// @access  Private
router.post('/end', auth, async (req, res) => {
  try {
    const { gameId } = req.body;
    
    // Check if game exists
    if (!activeGames[gameId]) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    const game = activeGames[gameId];
    
    // Check if game is in progress
    if (game.status !== 'playing') {
      return res.status(400).json({ message: 'Game is not in progress' });
    }
    
    // Check if player is in the game
    if (!game.players.some(player => player.id === req.user.id)) {
      return res.status(400).json({ message: 'You are not in this game' });
    }
    
    // End game
    game.status = 'ended';
    game.endedAt = Date.now();
    
    // Set winner (everyone except the player who caused collapse)
    game.winner = game.players
      .filter(player => player.id !== req.user.id)
      .map(player => player.id);
    
    // Move game to history
    gameHistory.push({ ...game });
    delete activeGames[gameId];
    
    // Update player stats
    try {
      // Update stats for winner(s)
      for (const winnerId of game.winner) {
        const winner = await User.findById(winnerId);
        if (winner) {
          winner.stats.gamesPlayed += 1;
          winner.stats.gamesWon += 1;
          
          // Calculate game duration in seconds
          const gameDuration = Math.floor((game.endedAt - game.startedAt) / 1000);
          
          // Update fastest win if applicable
          if (!winner.stats.fastestWin || gameDuration < winner.stats.fastestWin) {
            winner.stats.fastestWin = gameDuration;
          }
          
          await winner.save();
        }
      }
      
      // Update stats for loser
      const loser = await User.findById(req.user.id);
      if (loser) {
        loser.stats.gamesPlayed += 1;
        await loser.save();
      }
    } catch (err) {
      console.error('Error updating player stats:', err);
    }
    
    res.json({ 
      message: 'Game ended', 
      game
    });
  } catch (err) {
    console.error('Error ending game:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/game/:id
// @desc    Get game by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Check active games first
    if (activeGames[gameId]) {
      return res.json(activeGames[gameId]);
    }
    
    // Check game history
    const historicGame = gameHistory.find(game => game.id === gameId);
    if (historicGame) {
      return res.json(historicGame);
    }
    
    return res.status(404).json({ message: 'Game not found' });
  } catch (err) {
    console.error('Error getting game:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/game/user/history
// @desc    Get user's game history
// @access  Private
router.get('/user/history', auth, async (req, res) => {
  try {
    // Get user's games from history
    const userGames = gameHistory.filter(game => 
      game.players.some(player => player.id === req.user.id)
    );
    
    // Sort by date (newest first)
    userGames.sort((a, b) => b.endedAt - a.endedAt);
    
    res.json(userGames);
  } catch (err) {
    console.error('Error getting user game history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
