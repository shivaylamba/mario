BACKEND_URL = "https://mario-backend-v4y5.onrender.com";
//BACKEND_URL = "http://localhost:3000";

// Create and initialize the inspector panel
function createInspector() {
  const inspectorStyles = document.createElement('style');
  inspectorStyles.textContent = `
  body {
    margin: 0;
    padding: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: stretch;  
    overflow: hidden;
    font-family: 'Open Sans', sans-serif;
  }

  #game-container {
    height: 66vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f0f0f0;
  }

  canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  #inspector {
    width: 100%;
    height: 34vh;
    background: #202124;
    border-top: 1px solid #454545;
    color: #fff;
    font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
    font-size: 12px;
    overflow: auto;
    box-sizing: border-box; 
  }

  .inspector-header {
    padding: 8px;
    background: #2d2d2d;
    border-bottom: 1px solid #454545;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inspector-tab {
    padding: 6px 12px;
    color: #999;
    cursor: pointer;
    border-radius: 4px;
  }

  .inspector-tab.active {
    background: #454545;
    color: #fff;
  }

  .inspector-content {
    padding: 8px;
  }

  .property-row {
    display: flex;
    align-items: flex-start;
    padding: 4px 0;
  }

  .property-name {
    color: #9b9b9b;
    margin-right: 8px;
    flex: 0 0 150px;
  }

  .property-value {
    color: #5db0d7;
  }

  .property-value.number {
    color: #9980ff;
  }

  .property-value.boolean {
    color: #ff8c7c;
  }
`;
  document.head.appendChild(inspectorStyles);

  // Create a container for the game canvas
  const gameContainer = document.createElement('div');
  gameContainer.id = 'game-container';

  // Move the existing canvas (created in createCanvas()) into the container
  const existingCanvas = document.querySelector('canvas');
  if (existingCanvas) {
    existingCanvas.remove();
    gameContainer.appendChild(existingCanvas);
  }

  // Create the inspector panel element
  const inspector = document.createElement('div');
  inspector.id = 'inspector';
  inspector.innerHTML = `
    <div class="inspector-header">
      <div class="inspector-tab active">Console</div>
      <div class="inspector-tab">Game State</div>
    </div>
    <div class="inspector-content">
      <div class="property-row">
        <span class="property-name">playerPosition 📍</span>
        <span class="property-value">[0, 0]</span>
      </div>
      <div class="property-row">
        <span class="property-name">coinsCollected 🪙</span>
        <span class="property-value number">0</span>
      </div>
      <div class="property-row">
        <span class="property-name">fireballsShot 🔥</span>
        <span class="property-value number">0</span>
      </div>
      <div class="property-row">
        <span class="property-name">enemiesDefeated 👾</span>
        <span class="property-value number">0</span>
      </div>
      <div class="property-row">
        <span class="property-name">reachedFlag 🚩</span>
        <span class="property-value boolean">false</span>
      </div>
      <div class="property-row">
        <span class="property-name">flagPoleHeight 🏁</span>
        <span class="property-value number">0</span>
      </div>
    </div>
  `;

  // Append the game container and inspector to the document body
  document.body.appendChild(gameContainer);
  document.body.appendChild(inspector);

  // Define the updateInspector function globally so it can be called from the game loop.
  window.updateInspector = function () {
    if (!player) return;

    const stats = {
      playerPosition: player.pos,
      coinsCollected: player.coinsCollected || 0,
      fireballsShot: player.fireballsShot || 0,
      enemiesDefeated: player.enemiesDefeated || 0,
      reachedFlag: player.reachedFlag || false,
      flagPoleHeight: player.flagPoleHeight || 0
    };

    // Loop through each property row and update its value if it exists in the stats.
    const rows = inspector.querySelectorAll('.property-row');
    rows.forEach(row => {
      const nameEl = row.querySelector('.property-name');
      const valueEl = row.querySelector('.property-value');
      const key = nameEl.textContent.trim();
      if (stats.hasOwnProperty(key)) {
        const value = stats[key];
        valueEl.textContent = Array.isArray(value) ? `[${value.join(', ')}]` : value;
      }
    });
  };
}

var requestAnimFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

var canvas, ctx, player, level, sounds, music, updateables, fireballs;
var vX = 0,
  vY = 0,
  vWidth = 256,
  vHeight = 240;
