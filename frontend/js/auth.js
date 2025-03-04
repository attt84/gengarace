/**
 * Authentication Service for Jenga Race
 * Handles user authentication, registration, and session management
 */

const AuthService = {
  // Current user data
  currentUser: null,
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return localStorage.getItem('token') !== null;
  },
  
  // Initialize auth state
  init: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Fetch user profile
        const userData = await ApiService.auth.getProfile();
        AuthService.currentUser = userData;
        return userData;
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        AuthService.logout();
        return null;
      }
    }
    return null;
  },
  
  // Register a new user
  register: async (username, email, password) => {
    try {
      const response = await ApiService.auth.register({ username, email, password });
      if (response.token) {
        localStorage.setItem('token', response.token);
        AuthService.currentUser = response.user;
        return response.user;
      } else {
        throw new Error(response.msg || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Login user
  login: async (email, password) => {
    try {
      const response = await ApiService.auth.login({ email, password });
      if (response.token) {
        localStorage.setItem('token', response.token);
        AuthService.currentUser = response.user;
        return response.user;
      } else {
        throw new Error(response.msg || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    AuthService.currentUser = null;
  },
  
  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await ApiService.auth.updateProfile(profileData);
      AuthService.currentUser = response;
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
  
  // Get current user
  getCurrentUser: () => {
    return AuthService.currentUser;
  }
};

// Export the Auth service
window.AuthService = AuthService;
