// Jenga Race - 3D Physics Game
console.log('Game.js loaded successfully');

// Main game class
class JengaGame {
    constructor() {
        console.log('JengaGame class initialized');
        
        // Game properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null; // Physics world
        this.controls = null;
        this.tower = []; // Tower blocks
        this.selectedBlock = null;
        this.isDragging = false;
        this.dragStartPosition = new THREE.Vector3();
        this.dragDirection = null; // 'x', 'z', or null
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isGameStarted = false;
        this.gameMode = 'single'; // 'single' or 'multi'
        this.playerTurn = 'player1';
        this.blocksRemoved = 0;
        
        // Multiplayer manager
        this.multiplayer = null;
        
        // Initialize the game
        this.init();
    }
    
    init() {
        console.log('Game initialization started');
        
        try {
            // Force hide loading screen after 5 seconds regardless of initialization state
            setTimeout(() => this.hideLoadingScreen(), 5000);
            
            // Initialize loading screen
            this.updateLoadingProgress(10, 'Initializing renderer...');
            
            // Setup Three.js renderer
            this.setupRenderer();
            this.updateLoadingProgress(20, 'Creating scene...');
            
            // Setup scene
            this.setupScene();
            this.updateLoadingProgress(30, 'Setting up camera...');
            
            // Setup camera
            this.setupCamera();
            this.updateLoadingProgress(40, 'Creating physics world...');
            
            // Setup physics
            this.setupPhysics();
            this.updateLoadingProgress(50, 'Building tower...');
            
            // Create Jenga tower
            this.createTower();
            this.updateLoadingProgress(70, 'Setting up controls...');
            
            // Setup controls
            this.setupControls();
            this.updateLoadingProgress(80, 'Setting up event listeners...');
            
            // Setup event listeners
            this.setupEventListeners();
            this.updateLoadingProgress(90, 'Setting up UI...');
            
            // Setup UI
            this.setupUI();
            this.updateLoadingProgress(100, 'Game ready!');
            
            // Start animation loop
            this.animate();
            
            console.log('Game initialization completed');
        } catch (error) {
            console.error('Error initializing game:', error);
            // Force hide loading screen even if initialization fails
            this.hideLoadingScreen();
            this.showNotification('Error initializing game', 'error');
        }
    }
    
