/**
 * Main entry point for Jenga Race frontend
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing Jenga Race application...');
    
    // Initialize services
    await initializeApp();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
});

// Initialize application
async function initializeApp() {
  // Initialize UI service
  UIService.init();
  
  // Initialize auth state
  await AuthService.init();
  UIService.updateAuthUI();
  
  // Initialize game service
  GameService.init();
  
  // Load initial data
  if (AuthService.isAuthenticated()) {
    UIService.updateProfileUI();
  }
}
