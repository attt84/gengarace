/**
 * Game Service for Jenga Race
 * Handles game logic, matchmaking, and Socket.io communication
 */

const GameService = {
  // Socket.io connection
  socket: null,
  
  // Game state
  gameState: {
    inQueue: false,
    inGame: false,
    gameId: null,
    players: [],
    currentTurn: null,
    blocks: []
  },
  
  // Initialize game service
  init: () => {
    // Connect to Socket.io server
    GameService.socket = io('http://localhost:3000');
    
    // Set up event listeners
    GameService.setupSocketListeners();
    GameService.setupUIListeners();
    
    console.log('Game service initialized');
  },
  
  // Set up Socket.io event listeners
  setupSocketListeners: () => {
    const socket = GameService.socket;
    
    // Connection events
    socket.on('connect', () => {
      console.log('Connected to game server');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      GameService.gameState.inGame = false;
      GameService.gameState.inQueue = false;
      GameService.updateGameUI();
    });
    
    // Game events
    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      GameService.gameState.players = data.players;
      GameService.updateGameUI();
    });
    
    socket.on('gameStarted', (gameState) => {
      console.log('Game started:', gameState);
      GameService.gameState.inQueue = false;
      GameService.gameState.inGame = true;
      GameService.gameState.blocks = gameState.blocks;
      GameService.gameState.currentTurn = gameState.currentTurn;
      
      // Initialize Unity game (placeholder)
      GameService.initializeUnityGame();
      
      GameService.updateGameUI();
    });
    
    socket.on('blockMoved', (data) => {
      console.log('Block moved:', data);
      // Update block position in Unity
      if (window.unityInstance) {
        window.unityInstance.SendMessage('GameController', 'UpdateBlockPosition', 
          JSON.stringify({ blockId: data.blockId, position: data.position }));
      }
    });
    
    socket.on('turnChanged', (data) => {
      console.log('Turn changed:', data);
      GameService.gameState.currentTurn = data.currentPlayer;
      
      // Update turn in Unity
      if (window.unityInstance) {
        window.unityInstance.SendMessage('GameController', 'ChangeTurn', 
          JSON.stringify({ currentPlayer: data.currentPlayer }));
      }
      
      GameService.updateGameUI();
    });
    
    socket.on('gameEnded', (data) => {
      console.log('Game ended:', data);
      GameService.gameState.inGame = false;
      
      // Show game results
      const currentUser = AuthService.getCurrentUser();
      const isWinner = currentUser && data.winners.includes(currentUser._id);
      
      alert(isWinner ? 'You won!' : 'You lost!');
      
      // Reset game state
      GameService.resetGame();
    });
    
    // Chat events
    socket.on('chat message', (data) => {
      const chatMessages = document.getElementById('chat-messages');
      const messageElement = document.createElement('div');
      messageElement.classList.add('mb-2');
      
      // Check if message is from current user
      const currentUser = AuthService.getCurrentUser();
      const isCurrentUser = currentUser && data.userId === currentUser._id;
      
      messageElement.classList.add(isCurrentUser ? 'text-end' : 'text-start');
      
      messageElement.innerHTML = `
        <small class="text-muted">${isCurrentUser ? 'You' : data.userId}</small>
        <div class="p-2 rounded ${isCurrentUser ? 'bg-primary text-white' : 'bg-light'}">
          ${data.message}
        </div>
      `;
      
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  },
  
  // Set up UI event listeners
  setupUIListeners: () => {
    // Join queue button
    document.getElementById('join-queue-btn').addEventListener('click', () => {
      if (!AuthService.isAuthenticated()) {
        alert('Please login to join the queue');
        UIService.showSection('auth-section');
        return;
      }
      
      GameService.joinQueue();
    });
    
    // Leave queue button
    document.getElementById('leave-queue-btn').addEventListener('click', () => {
      GameService.leaveQueue();
    });
    
    // Send chat message
    document.getElementById('sendBtn').addEventListener('click', () => {
      const messageInput = document.getElementById('messageInput');
      const message = messageInput.value.trim();
      
      if (message && GameService.gameState.gameId) {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
          GameService.socket.emit('chat message', GameService.gameState.gameId, currentUser._id, message);
          messageInput.value = '';
        }
      }
    });
    
    // Send message on Enter key
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('sendBtn').click();
      }
    });
  },
  
  // Join matchmaking queue
  joinQueue: async () => {
    try {
      GameService.gameState.inQueue = true;
      GameService.updateGameUI();
      
      const response = await ApiService.matchmaking.joinQueue();
      console.log('Queue response:', response);
      
      // Check if match was found immediately
      if (response.match) {
        GameService.gameState.inQueue = false;
        GameService.gameState.inGame = true;
        GameService.gameState.gameId = response.match.gameId;
        
        // Join the game room
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
          GameService.socket.emit('joinGame', response.match.gameId, currentUser._id);
        }
      } else {
        // Update queue position
        document.getElementById('queue-position').textContent = response.position || '...';
        document.getElementById('wait-time').textContent = Math.round((response.estimatedWaitTime || 30000) / 1000);
        
        // Start polling for queue status
        GameService.startQueueStatusPolling();
      }
    } catch (error) {
      console.error('Failed to join queue:', error);
      GameService.gameState.inQueue = false;
      GameService.updateGameUI();
      alert('Failed to join matchmaking queue');
    }
  },
  
  // Leave matchmaking queue
  leaveQueue: async () => {
    try {
      await ApiService.matchmaking.leaveQueue();
      GameService.gameState.inQueue = false;
      GameService.updateGameUI();
      
      // Stop polling
      if (GameService.queueStatusInterval) {
        clearInterval(GameService.queueStatusInterval);
        GameService.queueStatusInterval = null;
      }
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  },
  
  // Start polling for queue status
  queueStatusInterval: null,
  startQueueStatusPolling: () => {
    // Clear existing interval
    if (GameService.queueStatusInterval) {
      clearInterval(GameService.queueStatusInterval);
    }
    
    // Poll every 3 seconds
    GameService.queueStatusInterval = setInterval(async () => {
      if (!GameService.gameState.inQueue) {
        clearInterval(GameService.queueStatusInterval);
        GameService.queueStatusInterval = null;
        return;
      }
      
      try {
        const status = await ApiService.matchmaking.getStatus();
        
        if (status.inQueue) {
          // Update UI with queue position
          document.getElementById('queue-position').textContent = status.position;
          document.getElementById('wait-time').textContent = Math.round(status.estimatedWaitTime / 1000);
        } else {
          // No longer in queue, might have found a match
          GameService.gameState.inQueue = false;
          GameService.updateGameUI();
          clearInterval(GameService.queueStatusInterval);
          GameService.queueStatusInterval = null;
        }
      } catch (error) {
        console.error('Failed to get queue status:', error);
      }
    }, 3000);
  },
  
  // Initialize Unity game (placeholder)
  initializeUnityGame: () => {
    // In a real implementation, this would load the Unity WebGL player
    document.getElementById('game-placeholder').classList.add('d-none');
    document.getElementById('unity-container').classList.remove('d-none');
    
    // Placeholder for Unity loading
    document.getElementById('unity-container').innerHTML = `
      <div class="p-5">
        <h3>Game Loaded!</h3>
        <p>This is a placeholder for the Unity WebGL game.</p>
        <p>Current turn: <span id="current-turn">Player 1</span></p>
        <div class="mt-4">
          <button class="btn btn-primary me-2" id="move-block-btn">Move Block</button>
          <button class="btn btn-danger" id="end-game-btn">End Game</button>
        </div>
      </div>
    `;
    
    // Add event listeners for placeholder buttons
    document.getElementById('move-block-btn').addEventListener('click', () => {
      // Simulate block movement
      const blockId = Math.floor(Math.random() * GameService.gameState.blocks.length);
      const newPosition = {
        x: Math.random() * 2 - 1,
        y: Math.random() * 5,
        z: Math.random() * 2 - 1
      };
      
      GameService.socket.emit('moveBlock', GameService.gameState.gameId, blockId, newPosition);
    });
    
    document.getElementById('end-game-btn').addEventListener('click', () => {
      // Simulate game end
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        GameService.socket.emit('towerCollapsed', GameService.gameState.gameId, currentUser._id);
      }
    });
  },
  
  // Update game UI based on current state
  updateGameUI: () => {
    const gamePlaceholder = document.getElementById('game-placeholder');
    const queueStatus = document.getElementById('queue-status');
    const unityContainer = document.getElementById('unity-container');
    
    if (GameService.gameState.inQueue) {
      // Show queue status
      gamePlaceholder.classList.add('d-none');
      queueStatus.classList.remove('d-none');
      unityContainer.classList.add('d-none');
    } else if (GameService.gameState.inGame) {
      // Show game
      gamePlaceholder.classList.add('d-none');
      queueStatus.classList.add('d-none');
      unityContainer.classList.remove('d-none');
      
      // Update turn display if available
      const turnDisplay = document.getElementById('current-turn');
      if (turnDisplay) {
        const currentUser = AuthService.getCurrentUser();
        const isCurrentTurn = currentUser && GameService.gameState.currentTurn === currentUser._id;
        
        turnDisplay.textContent = isCurrentTurn ? 'Your Turn' : 'Opponent\'s Turn';
        turnDisplay.classList.toggle('text-success', isCurrentTurn);
        turnDisplay.classList.toggle('text-danger', !isCurrentTurn);
      }
    } else {
      // Show game placeholder
      gamePlaceholder.classList.remove('d-none');
      queueStatus.classList.add('d-none');
      unityContainer.classList.add('d-none');
    }
  },
  
  // Reset game state
  resetGame: () => {
    GameService.gameState.inQueue = false;
    GameService.gameState.inGame = false;
    GameService.gameState.gameId = null;
    GameService.gameState.players = [];
    GameService.gameState.currentTurn = null;
    GameService.gameState.blocks = [];
    
    GameService.updateGameUI();
  }
};

