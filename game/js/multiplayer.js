// Jenga Race - Multiplayer Component
console.log('Multiplayer.js loaded successfully');

class MultiplayerManager {
    constructor(game) {
        console.log('MultiplayerManager initialized');
        this.game = game;
        this.socket = null;
        this.roomId = null;
        this.players = [];
        this.isConnected = false;
        this.isHost = false;
        this.playerId = null;
        this.playerName = 'Player';
        
        // DOM elements
        this.roomIdElement = document.getElementById('room-id');
        this.playerCountElement = document.getElementById('player-count');
        this.currentTurnElement = document.getElementById('current-turn');
        this.gameStatusElement = document.getElementById('game-status');
        this.chatMessagesElement = document.getElementById('chat-messages');
        this.chatFormElement = document.getElementById('chat-form');
        this.chatInputElement = document.getElementById('chat-input');
        this.readyBtnElement = document.getElementById('ready-btn');
        this.joinGameBtnElement = document.getElementById('join-game-btn');
        this.newGameBtnElement = document.getElementById('new-game-btn');
        
        // Initialize
        this.init();
    }
    
    init() {
        try {
            console.log('Initializing multiplayer connection');
            
            // Connect to Socket.IO server
            this.connectToServer();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Multiplayer initialization completed');
        } catch (error) {
            console.error('Multiplayer initialization failed:', error);
            
            // Show error notification on the page
            this.showConnectionError(error);
        }
    }
    
    connectToServer() {
        console.log('Connecting to server...');
        
        try {
            // Make sure Socket.IO is available
            if (typeof io === 'undefined') {
                console.error('Socket.IO not loaded');
                this.showConnectionError('Socket.IO not loaded');
                this.game.showNotification('Network connection failed: Socket.IO not loaded', 'error');
                return;
            }
            
            // Connect to the Socket.IO server
            console.log('Attempting to connect to Socket.IO server');
            
            // Use relative path instead of hardcoded URL for better compatibility
            // This will work regardless of server domain and port
            this.socket = io('/', {
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });
            
            // Connection event listeners
            this.socket.on('connect', () => {
                console.log('Connected to server with ID:', this.socket.id);
                this.isConnected = true;
                this.playerId = this.socket.id;
                
                // Update UI to show connected state
                this.updateConnectionStatus(true);
                
                // Show notification
                this.game.showNotification('Connected to multiplayer server');
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.isConnected = false;
                
                // Update UI to show disconnected state
                this.updateConnectionStatus(false);
                
                // Show error to user
                this.showConnectionError(error);
                this.game.showNotification('Failed to connect to multiplayer server', 'error');
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from server:', reason);
                this.isConnected = false;
                
                // Update UI
                this.updateConnectionStatus(false);
                
                // Show notification
                this.game.showNotification('Disconnected from multiplayer server', 'warning');
            });
            
            console.log('Socket.IO connection setup complete');
        } catch (error) {
            console.error('Error setting up Socket.IO connection:', error);
            this.showConnectionError(error);
        }
    }
    
    showConnectionError(error) {
        console.error('Multiplayer connection error:', error);
        
        // Create error display on page
        const errorDisplay = document.createElement('div');
        errorDisplay.style.position = 'fixed';
        errorDisplay.style.bottom = '10px';
        errorDisplay.style.left = '10px';
        errorDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        errorDisplay.style.color = 'white';
        errorDisplay.style.padding = '10px';
        errorDisplay.style.borderRadius = '5px';
        errorDisplay.style.zIndex = '9999';
        errorDisplay.style.maxWidth = '80%';
        errorDisplay.style.fontFamily = 'monospace';
        errorDisplay.innerHTML = `<strong>Socket.IO Error:</strong><br>${error.toString()}`;
        
        document.body.appendChild(errorDisplay);
        
        // Remove after 10 seconds
        setTimeout(() => {
            if (errorDisplay.parentNode) {
                errorDisplay.parentNode.removeChild(errorDisplay);
            }
        }, 10000);
    }
    
    updateConnectionStatus(isConnected) {
        // Update UI elements to reflect connection status
        if (this.gameStatusElement) {
            if (isConnected) {
                this.gameStatusElement.textContent = 'Connected to server';
                this.gameStatusElement.style.color = '#4CAF50';
            } else {
                this.gameStatusElement.textContent = 'Disconnected';
                this.gameStatusElement.style.color = '#F44336';
            }
        }
        
        console.log('Connection status updated:', isConnected ? 'Connected' : 'Disconnected');
    }
    