var gameTime = 0;
var playerId; // Player ID for backend integration
var previousScore = 0;
var gameTimer = 40; // 50 seconds
var timerDisplay = null;
var timerInterval = null;
var lastUpdateTime = 0;
let UPDATE_INTERVAL = 1000; // Update every 1 second

let isGamepadConnected = false;

window.addEventListener("gamepadconnected", (e) => {
  isGamepadConnected = true;
  console.log("Gamepad connected:", e.gamepad);
});

window.addEventListener("gamepaddisconnected", (e) => {
  isGamepadConnected = false;
  console.log("Gamepad disconnected:", e.gamepad);
});

// Create canvas
function createCanvas() {
  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");
  canvas.width = 762;
  canvas.height = 720;
  ctx.scale(3, 3);
  canvas.style.display = "none"; // Initially hide the canvas
  document.body.appendChild(canvas);
}

// Initialize everything
function initializeGame() {
  // Reset game variables
  updateables = [];
  fireballs = [];
  player = new Mario.Player([0, 0]);

  // Initialize player stats
  player.coins = 0;  // Regular coin counter
  player.coinsCollected = 0;  // Tracking counter
  player.fireballsShot = 0;
  player.enemiesDefeated = 0;
  player.reachedFlag = false;
  player.flagPoleHeight = 0;

  if (!document.getElementById('inspector')) {
    createInspector();
  }

  level = null;
  gameTime = 0;
  gameTimer = 50; // Reset timer

  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  if (timerDisplay) {
    timerDisplay.remove();
  }

  // Start new timer
  startGameTimer();

  // Load resources
  resources.load([
    "sprites/player.png",
    "sprites/enemy.png",
    "sprites/tiles.png",
    "sprites/playerl.png",
    "sprites/items.png",
    "sprites/enemyr.png",
  ]);
  resources.onReady(initLevel);
}

function showWaitingRoom() {
  // Create a container for the waiting room
  const waitingDiv = document.createElement('div');
  waitingDiv.id = 'waiting-room';
  waitingDiv.style.maxWidth = '500px';
  waitingDiv.style.margin = '20px auto';
  waitingDiv.style.padding = '20px';
  waitingDiv.style.backgroundColor = '#5C94FC'; // Mario sky blue
  waitingDiv.style.border = '4px solid #000';
  waitingDiv.style.borderRadius = '10px';
  waitingDiv.style.boxShadow = '0 0 0 4px #FFF, 0 0 0 8px #000';
  waitingDiv.style.textAlign = 'center';
  waitingDiv.style.fontFamily = '"Courier New", monospace'; // Pixel-like font

  const heading = document.createElement('h2');
  heading.textContent = "SELECT YOUR PLAYER";
  heading.style.color = '#FFF';
  heading.style.textShadow = '2px 2px 0 #000';
  heading.style.fontSize = '24px';
  heading.style.marginBottom = '20px';
  heading.style.textTransform = 'uppercase';
  waitingDiv.appendChild(heading);

  // Container for the player list (now a dropdown)
  const listContainer = document.createElement('div');
  listContainer.id = 'player-list';
  listContainer.style.marginBottom = '20px';
  waitingDiv.appendChild(listContainer);

  // Refresh button to update the list manually
  const refreshButton = document.createElement('button');
  refreshButton.textContent = "REFRESH LIST";
  refreshButton.style.backgroundColor = '#E52521'; // Mario red
  refreshButton.style.color = 'white';
  refreshButton.style.border = '4px solid #000';
  refreshButton.style.borderRadius = '5px';
  refreshButton.style.padding = '10px 20px';
  refreshButton.style.fontSize = '16px';
  refreshButton.style.fontWeight = 'bold';
  refreshButton.style.cursor = 'pointer';
  refreshButton.style.fontFamily = '"Courier New", monospace';
  refreshButton.style.boxShadow = '2px 2px 0 #000';
  refreshButton.addEventListener('click', () => {
    fetchPlayerList();
  });
  
  // Add hover effect
  refreshButton.onmouseover = function() {
    this.style.backgroundColor = '#FF4D4D';
  };
  refreshButton.onmouseout = function() {
    this.style.backgroundColor = '#E52521';
  };
  
  waitingDiv.appendChild(refreshButton);

  document.body.appendChild(waitingDiv);
  fetchPlayerList();
}

