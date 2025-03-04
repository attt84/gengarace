/**
 * API Service for Jenga Race
 * Handles all API calls to the backend
 */

const API_URL = 'http://localhost:3000/api';

// API Service object
const ApiService = {
  // Auth endpoints
  auth: {
    register: async (userData) => {
      try {
        const response = await fetch(`${API_URL}/users/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
        return await response.json();
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },

    login: async (credentials) => {
      try {
        const response = await fetch(`${API_URL}/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });
        return await response.json();
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    getProfile: async () => {
      try {
        const response = await fetch(`${API_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('Get profile error:', error);
        throw error;
      }
    },

    updateProfile: async (profileData) => {
      try {
        const response = await fetch(`${API_URL}/users/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(profileData),
        });
        return await response.json();
      } catch (error) {
        console.error('Update profile error:', error);
        throw error;
      }
    },
  },

  // Matchmaking endpoints
  matchmaking: {
    joinQueue: async () => {
      try {
        const response = await fetch(`${API_URL}/matchmaking/enqueue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('Join queue error:', error);
        throw error;
      }
    },

    leaveQueue: async () => {
      try {
        const response = await fetch(`${API_URL}/matchmaking/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('Leave queue error:', error);
        throw error;
      }
    },

    getStatus: async () => {
      try {
        const response = await fetch(`${API_URL}/matchmaking/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('Get queue status error:', error);
        throw error;
      }
    },
  },

  // Game endpoints
  game: {
    getGameData: async (gameId) => {
      try {
        const response = await fetch(`${API_URL}/game/${gameId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('Get game data error:', error);
        throw error;
      }
    },

    saveReplay: async (gameId, replayData) => {
      try {
        const response = await fetch(`${API_URL}/replay/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ gameId, replayData }),
        });
        return await response.json();
      } catch (error) {
        console.error('Save replay error:', error);
        throw error;
      }
    },
  },

  // Rankings endpoints
  rankings: {
    getGlobalRankings: async () => {
      try {
        const response = await fetch(`${API_URL}/rankings/global`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return await response.json();
      } catch (error) {
        console.error('Get rankings error:', error);
        throw error;
      }
    },
  },
};

// Export the API service
window.ApiService = ApiService;