    setupEventListeners() {
        console.log('Setting up multiplayer event listeners');
        
        // New Game button
        this.newGameBtnElement.addEventListener('click', () => {
            this.createNewGame();
        });
        
        // Join Game button
        this.joinGameBtnElement.addEventListener('click', () => {
            const roomId = prompt('Enter Room ID:');
            if (roomId) {
                this.joinGame(roomId);
            }
        });
        
        // Ready button
        this.readyBtnElement.addEventListener('click', () => {
            this.toggleReady();
        });
        
        // Chat form
        this.chatFormElement.addEventListener('submit', (event) => {
            event.preventDefault();
            this.sendChatMessage();
        });
    }
    
    createNewGame() {
        console.log('Creating new game room');
        if (!this.isConnected) {
            this.game.showNotification('Not connected to server');
            return;
        }
        
        this.socket.emit('create_room', {
            playerName: this.playerName
        });
    }
    
    joinGame(roomId) {
        console.log('Joining game room:', roomId);
        if (!this.isConnected) {
            this.game.showNotification('Not connected to server');
            return;
        }
        
        this.socket.emit('join_room', {
            roomId: roomId,
            playerName: this.playerName
        });
    }
    
    toggleReady() {
        console.log('Toggling ready state');
        if (!this.isConnected || !this.roomId) {
            this.game.showNotification('Not in a game room');
            return;
        }
        
        this.socket.emit('player_ready', {
            roomId: this.roomId,
            playerId: this.playerId
        });
    }
    
    sendChatMessage() {
        const message = this.chatInputElement.value.trim();
        if (!message || !this.isConnected) return;
        
        console.log('Sending chat message:', message);
        
        this.socket.emit('chat_message', {
            roomId: this.roomId || 'lobby',
            message: message,
            playerName: this.playerName
        });
        
        // Clear input field
        this.chatInputElement.value = '';
    }
    
    leaveGame() {
        console.log('Leaving game room');
        if (!this.isConnected || !this.roomId) return;
        
        this.socket.emit('leave_room', {
            roomId: this.roomId,
            playerId: this.playerId
        });
        
        this.resetRoomState();
    }
    
    resetRoomState() {
        console.log('Resetting room state');
        this.roomId = null;
        this.players = [];
        this.isHost = false;
        
        // Update UI
        this.roomIdElement.textContent = 'Lobby';
        this.playerCountElement.textContent = '0/2';
        this.currentTurnElement.textContent = '-';
        this.gameStatusElement.textContent = 'Waiting';
        
        // Reset game state
        this.game.resetGame();
    }
    
    // Event handlers
    handleRoomCreated(data) {
        console.log('Room created:', data);
        this.roomId = data.roomId;
        this.isHost = true;
        this.players = data.players;
        
        // Update UI
        this.roomIdElement.textContent = data.roomId;
        this.playerCountElement.textContent = `${data.players.length}/2`;
        this.gameStatusElement.textContent = 'Waiting for players';
        this.readyBtnElement.disabled = false;
        
        // Show notification
        this.game.showNotification(`Room created! Share ID: ${data.roomId}`);
    }
    
    handleRoomJoined(data) {
        console.log('Room joined:', data);
        this.roomId = data.roomId;
        this.players = data.players;
        
        // Update UI
        this.roomIdElement.textContent = data.roomId;
        this.playerCountElement.textContent = `${data.players.length}/2`;
        this.gameStatusElement.textContent = 'Waiting for players';
        this.readyBtnElement.disabled = false;
        
        // Show notification
        this.game.showNotification(`Joined room: ${data.roomId}`);
    }
    
    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        this.players = data.players;
        
        // Update UI
        this.playerCountElement.textContent = `${data.players.length}/2`;
        
        // Add chat message
        this.addChatMessage('System', `${data.playerName} joined the game`);
        