async function fetchPlayerList() {
  const listContainer = document.getElementById('player-list');
  listContainer.innerHTML = "<div style='color: white; font-weight: bold;'>LOADING...</div>";
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/players/all`);
    if (!response.ok) throw new Error("Failed to fetch players");
    const players = await response.json();

    // Filter for waiting players
    const waitingPlayers = players.filter(p => p.gameplay && p.gameplay.score === 0);
    listContainer.innerHTML = "";
    
    if (waitingPlayers.length === 0) {
      const message = document.createElement('div');
      message.textContent = "NO PLAYERS WAITING. PLEASE REGISTER FIRST ON YOUR PHONE.";
      message.style.color = 'white';
      message.style.fontWeight = 'bold';
      message.style.padding = '10px';
      message.style.backgroundColor = 'rgba(0,0,0,0.5)';
      message.style.borderRadius = '5px';
      listContainer.appendChild(message);
      return;
    }

    // Create select dropdown
    const selectBox = document.createElement('select');
    selectBox.style.width = '80%';
    selectBox.style.padding = '10px';
    selectBox.style.fontSize = '16px';
    selectBox.style.backgroundColor = '#FBD000'; // Mario yellow
    selectBox.style.color = '#000';
    selectBox.style.border = '4px solid #000';
    selectBox.style.borderRadius = '5px';
    selectBox.style.marginBottom = '20px';
    selectBox.style.fontFamily = '"Courier New", monospace';
    selectBox.style.cursor = 'pointer';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- SELECT PLAYER --";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectBox.appendChild(defaultOption);
    
    // Add player options
    waitingPlayers.forEach(player => {
      const nameParts = player.name.split(" ");
      let displayName = nameParts[0];
      if (nameParts.length > 1) {
        displayName += " " + nameParts[1][0] + ".";
      }
      
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = displayName;
      selectBox.appendChild(option);
    });
    
    listContainer.appendChild(selectBox);
    
    // Add play button
    const playButton = document.createElement('button');
    playButton.textContent = "PLAY!";
    playButton.style.backgroundColor = '#1EB53A'; // Mario green
    playButton.style.color = 'white';
    playButton.style.border = '4px solid #000';
    playButton.style.borderRadius = '5px';
    playButton.style.padding = '10px 30px';
    playButton.style.fontSize = '18px';
    playButton.style.fontWeight = 'bold';
    playButton.style.cursor = 'pointer';
    playButton.style.fontFamily = '"Courier New", monospace';
    playButton.style.display = 'block';
    playButton.style.margin = '0 auto';
    playButton.style.boxShadow = '2px 2px 0 #000';
    
    // Add hover effect
    playButton.onmouseover = function() {
      this.style.backgroundColor = '#2FD54A';
    };
    playButton.onmouseout = function() {
      this.style.backgroundColor = '#1EB53A';
    };
    
    playButton.addEventListener('click', () => {
      if (selectBox.value) {
        // Set the global playerId so that the game updates this player record
        playerId = selectBox.value;
        startGame();
      } else {
        alert("Please select a player first!");
      }
    });
    
    listContainer.appendChild(playButton);
    
  } catch (error) {
    listContainer.innerHTML = "<div style='color: white; font-weight: bold; background-color: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px;'>ERROR LOADING PLAYER LIST!</div>";
    console.error(error);
  }
}

function startGame() {
  // Clear the waiting room UI
  const waitingRoom = document.getElementById('waiting-room');
  if (waitingRoom) {
    waitingRoom.remove();
  }
  // Show the canvas and initialize the game
  canvas.style.display = "block";
  initializeGame();
}

// Throttle network updates
UPDATE_INTERVAL = 1000; // Update every 1 second
lastUpdateTime = 0;

// Modify sendGameplayUpdate to be throttled
async function sendGameplayUpdate(state) {
  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL) {
    return; // Skip update if not enough time has passed
  }
  lastUpdateTime = now;

  try {
    const gameState = {
      timestamp: new Date().toISOString(),
      state: {
        ...state,
        playerStats: {
          coinsCollected: player.coinsCollected || 0,
          fireballsShot: player.fireballsShot || 0,
          enemiesDefeated: player.enemiesDefeated || 0,
          reachedFlag: player.reachedFlag || false,
          flagPoleHeight: player.flagPoleHeight || 0
        }
      }
    };

    // Use non-blocking fetch
    fetch(`${BACKEND_URL}/api/players/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameplayState: gameState }),
    }).catch(error => console.error("🪙 NETWORK ERROR:", error));

  } catch (error) {
    console.error("🪙 Update Error:", error);
  }
}