// Export the Game service
window.GameService = GameService;

// game.js - Handles game logic and communication with the server

class JengaGame {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerId = null;
        this.players = [];
        this.currentTurn = null;
        this.gameStatus = 'waiting';
        this.selectedBlock = null;
        this.tower = null;
        this.eventListeners = {};
    }

    // Initialize the game
    init(socket, playerId) {
        this.socket = socket;
        this.playerId = playerId;
        this.setupSocketListeners();
        console.log('Game initialized with player ID:', playerId);
    }

    // Set up socket event listeners
    setupSocketListeners() {
        if (!this.socket) return;

        // Player joined event
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.players = data.players;
            this.gameStatus = data.gameState.status;
            this.triggerEvent('playerJoined', data);
        });

        // Game started event
        this.socket.on('gameStarted', (gameState) => {
            console.log('Game started:', gameState);
            this.gameStatus = gameState.status;
            this.currentTurn = gameState.currentTurn;
            this.tower = gameState.blocks;
            this.triggerEvent('gameStarted', gameState);
        });

        // Block moved event
        this.socket.on('blockMoved', (data) => {
            console.log('Block moved:', data);
            if (this.tower) {
                const block = this.tower.find(b => b.id === data.blockId);
                if (block) {
                    block.position = data.position;
                    this.triggerEvent('blockMoved', data);
                }
            }
        });

        // Block removed event
        this.socket.on('blockRemoved', (data) => {
            console.log('Block removed:', data);
            if (this.tower) {
                const block = this.tower.find(b => b.id === data.blockId);
                if (block) {
                    block.removed = true;
                    this.currentTurn = data.nextTurn;
                    this.triggerEvent('blockRemoved', data);
                }
            }
        });

        // Game ended event
        this.socket.on('gameEnded', (data) => {
            console.log('Game ended:', data);
            this.gameStatus = 'ended';
            this.triggerEvent('gameEnded', data);
        });

        // Chat message event
        this.socket.on('chatMessage', (data) => {
            console.log('Chat message:', data);
            this.triggerEvent('chatMessage', data);
        });

        // Player left event
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            this.players = data.players;
            this.triggerEvent('playerLeft', data);
        });
    }

    // Create a new game
    createGame() {
        if (!this.socket || !this.playerId) {
            console.error('Socket or player ID not initialized');
            return;
        }

        // Generate a random room ID
        const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
        this.gameId = roomId;

        // Join the room
        this.socket.emit('joinGame', roomId, this.playerId);
        console.log('Created and joined game:', roomId);

        return roomId;
    }

    // Join an existing game
    joinGame(gameId) {
        if (!this.socket || !this.playerId) {
            console.error('Socket or player ID not initialized');
            return;
        }

        this.gameId = gameId;
        this.socket.emit('joinGame', gameId, this.playerId);
        console.log('Joined game:', gameId);
    }

    // Mark player as ready
    setReady(isReady) {
        if (!this.socket || !this.gameId || !this.playerId) {
            console.error('Game not properly initialized');
            return;
        }

        this.socket.emit('playerReady', this.gameId, this.playerId, isReady);
        console.log('Player ready status set to:', isReady);
    }

    // Move a block
    moveBlock(blockId, position) {
        if (!this.socket || !this.gameId) {
            console.error('Game not properly initialized');
            return;
        }

        this.socket.emit('moveBlock', this.gameId, blockId, position);
        console.log('Moving block:', blockId, 'to position:', position);
    }

    // Remove a block
    removeBlock(blockId) {
        if (!this.socket || !this.gameId || !this.playerId) {
            console.error('Game not properly initialized');
            return;
        }

        // Only allow if it's the player's turn
        if (this.currentTurn !== this.playerId) {
            console.error('Not your turn');
            return;
        }

        this.socket.emit('removeBlock', this.gameId, blockId, this.playerId);
        console.log('Removing block:', blockId);
    }

    // Report tower collapse
    reportTowerCollapse() {
        if (!this.socket || !this.gameId || !this.playerId) {
            console.error('Game not properly initialized');
            return;
        }

        this.socket.emit('towerCollapsed', this.gameId, this.playerId);
        console.log('Reporting tower collapse');
    }

    // Send a chat message
    sendChatMessage(message) {
        if (!this.socket || !this.gameId || !this.playerId) {
            console.error('Game not properly initialized');
            return;
        }

        this.socket.emit('chatMessage', this.gameId, this.playerId, message);
        console.log('Sending chat message:', message);
    }

    // Check if it's the player's turn
    isMyTurn() {
        return this.currentTurn === this.playerId;
    }

    // Get game status
    getGameStatus() {
        return {
            gameId: this.gameId,
            players: this.players,
            currentTurn: this.currentTurn,
            status: this.gameStatus,
            isMyTurn: this.isMyTurn()
        };
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }
}

// Export the game instance
const game = new JengaGame();