    updateLoadingProgress(progress, message) {
        console.log(`Loading progress: ${progress}% - ${message}`);
        const progressBar = document.getElementById('loading-progress-bar');
        const progressText = document.getElementById('loading-progress-text');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = message;
            
            // Hide loading screen when complete
            if (progress >= 100) {
                console.log('Loading complete, hiding loading screen');
                this.hideLoadingScreen();
            }
        } else {
            console.error('Loading progress elements not found in DOM');
        }
    }
    
    setupRenderer() {
        console.log('Setting up renderer');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }
    
    setupScene() {
        console.log('Setting up scene');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
        
        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    setupCamera() {
        console.log('Setting up camera');
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Position camera to view tower
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 5, 0);
    }
    
    setupPhysics() {
        console.log('Setting up physics');
        try {
            // Make sure CANNON is available
            if (typeof CANNON === 'undefined') {
                throw new Error('CANNON physics engine not loaded');
            }
            
            // Create physics world
            this.world = new CANNON.World();
            this.world.gravity.set(0, -9.82, 0); // Earth gravity
            this.world.broadphase = new CANNON.NaiveBroadphase();
            this.world.solver.iterations = 10;
            this.world.defaultContactMaterial.contactEquationStiffness = 1e6;
            this.world.defaultContactMaterial.contactEquationRelaxation = 3;
            this.world.defaultContactMaterial.friction = 0.3;
            
            // Create ground body
            const groundShape = new CANNON.Plane();
            const groundBody = new CANNON.Body({
                mass: 0 // Mass 0 makes it static
            });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(
                new CANNON.Vec3(1, 0, 0),
                -Math.PI / 2
            );
            this.world.addBody(groundBody);
            
            console.log('Physics setup completed');
        } catch (error) {
            console.error('Physics setup failed:', error);
            throw error; // Re-throw to be caught by init
        }
    }
    
    createTower() {
        console.log('Creating Jenga tower');
        // Tower dimensions
        const blockHeight = 0.6;
        const blockWidth = 2;
        const blockDepth = 0.6;
        
        // Material for blocks
        const blockMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Physics material
        const physicsMaterial = new CANNON.Material('blockMaterial');
        
        // Create tower
        const numLevels = 10; // Levels in the tower
        const blocksPerLevel = 3; // Blocks per level
        
        for (let level = 0; level < numLevels; level++) {
            const evenLevel = level % 2 === 0;
            
            for (let i = 0; i < blocksPerLevel; i++) {
                try {
                    // Create block
                    const blockGeometry = new THREE.BoxGeometry(
                        evenLevel ? blockWidth : blockDepth,
                        blockHeight,
                        evenLevel ? blockDepth : blockWidth
                    );
                    
                    const block = new THREE.Mesh(blockGeometry, blockMaterial);
                    block.castShadow = true;
                    block.receiveShadow = true;
                    
                    // Position block
                    if (evenLevel) {
                        // Even levels: blocks along Z axis
                        block.position.x = 0;
                        block.position.y = level * blockHeight + blockHeight / 2;
                        block.position.z = (i - 1) * blockDepth;
                    } else {
                        // Odd levels: blocks along X axis
                        block.position.x = (i - 1) * blockDepth;
                        block.position.y = level * blockHeight + blockHeight / 2;
                        block.position.z = 0;
                    }
                    
                    // Create physics body
                    const blockShape = new CANNON.Box(new CANNON.Vec3(
                        evenLevel ? blockWidth / 2 : blockDepth / 2,
                        blockHeight / 2,
                        evenLevel ? blockDepth / 2 : blockWidth / 2
                    ));
                    
                    const blockBody = new CANNON.Body({
                        mass: 1,
                        material: physicsMaterial
                    });
                    blockBody.addShape(blockShape);
                    blockBody.position.copy(block.position);
                    
                    // Store reference to mesh
                    blockBody.userData = { mesh: block };
                    block.userData = { body: blockBody, level, index: i };
                    
                    // Add to scene and physics world
                    this.scene.add(block);
                    this.world.addBody(blockBody);
                    
                    // Add to tower array
                    this.tower.push({ mesh: block, body: blockBody });
                    
                } catch (error) {
                    console.error(`Error creating block at level ${level}, index ${i}:`, error);
                }
            }
        }
        
        // Set up block-to-block contact behavior
        const contactMaterial = new CANNON.ContactMaterial(
            physicsMaterial,
            physicsMaterial,
            {
                friction: 0.5,
                restitution: 0.3
            }
        );
        this.world.addContactMaterial(contactMaterial);
        
        console.log(`Tower created with ${this.tower.length} blocks`);
    }
    
    setupControls() {
        console.log('Setting up controls');
        // Orbit controls for camera
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.camera && this.renderer) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        // Mouse events for block manipulation
        document.addEventListener('mousedown', (event) => {
            if (!this.isGameStarted || !this.scene || !this.camera) return;
            
            try {
                // Only handle left mouse button
                if (event.button !== 0) return;
                
                // Calculate mouse position in normalized device coordinates
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
                
                // Update the picking ray with the camera and mouse position
                this.raycaster.setFromCamera(this.mouse, this.camera);
                
                // Calculate objects intersecting the picking ray
                const blocksToCheck = this.tower.map(block => block.mesh).filter(mesh => !!mesh);
                const intersects = this.raycaster.intersectObjects(blocksToCheck);
                
                if (intersects.length > 0) {
                    // Select the block
                    this.selectBlock(intersects[0].object);
                    
                    // Start dragging
                    this.isDragging = true;
                    
                    // Store the initial position
                    this.dragStartPosition.copy(this.selectedBlock.position);
                    
                    // Disable orbit controls while dragging
                    if (this.controls) {
                        this.controls.enabled = false;
                    }
                    
                    // Determine drag direction based on block orientation
                    const blockIndex = this.tower.findIndex(block => block.mesh === this.selectedBlock);
                    if (blockIndex !== -1) {
                        const level = Math.floor(blockIndex / 3);
                        this.dragDirection = level % 2 === 0 ? 'z' : 'x';
                    }
                } else if (this.selectedBlock) {
                    // If clicking elsewhere, deselect the block
                    this.deselectBlock();
                }
            } catch (error) {
                console.error('Block selection error:', error);
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (!this.isDragging || !this.selectedBlock || !this.dragDirection) return;
            
            try {
                // Update mouse position
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
                
                // Find the block in the tower array
                const blockIndex = this.tower.findIndex(block => block.mesh === this.selectedBlock);
                if (blockIndex === -1) return;
                
                const block = this.tower[blockIndex];
                if (!block.body) return;
                
                // Convert mouse movement to world space
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const plane = new THREE.Plane();
                
                // Create a plane aligned with the drag direction
                if (this.dragDirection === 'x') {
                    plane.setFromNormalAndCoplanarPoint(
                        new THREE.Vector3(0, 0, 1),
                        this.dragStartPosition
                    );
                } else {
                    plane.setFromNormalAndCoplanarPoint(
                        new THREE.Vector3(1, 0, 0),
                        this.dragStartPosition
                    );
                }
                
                // Find where the ray intersects the plane
                const targetPoint = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, targetPoint);
                
                // Limit movement to the drag direction and a reasonable distance
                const maxDragDistance = 2.0; // Maximum distance the block can be dragged
                
                if (this.dragDirection === 'x') {
                    const diff = targetPoint.x - this.dragStartPosition.x;
                    const clampedDiff = Math.max(-maxDragDistance, Math.min(maxDragDistance, diff));
                    
                    // Apply the position change
                    block.body.position.x = this.dragStartPosition.x + clampedDiff;
                    block.body.velocity.set(0, 0, 0); // Reset velocity to avoid sudden movements
                } else {
                    const diff = targetPoint.z - this.dragStartPosition.z;
                    const clampedDiff = Math.max(-maxDragDistance, Math.min(maxDragDistance, diff));
                    
                    // Apply the position change
                    block.body.position.z = this.dragStartPosition.z + clampedDiff;
                    block.body.velocity.set(0, 0, 0); // Reset velocity to avoid sudden movements
                }
                
                // Check if the block has been pulled far enough to be removed
                const distanceFromStart = this.dragDirection === 'x' 
                    ? Math.abs(block.body.position.x - this.dragStartPosition.x)
                    : Math.abs(block.body.position.z - this.dragStartPosition.z);
                
                if (distanceFromStart > 1.5) {
                    this.removeBlock();
                }
            } catch (error) {
                console.error('Block dragging error:', error);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.dragDirection = null;
                
                // Re-enable orbit controls
                if (this.controls) {
                    this.controls.enabled = true;
                }
            }
        });
        
        // Key event listeners
        document.addEventListener('keydown', (event) => {
            if (!this.isGameStarted) return;
            
            switch (event.code) {
                case 'Escape':
                    this.deselectBlock();
                    break;
                case 'KeyR':
                    this.resetCamera();
                    break;
            }
        });
        
        // Button event listeners - add try/catch for each listener
        try {
            document.getElementById('camera-reset-btn')?.addEventListener('click', () => this.resetCamera());
            document.getElementById('camera-top-btn')?.addEventListener('click', () => this.setTopView());
            document.getElementById('camera-side-btn')?.addEventListener('click', () => this.setSideView());
            document.getElementById('single-player-btn')?.addEventListener('click', () => this.startSinglePlayerGame());
            document.getElementById('reset-btn')?.addEventListener('click', () => this.resetGame());
            document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
        } catch (error) {
            console.error('Error setting up button event listeners:', error);
        }
    }
    
    setupUI() {
        console.log('Setting up UI');
        // Set game mode display
        document.getElementById('game-mode').textContent = 'Single Player';
        
        // Set up crosshair
        const crosshair = document.getElementById('crosshair');
        crosshair.style.position = 'absolute';
        crosshair.style.top = '50%';
        crosshair.style.left = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.borderRadius = '50%';
        crosshair.style.border = '2px solid white';
        crosshair.style.boxSizing = 'border-box';
        crosshair.style.display = 'none'; // Hide until game starts
        
        // Initialize multiplayer manager
        if (typeof MultiplayerManager !== 'undefined') {
            console.log('Initializing multiplayer manager');
            this.multiplayer = new MultiplayerManager(this);
        } else {
            console.warn('MultiplayerManager not found, multiplayer features disabled');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update physics
        if (this.world) {
            try {
                this.world.step(1/60);
                
                // Update meshes to match physics bodies
                for (const block of this.tower) {
                    if (block.body && block.mesh) {
                        block.mesh.position.copy(block.body.position);
                        block.mesh.quaternion.copy(block.body.quaternion);
                    }
                }
            } catch (error) {
                console.error('Physics update error:', error);
            }
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render scene
        if (this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    selectBlock(blockMesh) {
        console.log('Block selected:', blockMesh);
        
        // Deselect previous block
        this.deselectBlock();
        
        // Highlight selected block
        blockMesh.material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.1
        });
        
        this.selectedBlock = blockMesh;
    }
    
    deselectBlock() {
        if (this.selectedBlock) {
            // Reset material
            this.selectedBlock.material = new THREE.MeshStandardMaterial({
                color: 0xA0522D,
                roughness: 0.7,
                metalness: 0.1
            });
            
            this.selectedBlock = null;
        }
    }
    
    removeBlock() {
        if (!this.selectedBlock) return;
        
        console.log('Removing block');
        
        // Find the block in the tower array
        const blockIndex = this.tower.findIndex(block => block.mesh === this.selectedBlock);
        if (blockIndex === -1) return;
        
        const block = this.tower[blockIndex];
        
        try {
            // Apply an impulse in the drag direction plus some random component
            let impulseX = 0;
            let impulseZ = 0;
            
            if (this.dragDirection === 'x') {
                // If dragging in X direction, apply stronger impulse in X
                impulseX = (block.body.position.x > this.dragStartPosition.x ? 1 : -1) * 10;
                impulseZ = (Math.random() - 0.5) * 3;
            } else {
                // If dragging in Z direction, apply stronger impulse in Z
                impulseZ = (block.body.position.z > this.dragStartPosition.z ? 1 : -1) * 10;
                impulseX = (Math.random() - 0.5) * 3;
            }
            
            const impulse = new CANNON.Vec3(impulseX, 2, impulseZ);
            
            if (block.body) {
                block.body.applyImpulse(impulse, block.body.position);
            }
            
            // Update blocks removed counter
            this.blocksRemoved++;
            document.getElementById('blocks-removed').textContent = this.blocksRemoved;
            
            // If in multiplayer mode, notify other players
            if (this.gameMode === 'multi' && this.multiplayer) {
                // Get the block index in the tower array
                if (blockIndex !== -1) {
                    this.multiplayer.removeBlockMultiplayer(blockIndex, impulse);
                }
            }
            
            // Play a sound if available
            if (typeof Audio !== 'undefined') {
                try {
                    const removeSound = new Audio('./assets/sounds/block_remove.mp3');
                    removeSound.volume = 0.5;
                    removeSound.play().catch(err => console.error('Failed to play sound:', err));
                } catch (error) {
                    console.error('Failed to create audio:', error);
                }
            }
        } catch (error) {
            console.error('Error removing block:', error);
        } finally {
            // Reset dragging state
            this.isDragging = false;
            this.dragDirection = null;
            
            // Re-enable orbit controls
            if (this.controls) {
                this.controls.enabled = true;
            }
            
            // Deselect block
            this.deselectBlock();
        }
    }
    
    resetCamera() {
        console.log('Resetting camera');
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 5, 0);
        this.controls.target.set(0, 5, 0);
    }
    
    setTopView() {
        console.log('Setting top view');
        this.camera.position.set(0, 15, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
    }
    
    setSideView() {
        console.log('Setting side view');
        this.camera.position.set(15, 5, 0);
        this.camera.lookAt(0, 5, 0);
        this.controls.target.set(0, 5, 0);
    }
    
    startSinglePlayerGame() {
        console.log('Starting single player game');
        this.isGameStarted = true;
        this.gameMode = 'single';
        
        // Update UI
        document.getElementById('game-status').textContent = 'In Progress';
        document.getElementById('game-mode').textContent = 'Single Player';
        document.getElementById('current-turn').textContent = 'You';
        document.getElementById('crosshair').style.display = 'block';
        
        // Show notification
        this.showNotification('Single player game started!');
    }
    
    handleLogin() {
        const playerName = prompt('Enter your name:', 'Player');
        if (playerName && playerName.trim()) {
            // Set player name in multiplayer manager
            if (this.multiplayer) {
                this.multiplayer.setPlayerName(playerName.trim());
            }
            
            // Update login button
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.textContent = playerName.trim();
            }
            
            this.showNotification(`Welcome, ${playerName.trim()}!`);
        }
    }
    
    resetGame() {
        console.log('Resetting game');
        
        // Reset game state
        this.isGameStarted = false;
        this.blocksRemoved = 0;
        
        // Reset UI
        document.getElementById('game-status').textContent = 'Waiting';
        document.getElementById('blocks-removed').textContent = '0';
        document.getElementById('crosshair').style.display = 'none';
        
        // Clear existing tower
        for (const block of this.tower) {
            this.scene.remove(block.mesh);
            this.world.removeBody(block.body);
        }
        
        this.tower = [];
        
        // Rebuild tower
        this.createTower();
        
        // Show notification
        this.showNotification('Tower has been reset!');
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';
        notification.style.opacity = '1';
        
        // Fade out and hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 500);
        }, 3000);
    }
    
    hideLoadingScreen() {
        console.log('Manually hiding loading screen');
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                console.log('Loading screen hidden');
            }, 500);
        } else {
            console.error('Loading screen element not found');
        }
    }
}

// Export for use in other files
window.JengaGame = JengaGame;

// Initialize game when page is loaded
window.addEventListener('load', () => {
    console.log('Window loaded, initializing game');
    try {
        new JengaGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        // Hide loading screen even if game initialization fails
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
});