async function sendImmediateGameplayUpdate(state) {
  try {
    // Ensure player stats are properly initialized
    if (!player.coinsCollected) player.coinsCollected = 0;
    if (!player.coins) player.coins = 0;

    const gameState = {
      timestamp: new Date().toISOString(),
      state: {
        ...state,
        playerStats: {
          coinsCollected: parseInt(player.coinsCollected) || 0,
          coins: parseInt(player.coins) || 0,
          fireballsShot: player.fireballsShot || 0,
          enemiesDefeated: player.enemiesDefeated || 0,
          reachedFlag: player.reachedFlag || false,
          flagPoleHeight: player.flagPoleHeight || 0
        }
      }
    };

    console.log('🪙 IMMEDIATE UPDATE:', {
      playerStats: gameState.state.playerStats,
      rawValues: {
        coins: player.coins,
        coinsCollected: player.coinsCollected
      }
    });

    const response = await fetch(`${BACKEND_URL}/api/players/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameplayState: gameState }),
    });

    if (!response.ok) {
      throw new Error("Failed to update gameplay state");
    }

    const responseData = await response.json();
    console.log('🪙 Server Response:', responseData);
  } catch (error) {
    console.error("🪙 Update Error:", error);
  }
}

// Initialize level and start gameplay
function initLevel() {
  // Load level and sounds
  music = {
    overworld: new Audio("sounds/aboveground_bgm.ogg"),
    underground: new Audio("sounds/underground_bgm.ogg"),
    clear: new Audio("sounds/stage_clear.wav"),
    death: new Audio("sounds/mariodie.wav"),
  };
  sounds = {
    smallJump: new Audio("sounds/jump-small.wav"),
    bigJump: new Audio("sounds/jump-super.wav"),
    breakBlock: new Audio("sounds/breakblock.wav"),
    bump: new Audio("sounds/bump.wav"),
    coin: new Audio("sounds/coin.wav"),
    fireball: new Audio("sounds/fireball.wav"),
    flagpole: new Audio("sounds/flagpole.wav"),
    kick: new Audio("sounds/kick.wav"),
    pipe: new Audio("sounds/pipe.wav"),
    itemAppear: new Audio("sounds/itemAppear.wav"),
    powerup: new Audio("sounds/powerup.wav"),
    stomp: new Audio("sounds/stomp.wav"),
  };
  Mario.oneone();
  lastTime = Date.now();
  main();
}

window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad connected:", e.gamepad);
});
window.addEventListener("gamepaddisconnected", (e) => {
  console.log("Gamepad disconnected:", e.gamepad);
});

function handleCombinedInput(dt) {
  if (isGamepadConnected) {
    handleGamepadInput(dt);
  } else {
    handleInput(dt);
  }
}

/* Function to poll gamepad input and trigger player actions */
function handleGamepadInput(dt) {
  if (player.piping || player.dying || player.noInput) return;
  //console.log("searching for gamepad")
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0]; // Using the first connected gamepad
  if (!gp) return;
  //console.log("Gamepad Buttons count:", gp.buttons.length);

  // Log button states for debugging
  //gp.buttons.forEach((button, index) => {
  //  if (button.pressed) {
  //    console.log(`Button ${index} pressed`);
  //  }
  //});

  if (player.piping || player.dying || player.noInput) return;

  const actionState = {
    jumping: false,
    running: false,
    crouching: false,
    movingLeft: false,
    movingRight: false,
  };

  if (gp.buttons[1].pressed || gp.buttons[2].pressed) {
    player.run();
    actionState.running = true;
  } else player.noRun();

  if (gp.buttons[0].pressed) {
    player.jump();
    actionState.jumping = true;
  } else player.noJump();

  if (gp.buttons[13].pressed) {
    player.crouch();
    actionState.crouching = true;
  } else player.noCrouch();

  if (gp.buttons[14].pressed) {
    player.moveLeft();
    actionState.movingLeft = true;
  } else if (gp.buttons[15].pressed) {
    player.moveRight();
    actionState.movingRight = true;
  } else player.noWalk();

  sendGameplayUpdate({ action: actionState });
}

// Handles user input
function handleInput(dt) {
  if (player.piping || player.dying || player.noInput) return;

  const actionState = {
    jumping: false,
    running: false,
    crouching: false,
    movingLeft: false,
    movingRight: false,
  };

  if (input.isDown("RUN")) {
    player.run();
    actionState.running = true;
  } else player.noRun();

  if (input.isDown("JUMP")) {
    player.jump();
    actionState.jumping = true;
  } else player.noJump();

  if (input.isDown("DOWN")) {
    player.crouch();
    actionState.crouching = true;
  } else player.noCrouch();

  if (input.isDown("LEFT")) {
    player.moveLeft();
    actionState.movingLeft = true;
  } else if (input.isDown("RIGHT")) {
    player.moveRight();
    actionState.movingRight = true;
  } else player.noWalk();

  sendGameplayUpdate({ action: actionState });
}

// Updates all entities in the game
function updateEntities(dt, gameTime) {
  player.update(dt, vX);
  updateables.forEach((ent) => ent.update(dt, gameTime));

  if (player.exiting) {
    if (player.pos[0] > vX + 96) vX = player.pos[0] - 96;
  } else if (level.scrolling && player.pos[0] > vX + 80) {
    vX = player.pos[0] - 80;
  }

  if (player.powering.length !== 0 || player.dying) return;

  level.items.forEach((ent) => ent.update(dt));
  level.enemies.forEach((ent) => ent.update(dt, vX));
  fireballs.forEach((fireball) => fireball.update(dt));
  level.pipes.forEach((pipe) => pipe.update(dt));

  // Only send updates periodically
  sendGameplayUpdate({
    position: player.pos,
    velocity: player.vel,
    lives: player.lives,
    score: player.score
  });
}

// Checks collisions for all game entities
function checkCollisions() {
  if (player.powering.length !== 0 || player.dying) return;

  player.checkCollisions();
  level.items.forEach((item) => item.checkCollisions());
  level.enemies.forEach((enemy) => enemy.checkCollisions());
  fireballs.forEach((fireball) => fireball.checkCollisions());
  level.pipes.forEach((pipe) => pipe.checkCollisions());
}

// Render the game
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = level.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 15; i++) {
    for (let j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + 20; j++) {
      if (level.scenery[i][j]) renderEntity(level.scenery[i][j]);
    }
  }

  level.items.forEach((item) => renderEntity(item));
  level.enemies.forEach((enemy) => renderEntity(enemy));
  fireballs.forEach((fireball) => renderEntity(fireball));

  for (let i = 0; i < 15; i++) {
    for (let j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + 20; j++) {
      if (level.statics[i][j]) renderEntity(level.statics[i][j]);
      if (level.blocks[i][j]) {
        renderEntity(level.blocks[i][j]);
        updateables.push(level.blocks[i][j]);
      }
    }
  }

  if (player.invincibility % 2 === 0) renderEntity(player);
  level.pipes.forEach((pipe) => renderEntity(pipe));
}

// Helper function to render an entity
function renderEntity(entity) {
  entity.render(ctx, vX, vY);
}

// Main game loop
function main() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000.0;

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
}

// Update the game state
function update(dt) {
  gameTime += dt;
  //handleInput(dt);
  //handleGamepadInput(dt);

  handleCombinedInput(dt);
  updateEntities(dt, gameTime);
  checkCollisions();

  if (typeof window.updateInspector === 'function') {
    window.updateInspector();
  }
}

// Reset game back to sign-in screen
function resetToSignIn() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  if (timerDisplay) {
    timerDisplay.remove();
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = "none";
  showSignInForm();
}

// Add a mechanism to reset game when a level ends
function onGameEnd() {
  setTimeout(() => {
    // Reset current player for future updates
    playerId = null;
    if (timerInterval) clearInterval(timerInterval);
    if (timerDisplay) timerDisplay.remove();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";
    // Show the waiting room so a new player selection is made
    showWaitingRoom();
  }, 1000);
}

function createTimer() {
  timerDisplay = document.createElement('div');
  timerDisplay.className = 'timer';
  timerDisplay.textContent = gameTimer + 's';
  document.body.appendChild(timerDisplay);
}

function startGameTimer() {
  createTimer();
  timerInterval = setInterval(() => {
    gameTimer--;
    timerDisplay.textContent = gameTimer + 's';

    if (gameTimer <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function endGame() {
  // Pause all game music and sounds
  music.overworld.pause();
  music.underground.pause();

  // Show game over popup
  setTimeout(() => {
    alert('Time\'s up! Game Over!');
    window.location.reload();
  }, 100);
}

// Initialize the app
createCanvas();
showWaitingRoom();
