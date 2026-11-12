"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const playBtn = document.getElementById("playBtn");
const muteBtn = document.getElementById("muteBtn");
const scoreDisplay = document.getElementById("scoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");

// Game State Variables
let score = 0;
let lives = 3;
let gameRunning = false;
let animationId;

// Player Ship
const player = {
   x: canvas.width / 2 - 20,
   y: canvas.height - 45,
   width: 40,
   height: 25,
   speed: 6,
   dx: 0
};

let torpedoes = [];
let enemies = [];
let stars = [];

// Audio Context for Built-In Low-Volume Sci-Fi Music & SFX
let audioCtx = null;
let bgMusicInterval = null;
let isMuted = false;

function initAudio() {
   if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
   }
   if (audioCtx.state === "suspended") {
      audioCtx.resume();
   }
}

function startBackgroundMusic() {
   initAudio();
   if (bgMusicInterval) clearInterval(bgMusicInterval);

   // Low-volume sci-fi arpeggio notes (Hz)
   const notes = [110, 130.81, 146.83, 164.81, 196.00, 164.81, 146.83, 130.81];
   let step = 0;

   bgMusicInterval = setInterval(() => {
      if (isMuted || !gameRunning) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[step % notes.length], audioCtx.currentTime);

      // Keep volume low (0.04) so it enhances without overpowering
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
      step++;
   }, 400);
}

function playLaserSound() {
   if (isMuted || !audioCtx) return;
   const osc = audioCtx.createOscillator();
   const gain = audioCtx.createGain();
   osc.type = "sawtooth";
   osc.frequency.setValueAtTime(600, audioCtx.currentTime);
   osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.15);

   gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
   gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

   osc.connect(gain);
   gain.connect(audioCtx.destination);
   osc.start();
   osc.stop(audioCtx.currentTime + 0.16);
}

// Create background stars inside canvas
for (let i = 0; i < 50; i++) {
   stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 1.5 + 0.5
   });
}

// Start / Restart Button Logic
playBtn.addEventListener("click", () => {
   // Remove focus from button so pressing Spacebar doesn't re-click it
   playBtn.blur();
   startGame();
});

muteBtn.addEventListener("click", () => {
   muteBtn.blur();
   isMuted = !isMuted;
   muteBtn.textContent = isMuted ? "Audio: OFF" : "Audio: ON";
});

function startGame() {
   score = 0;
   lives = 3;
   torpedoes = [];
   enemies = [];
   player.x = canvas.width / 2 - player.width / 2;
   gameRunning = true;

   updateHUD();
   playBtn.textContent = "RESTART MISSION";
   startBackgroundMusic();

   cancelAnimationFrame(animationId);
   gameLoop();
}

function updateHUD() {
   scoreDisplay.textContent = score;
   livesDisplay.textContent = lives;
}

// Keyboard Controls
document.addEventListener("keydown", (e) => {
   if (e.key === "ArrowLeft") {
      player.dx = -player.speed;
   } else if (e.key === "ArrowRight") {
      player.dx = player.speed;
   } else if (e.code === "Space" && gameRunning) {
      e.preventDefault();
      fireTorpedo();
   }
});

document.addEventListener("keyup", (e) => {
   if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      player.dx = 0;
   }
});

function fireTorpedo() {
   torpedoes.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 14,
      speed: 8
   });
   playLaserSound();
}

function spawnEnemy() {
   if (Math.random() < 0.025) {
      enemies.push({
         x: Math.random() * (canvas.width - 36),
         y: -30,
         width: 36,
         height: 24,
         speed: 2 + Math.random() * 2
      });
   }
}

function update() {
   // Scroll canvas stars
   stars.forEach(star => {
      star.y += star.speed;
      if (star.y > canvas.height) {
         star.y = 0;
         star.x = Math.random() * canvas.width;
      }
   });

   // Move player
   player.x += player.dx;
   if (player.x < 0) player.x = 0;
   if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

   // Move torpedoes
   torpedoes.forEach((t, index) => {
      t.y -= t.speed;
      if (t.y + t.height < 0) {
         torpedoes.splice(index, 1);
      }
   });

   // Spawn & move enemies
   spawnEnemy();
   enemies.forEach((enemy, eIndex) => {
      enemy.y += enemy.speed;

      // Check collision with torpedoes
      torpedoes.forEach((t, tIndex) => {
         if (
            t.x < enemy.x + enemy.width &&
            t.x + t.width > enemy.x &&
            t.y < enemy.y + enemy.height &&
            t.y + t.height > enemy.y
         ) {
            enemies.splice(eIndex, 1);
            torpedoes.splice(tIndex, 1);
            score += 100;
            updateHUD();
         }
      });

      // Check if enemy hits bottom or player
      if (enemy.y > canvas.height) {
         enemies.splice(eIndex, 1);
         lives--;
         updateHUD();
         if (lives <= 0) {
            endGame();
         }
      }
   });
}

function draw() {
   ctx.clearRect(0, 0, canvas.width, canvas.height);

   // Draw stars
   ctx.fillStyle = "#ffffff";
   stars.forEach(star => {
      ctx.fillRect(star.x, star.y, star.size, star.size);
   });

   // Draw Player Starfighter (Triangle Ship)
   ctx.fillStyle = "#00e5ff";
   ctx.beginPath();
   ctx.moveTo(player.x + player.width / 2, player.y);
   ctx.lineTo(player.x, player.y + player.height);
   ctx.lineTo(player.x + player.width, player.y + player.height);
   ctx.closePath();
   ctx.fill();

   // Draw Torpedoes
   ctx.fillStyle = "#ffca28";
   torpedoes.forEach(t => {
      ctx.fillRect(t.x, t.y, t.width, t.height);
   });

   // Draw Alien Ships
   ctx.fillStyle = "#ff4d6d";
   enemies.forEach(enemy => {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
   });
}

function endGame() {
   gameRunning = false;
   clearInterval(bgMusicInterval);
   playBtn.textContent = "PLAY AGAIN";

   ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
   ctx.fillRect(0, 0, canvas.width, canvas.height);

   ctx.fillStyle = "#ff4d6d";
   ctx.font = "bold 36px sans-serif";
   ctx.textAlign = "center";
   ctx.fillText("MISSION FAILED", canvas.width / 2, canvas.height / 2 - 15);

   ctx.fillStyle = "#ffffff";
   ctx.font = "20px sans-serif";
   ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 + 25);
}

function gameLoop() {
   if (!gameRunning) return;
   update();
   draw();
   animationId = requestAnimationFrame(gameLoop);
}

// Initial Attract Screen on Canvas
draw();
ctx.fillStyle = "#00e5ff";
ctx.font = "bold 24px sans-serif";
ctx.textAlign = "center";
ctx.fillText("PRESS 'LAUNCH MISSION' TO BEGIN", canvas.width / 2, canvas.height / 2);
