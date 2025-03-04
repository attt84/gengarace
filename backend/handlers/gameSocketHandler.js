// JengaRace - Game Socket Handler
const { v4: uuidv4 } = require('uuid');

// Game rooms storage
const gameRooms = {};

// Socket.IO handler for JengaRace game
module.exports = function(io) {
    console.log('Setting up Jenga Race game socket handlers');
    
    // Handle socket connections
    io.on('connection', (socket) => {
        console.log('Player connected:', socket.id);
        
        // Create a new room
        socket.on('create_room', (data) => {
            try {
                const { playerName } = data;
                const roomId = uuidv4().substring(0, 8); // Generate shorter, user-friendly room ID
                const playerId = socket.id;
                
                console.log(`Creating room ${roomId} for player ${playerName} (${playerId})`);
                
                // Join the socket to the room
                socket.join(roomId);
                
                // Initialize room data
                gameRooms[roomId] = {
                    id: roomId,
                    players: [{
                        id: playerId,
                        name: playerName,
                        isReady: false,
                        isHost: true
                    }],
                    gameState: {
                        status: 'waiting', // waiting, playing, ended
                        currentTurn: null,
                        blocksRemoved: 0,
                        towerState: [],
                        startTime: null,
                        endTime: null
                    },
                    settings: {
                        maxPlayers: 2,
                        towerHeight: 10 // Number of levels
                    }
                };
                
                // Send room created confirmation to the client
                socket.emit('room_created', {
                    roomId,
                    players: gameRooms[roomId].players,
                    isHost: true
                });
                
                console.log(`Room ${roomId} created successfully`);
            } catch (error) {
                console.error('Error creating room:', error);
                socket.emit('error', { message: 'Failed to create room' });
            }
        });
        
        // Join an existing room
        socket.on('join_room', (data) => {
            try {
                const { roomId, playerName } = data;
                const playerId = socket.id;
                
                console.log(`Player ${playerName} (${playerId}) attempting to join room ${roomId}`);
                
                // Check if the room exists
                if (!gameRooms[roomId]) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }
                
                // Check if the room is full
                if (gameRooms[roomId].players.length >= gameRooms[roomId].settings.maxPlayers) {
                    socket.emit('error', { message: 'Room is full' });
                    return;
                }
                
                // Check if the game is already in progress
                if (gameRooms[roomId].gameState.status === 'playing') {
                    socket.emit('error', { message: 'Game already in progress' });
                    return;
                }
                
                // Join the socket to the room
                socket.join(roomId);
                
                // Add player to the room
                gameRooms[roomId].players.push({
                    id: playerId,
                    name: playerName,
                    isReady: false,
                    isHost: false
                });
                
                // Send join confirmation to the new player
                socket.emit('room_joined', {
                    roomId,
                    players: gameRooms[roomId].players,
                    isHost: false
                });
                
                // Notify others in the room
                socket.to(roomId).emit('player_joined', {
                    roomId,
                    playerName,
                    playerId,
                    players: gameRooms[roomId].players
                });
                
                console.log(`Player ${playerName} joined room ${roomId} successfully`);
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });
        
        // Player ready status change
        socket.on('player_ready', (data) => {
            try {
                const { roomId } = data;
                const playerId = socket.id;
                
                console.log(`Player ${playerId} toggling ready status in room ${roomId}`);
                
                // Check if the room exists
                if (!gameRooms[roomId]) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }
                
                // Find player in the room
                const playerIndex = gameRooms[roomId].players.findIndex(p => p.id === playerId);
                if (playerIndex === -1) {
                    socket.emit('error', { message: 'Player not in room' });
                    return;
                }
                
                // Toggle ready status
                gameRooms[roomId].players[playerIndex].isReady = !gameRooms[roomId].players[playerIndex].isReady;
                const isReady = gameRooms[roomId].players[playerIndex].isReady;
                const playerName = gameRooms[roomId].players[playerIndex].name;
                
                // Notify all players in the room
                io.to(roomId).emit('player_ready', {
                    roomId,
                    playerId,
                    playerName,
                    isReady,
                    players: gameRooms[roomId].players,
                    allReady: gameRooms[roomId].players.every(p => p.isReady)
                });
                
                console.log(`Player ${playerName} set ready status to ${isReady}`);
                
                // Check if all players are ready and there are enough players to start
                const allReady = gameRooms[roomId].players.every(p => p.isReady);
                const enoughPlayers = gameRooms[roomId].players.length >= 2;
                
                if (allReady && enoughPlayers && gameRooms[roomId].gameState.status === 'waiting') {
                    // Find the host player
                    const hostPlayer = gameRooms[roomId].players.find(p => p.isHost);
                    
                    // If this is the host player, automatically start the game
                    if (hostPlayer && hostPlayer.id === playerId) {
                        console.log(`All players ready in room ${roomId}, starting game automatically`);
                        startGame(roomId);
                    }
                }
            } catch (error) {
                console.error('Error toggling ready status:', error);
                socket.emit('error', { message: 'Failed to update ready status' });
            }
        });
        
        // Start game (host only)
        socket.on('start_game', (data) => {
            try {
                const { roomId } = data;
                const playerId = socket.id;
                
                console.log(`Player ${playerId} attempting to start game in room ${roomId}`);
                
                // Check if the room exists
                if (!gameRooms[roomId]) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }
                
                // Check if the player is the host
                const player = gameRooms[roomId].players.find(p => p.id === playerId);
                if (!player || !player.isHost) {
                    socket.emit('error', { message: 'Only the host can start the game' });
                    return;
                }
                
                // Start the game
                startGame(roomId);
            } catch (error) {
                console.error('Error starting game:', error);
                socket.emit('error', { message: 'Failed to start game' });
            }
        });
        
        // Block removed event
        socket.on('block_removed', (data) => {
            try {
                const { roomId, blockIndex, impulse } = data;
                const playerId = socket.id;
                
                console.log(`Player ${playerId} removed block ${blockIndex} in room ${roomId}`);
                
                // Check if the room exists
                if (!gameRooms[roomId]) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }
                
                // Check if the game is in progress
                if (gameRooms[roomId].gameState.status !== 'playing') {
                    socket.emit('error', { message: 'Game not in progress' });
                    return;
                }
                
                // Check if it's the player's turn
                const playerIndex = gameRooms[roomId].players.findIndex(p => p.id === playerId);
                if (playerIndex === -1) {
                    socket.emit('error', { message: 'Player not in room' });
                    return;
                }
                
                const player = gameRooms[roomId].players[playerIndex];
                if (gameRooms[roomId].gameState.currentTurn !== playerIndex) {
                    socket.emit('error', { message: 'Not your turn' });
                    return;
                }
                
                // Update game state
                gameRooms[roomId].gameState.blocksRemoved++;
                
                // Change turn to next player
                const nextPlayerIndex = (playerIndex + 1) % gameRooms[roomId].players.length;
                gameRooms[roomId].gameState.currentTurn = nextPlayerIndex;
                
                // Notify all players in the room
                io.to(roomId).emit('block_removed', {
                    roomId,
                    blockIndex,
                    impulse,
                    playerId,
                    playerName: player.name,
                    blocksRemoved: gameRooms[roomId].gameState.blocksRemoved,
                    nextTurn: nextPlayerIndex,
                    nextPlayerName: gameRooms[roomId].players[nextPlayerIndex].name
                });
                
                console.log(`Block removal processed, next turn: ${gameRooms[roomId].players[nextPlayerIndex].name}`);
            } catch (error) {
                console.error('Error processing block removal:', error);
                socket.emit('error', { message: 'Failed to process block removal' });
            }
        });
        
        // Tower state update (sync physics)
        socket.on('tower_state', (data) => {
            try {
                const { roomId, blocks } = data;
                
                // Check if the room exists
                if (!gameRooms[roomId]) {
                    return;
                }
                
                // Check if the game is in progress
                if (gameRooms[roomId].gameState.status !== 'playing') {
                    return;
                }
                
                // Update tower state
                gameRooms[roomId].gameState.towerState = blocks;
                
                // Broadcast to other players in the room
                socket.to(roomId).emit('tower_state', {
                    blocks
                });
            } catch (error) {
                console.error('Error updating tower state:', error);
            }
        });
        
        // Tower collapsed event
        socket.on('tower_collapsed', (data) => {
            try {
                const { roomId } = data;
                const playerId = socket.id;
                
                console.log(`Tower collapsed in room ${roomId}, reported by player ${playerId}`);
                
                // Check if the room exists
                if (!gameRooms[roomId]) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }
                
                // Check if the game is in progress
                if (gameRooms[roomId].gameState.status !== 'playing') {
                    socket.emit('error', { message: 'Game not in progress' });
                    return;
                }
                
                // Find the current player
                const playerIndex = gameRooms[roomId].players.findIndex(p => p.id === playerId);
                if (playerIndex === -1) {
                    socket.emit('error', { message: 'Player not in room' });
                    return;
                }
                
                // End the game
                endGame(roomId, playerIndex);
            } catch (error) {
                console.error('Error processing tower collapse:', error);
                socket.emit('error', { message: 'Failed to process tower collapse' });
            }
        });
        
        // Chat message
        socket.on('chat_message', (data) => {
            try {
                const { roomId, message } = data;
                const playerId = socket.id;
                
                // Check if the room exists (allow lobby chat)
                const chatRoomId = roomId || 'lobby';
                
                // Find player name
                let playerName = 'Anonymous';
                if (roomId && gameRooms[roomId]) {
                    const player = gameRooms[roomId].players.find(p => p.id === playerId);
                    if (player) {
                        playerName = player.name;
                    }
                }
                
                console.log(`Chat message from ${playerName} in ${chatRoomId}: ${message}`);
                
                // Broadcast the message to all players in the room
                io.to(chatRoomId).emit('chat_message', {
                    playerId,
                    playerName,
                    message,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error sending chat message:', error);
                socket.emit('error', { message: 'Failed to send chat message' });
            }
        });
        
        // Leave room
        socket.on('leave_room', (data) => {
            try {
                const { roomId } = data;
                const playerId = socket.id;
                
                handlePlayerLeave(socket, roomId, playerId);
            } catch (error) {
                console.error('Error leaving room:', error);
                socket.emit('error', { message: 'Failed to leave room' });
            }
        });
        
        // Disconnect
        socket.on('disconnect', () => {
            try {
                const playerId = socket.id;
                console.log(`Player disconnected: ${playerId}`);
                
                // Find all rooms the player is in
                for (const roomId in gameRooms) {
                    const playerIndex = gameRooms[roomId].players.findIndex(p => p.id === playerId);
                    if (playerIndex !== -1) {
                        handlePlayerLeave(socket, roomId, playerId);
                    }
                }
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    });
    
    // Helper functions
    function startGame(roomId) {
        try {
            if (!gameRooms[roomId]) {
                return;
            }
            
            console.log(`Starting game in room ${roomId}`);
            
            // Update game state
            gameRooms[roomId].gameState.status = 'playing';
            gameRooms[roomId].gameState.startTime = Date.now();
            gameRooms[roomId].gameState.blocksRemoved = 0;
            
            // Set the first player's turn
            gameRooms[roomId].gameState.currentTurn = 0;
            
            // Notify all players in the room
            io.to(roomId).emit('game_started', {
                roomId,
                status: 'playing',
                currentTurn: 0,
                currentPlayerName: gameRooms[roomId].players[0].name,
                players: gameRooms[roomId].players
            });
            
            console.log(`Game started in room ${roomId}, first turn: ${gameRooms[roomId].players[0].name}`);
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }
    
    function endGame(roomId, loserIndex) {
        try {
            if (!gameRooms[roomId]) {
                return;
            }
            
            console.log(`Ending game in room ${roomId}, loser index: ${loserIndex}`);
            
            // Update game state
            gameRooms[roomId].gameState.status = 'ended';
            gameRooms[roomId].gameState.endTime = Date.now();
            
            // Reset ready status for all players
            gameRooms[roomId].players.forEach(player => {
                player.isReady = false;
            });
            
            // Find the winner (everyone except the loser)
            const winners = gameRooms[roomId].players
                .filter((_, index) => index !== loserIndex)
                .map(p => ({ id: p.id, name: p.name }));
                
            // Get loser information
            const loser = gameRooms[roomId].players[loserIndex];
            
            // Notify all players in the room
            io.to(roomId).emit('game_over', {
                roomId,
                winners,
                loser: { id: loser.id, name: loser.name },
                blocksRemoved: gameRooms[roomId].gameState.blocksRemoved,
                gameTime: gameRooms[roomId].gameState.endTime - gameRooms[roomId].gameState.startTime
            });
            
            console.log(`Game ended in room ${roomId}, winner: ${winners.map(w => w.name).join(', ')}`);
        } catch (error) {
            console.error('Error ending game:', error);
        }
    }
    
    function handlePlayerLeave(socket, roomId, playerId) {
        try {
            if (!gameRooms[roomId]) {
                return;
            }
            
            // Find player in the room
            const playerIndex = gameRooms[roomId].players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return;
            }
            
            const player = gameRooms[roomId].players[playerIndex];
            console.log(`Player ${player.name} leaving room ${roomId}`);
            
            // Remove player from the room
            gameRooms[roomId].players.splice(playerIndex, 1);
            
            // Leave the socket room
            socket.leave(roomId);
            
            // If the game is in progress, end it
            if (gameRooms[roomId].gameState.status === 'playing') {
                endGame(roomId, playerIndex);
            }
            
            // If the room is empty, delete it
            if (gameRooms[roomId].players.length === 0) {
                console.log(`Deleting empty room ${roomId}`);
                delete gameRooms[roomId];
                return;
            }
            
            // If the host left, assign a new host
            if (player.isHost && gameRooms[roomId].players.length > 0) {
                gameRooms[roomId].players[0].isHost = true;
                console.log(`New host assigned in room ${roomId}: ${gameRooms[roomId].players[0].name}`);
            }
            
            // Notify remaining players
            io.to(roomId).emit('player_left', {
                roomId,
                playerId,
                playerName: player.name,
                players: gameRooms[roomId].players
            });
            
            console.log(`Player ${player.name} successfully left room ${roomId}`);
        } catch (error) {
            console.error('Error handling player leave:', error);
        }
    }
    
    return {
        // Expose methods for external use if needed
        getGameRooms: () => gameRooms
    };
};
