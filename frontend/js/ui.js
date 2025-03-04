/**
 * UI Service for Jenga Race
 * Handles UI interactions and section navigation
 */

const UIService = {
  // Current active section
  activeSection: 'home-section',
  
  // Initialize UI
  init: () => {
    // Navigation links
    document.getElementById('nav-home').addEventListener('click', () => UIService.showSection('home-section'));
    document.getElementById('nav-play').addEventListener('click', () => UIService.showSection('play-section'));
    document.getElementById('nav-rankings').addEventListener('click', () => UIService.showSection('rankings-section'));
    document.getElementById('nav-profile').addEventListener('click', () => UIService.showSection('profile-section'));
    
    // Auth buttons
    document.getElementById('login-btn').addEventListener('click', () => {
      UIService.showSection('auth-section');
      document.getElementById('login-form').classList.remove('d-none');
      document.getElementById('register-form').classList.add('d-none');
    });
    
    document.getElementById('register-btn').addEventListener('click', () => {
      UIService.showSection('auth-section');
      document.getElementById('login-form').classList.add('d-none');
      document.getElementById('register-form').classList.remove('d-none');
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
      AuthService.logout();
      UIService.updateAuthUI();
      UIService.showSection('home-section');
    });
    
    // Auth form links
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('d-none');
      document.getElementById('register-form').classList.remove('d-none');
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.remove('d-none');
      document.getElementById('register-form').classList.add('d-none');
    });
    
    // Play now button
    document.getElementById('play-now-btn').addEventListener('click', () => {
      if (AuthService.isAuthenticated()) {
        UIService.showSection('play-section');
      } else {
        UIService.showSection('auth-section');
        document.getElementById('login-form').classList.remove('d-none');
        document.getElementById('register-form').classList.add('d-none');
      }
    });
    
    // Auth forms submission
    document.getElementById('login-form-element').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        await AuthService.login(email, password);
        UIService.updateAuthUI();
        UIService.showSection('home-section');
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    });
    
    document.getElementById('register-form-element').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      try {
        await AuthService.register(username, email, password);
        UIService.updateAuthUI();
        UIService.showSection('home-section');
      } catch (error) {
        alert('Registration failed: ' + error.message);
      }
    });
    
    // Profile edit button
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return;
      
      const newUsername = prompt('Enter new username:', currentUser.username);
      const newBio = prompt('Enter new bio:', currentUser.bio);
      
      if (newUsername || newBio) {
        const updateData = {};
        if (newUsername) updateData.username = newUsername;
        if (newBio) updateData.bio = newBio;
        
        AuthService.updateProfile(updateData)
          .then(() => {
            UIService.updateProfileUI();
          })
          .catch(error => {
            alert('Failed to update profile: ' + error.message);
          });
      }
    });
  },
  
  // Show a specific section
  showSection: (sectionId) => {
    // Hide all sections
    document.querySelectorAll('main > section').forEach(section => {
      section.classList.add('d-none');
      section.classList.remove('active-section');
    });
    
    // Show the requested section
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('d-none');
      section.classList.add('active-section');
      UIService.activeSection = sectionId;
      
      // Load section-specific data
      if (sectionId === 'profile-section' && AuthService.isAuthenticated()) {
        UIService.updateProfileUI();
      } else if (sectionId === 'rankings-section') {
        UIService.loadRankings();
      }
    }
  },
  
  // Update auth UI based on authentication state
  updateAuthUI: () => {
    const isAuthenticated = AuthService.isAuthenticated();
    const currentUser = AuthService.getCurrentUser();
    
    if (isAuthenticated && currentUser) {
      // Show user info, hide auth buttons
      document.getElementById('auth-buttons').classList.add('d-none');
      document.getElementById('user-info').classList.remove('d-none');
      document.getElementById('username-display').textContent = currentUser.username;
      
      // Enable protected sections
      document.getElementById('nav-profile').classList.remove('d-none');
    } else {
      // Show auth buttons, hide user info
      document.getElementById('auth-buttons').classList.remove('d-none');
      document.getElementById('user-info').classList.add('d-none');
      
      // Disable protected sections
      if (UIService.activeSection === 'profile-section') {
        UIService.showSection('home-section');
      }
    }
  },
  
  // Update profile UI with user data
  updateProfileUI: async () => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return;
    
    // Update profile info
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-bio').textContent = currentUser.bio || 'No bio provided';
    
    // Update stats
    if (currentUser.stats) {
      document.getElementById('stats-games-played').textContent = currentUser.stats.gamesPlayed;
      document.getElementById('stats-games-won').textContent = currentUser.stats.gamesWon;
      
      const winRate = currentUser.stats.gamesPlayed > 0 
        ? Math.round((currentUser.stats.gamesWon / currentUser.stats.gamesPlayed) * 100) 
        : 0;
      document.getElementById('stats-win-rate').textContent = `${winRate}%`;
      
      document.getElementById('stats-highest-tower').textContent = currentUser.stats.highestTowerHeight;
      document.getElementById('stats-fastest-win').textContent = currentUser.stats.fastestWin || 'N/A';
      document.getElementById('stats-rank').textContent = getRankName(currentUser.stats.rank);
    }
  },
  
  // Load rankings data
  loadRankings: async () => {
    try {
      const rankingsTableBody = document.getElementById('rankings-table-body');
      rankingsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading rankings...</td></tr>';
      
      const rankings = await ApiService.rankings.getGlobalRankings();
      
      if (rankings && rankings.length > 0) {
        rankingsTableBody.innerHTML = '';
        
        rankings.forEach((player, index) => {
          const row = document.createElement('tr');
          
          // Highlight current user
          if (AuthService.isAuthenticated() && 
              AuthService.getCurrentUser() && 
              player._id === AuthService.getCurrentUser()._id) {
            row.classList.add('table-primary');
          }
          
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.username}</td>
            <td>${player.stats.gamesWon}</td>
            <td>${player.stats.gamesPlayed > 0 
              ? Math.round((player.stats.gamesWon / player.stats.gamesPlayed) * 100) 
              : 0}%</td>
            <td>${player.stats.highestTowerHeight}</td>
          `;
          
          rankingsTableBody.appendChild(row);
        });
      } else {
        rankingsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No rankings available</td></tr>';
      }
    } catch (error) {
      console.error('Failed to load rankings:', error);
      document.getElementById('rankings-table-body').innerHTML = 
        '<tr><td colspan="5" class="text-center text-danger">Failed to load rankings</td></tr>';
    }
  }
};

// Helper function to get rank name from rank value
function getRankName(rank) {
  if (!rank) return 'Beginner';
  
  if (rank < 800) return 'Beginner';
  if (rank < 1000) return 'Amateur';
  if (rank < 1200) return 'Intermediate';
  if (rank < 1400) return 'Advanced';
  if (rank < 1600) return 'Expert';
  if (rank < 1800) return 'Master';
  return 'Grandmaster';
}

// Export the UI service
window.UIService = UIService;
