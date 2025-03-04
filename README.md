# Jenga Race Online Multiplayer Game

A real-time multiplayer physics-based Jenga game where players compete to remove blocks without toppling the tower.

## Project Overview

Jenga Race is a full-stack web application that allows players to:
- Create accounts and manage profiles
- Join matchmaking queues to find opponents
- Play real-time Jenga games with physics-based block manipulation
- Chat with opponents during gameplay
- Track statistics and climb the leaderboard

## Technical Stack

### Backend
- **Node.js** with Express for the server
- **Socket.io** for real-time communication
- **MongoDB** for data storage
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **Vanilla JavaScript** with modular architecture
- **Bootstrap** for responsive UI
- **Socket.io client** for real-time updates
- **Unity WebGL** for the game client (placeholder implemented)

## Features

### User Management
- User registration with email/password
- Login/logout functionality
- Profile creation and editing
- JWT-based authentication
- Password hashing with bcrypt

### Matchmaking System
- Skill-based player matching
- Queue management
- Dynamic skill range expansion
- Real-time match finding

### Game Mechanics
- Socket.io game room management
- Turn-based gameplay
- Block movement and removal
- Game state tracking
- Winner/loser determination

### Analytics
- Game statistics tracking
- Player performance metrics
- Leaderboards
- Usage analytics

## Project Structure

```
JengaRace/
├── backend/                # Node.js server
│   ├── middleware/         # Auth middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   └── server.js           # Main server file
├── frontend/               # Web client
│   ├── js/                 # JavaScript modules
│   │   ├── api.js          # API service
│   │   ├── auth.js         # Authentication service
│   │   ├── game.js         # Game service
│   │   ├── main.js         # Main entry point
│   │   └── ui.js           # UI service
│   ├── index.html          # Main HTML file
│   └── styles.css          # CSS styles
├── game/                   # Unity WebGL game client
│   └── index.html          # Game placeholder
├── .env                    # Environment variables
└── README.md               # Project documentation
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/attt84/gengarace.git
cd JengaRace
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/jengarace
JWT_SECRET=jenga_race_secret_key_2025
NODE_ENV=development
```

4. Start the server:
```bash
npm start
```

5. Open the application in your browser:
```
http://localhost:3000
```

## Development

### Backend API Endpoints

#### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get JWT token
- `GET /api/users/me` - Get current user profile

#### Game
- `POST /api/game/create` - Create a new game
- `POST /api/game/join` - Join an existing game
- `POST /api/game/ready` - Set player ready status
- `POST /api/game/move` - Make a move in the game
- `POST /api/game/remove-block` - Remove a block from the tower
- `POST /api/game/end` - End a game (tower collapsed)

#### Matchmaking
- `POST /api/matchmaking/join` - Join matchmaking queue
- `POST /api/matchmaking/leave` - Leave matchmaking queue
- `GET /api/matchmaking/status` - Get current matchmaking status

#### Analytics
- `GET /api/analytics/usage` - Get general usage analytics
- `GET /api/analytics/games` - Get game-specific analytics
- `GET /api/analytics/leaderboard` - Get leaderboard data
- `GET /api/analytics/user-stats` - Get authenticated user's statistics

### Socket.io Events

#### Client to Server
- `joinGame` - Join a game room
- `moveBlock` - Move a block
- `removeBlock` - Remove a block
- `chatMessage` - Send a chat message
- `leaveGame` - Leave a game

#### Server to Client
- `playerJoined` - A player joined the game
- `gameStarted` - Game has started
- `blockMoved` - A block was moved
- `blockRemoved` - A block was removed
- `gameEnded` - Game has ended
- `chatMessage` - New chat message

## Future Enhancements

- Complete Unity WebGL game client integration
- Implement comprehensive error handling
- Add more advanced game physics
- Develop comprehensive testing suite
- Implement production deployment scripts
- Add friend system and private games
- Implement tournaments and special events

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributors

- Initial development by [Your Name]

## Acknowledgments

- Inspired by the classic Jenga game
- Built with modern web technologies