        // Show notification
        this.game.showNotification(`${data.playerName} joined the game`);
    }
    
    handlePlayerLeft(data) {
        console.log('Player left:', data);
        this.players = data.players;
        
        // Update UI
        this.playerCountElement.textContent = `${data.players.length}/2`;
        
        // Add chat message
        this.addChatMessage('System', `${data.playerName} left the game`);
        
        // Show notification
        this.game.showNotification(`${data.playerName} left the game`);
    }
    
    handleGameStarted(data) {
        console.log('Game started:', data);
        
        // Update UI
        this.gameStatusElement.textContent = 'In Progress';
        this.currentTurnElement.textContent = data.currentTurn;
        
        // Update game state
        this.game.isGameStarted = true;
        this.game.gameMode = 'multi';
        document.getElementById('game-mode').textContent = 'Multiplayer';
        document.getElementById('crosshair').style.display = 'block';
        
        // Add chat message
        this.addChatMessage('System', 'Game started!');
        
        // Show notification
        this.game.showNotification('Multiplayer game started!');
    }
    
    handleTurnChange(data) {
        console.log('Turn changed:', data);
        
        // Update UI
        this.currentTurnElement.textContent = data.currentTurn;
        
        // Show notification
        if (data.currentTurn === this.playerName) {
            this.game.showNotification('Your turn!');
        } else {
            this.game.showNotification(`${data.currentTurn}'s turn`);
        }
    }
    
    handleBlockRemoved(data) {
        console.log('Block removed:', data);
        
        // Find the block in the tower and apply impulse
        if (data.blockIndex >= 0 && data.blockIndex < this.game.tower.length) {
            const block = this.game.tower[data.blockIndex];
            
            // Apply impulse
            const impulse = new CANNON.Vec3(data.impulse.x, data.impulse.y, data.impulse.z);
            block.body.applyImpulse(impulse, block.body.position);
            
            // Update block count
            this.game.blocksRemoved++;
            document.getElementById('blocks-removed').textContent = this.game.blocksRemoved;
        }
    }
    
    handleTowerState(data) {
        console.log('Received tower state update');
        
        // Update tower blocks with received positions and rotations
        for (let i = 0; i < data.blocks.length && i < this.game.tower.length; i++) {
            const blockData = data.blocks[i];
            const block = this.game.tower[i];
            
            // Update position
            block.body.position.set(blockData.position.x, blockData.position.y, blockData.position.z);
            
            // Update rotation (quaternion)
            block.body.quaternion.set(
                blockData.quaternion.x,
                blockData.quaternion.y,
                blockData.quaternion.z,
                blockData.quaternion.w
            );
            
            // Update velocity
            block.body.velocity.set(blockData.velocity.x, blockData.velocity.y, blockData.velocity.z);
            
            // Update angular velocity
            block.body.angularVelocity.set(
                blockData.angularVelocity.x,
                blockData.angularVelocity.y,
                blockData.angularVelocity.z
            );
        }
    }
    
    handleGameOver(data) {
        console.log('Game over:', data);
        
        // Update UI
        this.gameStatusElement.textContent = 'Game Over';
        
        // Add chat message
        this.addChatMessage('System', `Game over! ${data.winner} wins!`);
        
        // Show notification
        this.game.showNotification(`Game over! ${data.winner} wins!`);
        
        // Reset game state
        setTimeout(() => {
            this.game.isGameStarted = false;
            document.getElementById('crosshair').style.display = 'none';
        }, 3000);
    }
    
    handleChatMessage(data) {
        console.log('Chat message received:', data);
        this.addChatMessage(data.playerName, data.message);
    }
    
    handlePlayerReady(data) {
        console.log('Player ready:', data);
        
        // Add chat message
        this.addChatMessage('System', `${data.playerName} is ready!`);
        
        // Show notification
        this.game.showNotification(`${data.playerName} is ready!`);
        
        // If all players are ready, start the game
        if (data.allReady && this.isHost) {
            this.startGame();
        }
    }
    
    startGame() {
        console.log('Starting multiplayer game');
        if (!this.isConnected || !this.roomId || !this.isHost) {
            return;
        }
        
        this.socket.emit('start_game', {
            roomId: this.roomId
        });
    }
    
    sendBlockRemoved(blockIndex, impulse) {
        console.log('Sending block removed event');
        if (!this.isConnected || !this.roomId) {
            return;
        }
        
        this.socket.emit('block_removed', {
            roomId: this.roomId,
            blockIndex: blockIndex,
            impulse: impulse
        });
    }
    
    // Helper methods
    addChatMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'chat-sender';
        senderSpan.textContent = sender + ': ';
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'chat-text';
        messageSpan.textContent = message;
        
        messageElement.appendChild(senderSpan);
        messageElement.appendChild(messageSpan);
        
        this.chatMessagesElement.appendChild(messageElement);
        
        // Scroll to bottom
        this.chatMessagesElement.scrollTop = this.chatMessagesElement.scrollHeight;
    }
    
    // Public methods exposed to the game
    setPlayerName(name) {
        this.playerName = name;
    }
    
    // Extension of game.js functions for multiplayer
    removeBlockMultiplayer(blockIndex, impulse) {
        // Send event to server
        this.sendBlockRemoved(blockIndex, impulse);
    }
    
    getTowerState() {
        // Get current state of all blocks for synchronization
        return this.game.tower.map(block => ({
            position: block.body.position,
            quaternion: block.body.quaternion,
            velocity: block.body.velocity,
            angularVelocity: block.body.angularVelocity
        }));
    }
}

// Export for use in other files
window.MultiplayerManager = MultiplayerManager;
