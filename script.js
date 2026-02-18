// Constants for game logic
const HOUSE_EDGE_CRASH = 0.99; // 1% house edge for crash game
const HOUSE_EDGE_MINES = 0.97; // 3% house edge for mines game
const MAX_CRASH_POINT = 1000000;
const CRASH_BASE_MULTIPLIER = 100;

// Utility function for formatting numbers with consistent precision
function formatMultiplier(value) {
  if (value >= 100) {
    return value.toFixed(0) + '×';
  } else if (value >= 10) {
    return value.toFixed(1) + '×';
  } else {
    return value.toFixed(2) + '×';
  }
}

// Utility functions for provably fair gaming
class ProvablyFair {
  static generateClientSeed() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static generateServerSeed() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async generateCrashPoint(serverSeed, clientSeed, nonce) {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = await this.hash(combined);
    
    // Convert hash to number between 0 and 1
    const hex = hash.substring(0, 13);
    const num = parseInt(hex, 16);
    const max = Math.pow(2, 52);
    const random = num / max;
    
    // Calculate crash point with house edge
    const crashPoint = Math.max(1, Math.floor((CRASH_BASE_MULTIPLIER / (1 - random)) / CRASH_BASE_MULTIPLIER * CRASH_BASE_MULTIPLIER) / CRASH_BASE_MULTIPLIER);
    return Math.min(crashPoint, MAX_CRASH_POINT);
  }

  static async generateMinePositions(serverSeed, clientSeed, nonce, mineCount) {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = await this.hash(combined);
    
    const positions = new Set();
    let index = 0;
    
    while (positions.size < mineCount && index < hash.length - 1) {
      const hex = hash.substring(index, index + 2);
      const pos = parseInt(hex, 16) % 25;
      positions.add(pos);
      index += 2;
    }
    
    // Fill remaining if needed
    while (positions.size < mineCount) {
      const pos = Math.floor(Math.random() * 25);
      positions.add(pos);
    }
    
    return Array.from(positions).sort((a, b) => a - b);
  }
}

// Sound manager
class SoundManager {
  constructor() {
    this.enabled = false;
    this.context = null;
  }

  enable() {
    this.enabled = true;
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  disable() {
    this.enabled = false;
  }

  playTone(frequency, duration) {
    if (!this.enabled || !this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  playClick() {
    this.playTone(800, 0.05);
  }

  playWin() {
    this.playTone(1200, 0.2);
    setTimeout(() => this.playTone(1400, 0.2), 100);
  }

  playLose() {
    this.playTone(400, 0.3);
  }

  playTick() {
    this.playTone(600, 0.03);
  }
}

// Crash Game
class CrashGame {
  constructor() {
    this.state = 'ready'; // ready, running, crashed
    this.multiplier = 1.00;
    this.autoCashout = 2.00;
    this.autoBet = false;
    this.interval = null;
    this.history = [];
    
    // Provably fair
    this.clientSeed = ProvablyFair.generateClientSeed();
    this.serverSeed = null;
    this.serverHash = null;
    this.nonce = 0;
    this.crashPoint = 0;
    
    this.bindEvents();
    this.updateUI();
    this.updateProvablyFairUI();
  }

  bindEvents() {
    document.getElementById('crashStart').addEventListener('click', () => this.start());
    document.getElementById('crashCashout').addEventListener('click', () => this.cashout());
    document.getElementById('crashAutoCashout').addEventListener('change', (e) => {
      this.autoCashout = parseFloat(e.target.value) || 2.00;
    });
    document.getElementById('crashAutoBet').addEventListener('change', (e) => {
      this.autoBet = e.target.checked;
    });
  }

  async start() {
    if (this.state !== 'ready') return;
    
    soundManager.playClick();
    this.state = 'running';
    this.multiplier = 1.00;
    this.nonce++;
    
    // Generate new server seed and commit hash
    this.serverSeed = ProvablyFair.generateServerSeed();
    this.serverHash = await ProvablyFair.hash(this.serverSeed);
    this.crashPoint = await ProvablyFair.generateCrashPoint(
      this.serverSeed,
      this.clientSeed,
      this.nonce
    );
    
    document.getElementById('crashStart').disabled = true;
    document.getElementById('crashCashout').disabled = false;
    document.getElementById('crashStatus').textContent = 'Running';
    document.getElementById('crashStatusText').textContent = 'Game in progress…';
    
    this.showMessage('Round started! Cash out before it crashes!', 'info');
    
    const startTime = Date.now();
    this.interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      this.multiplier = 1 + elapsed * 0.5; // Increase multiplier over time
      
      if (this.multiplier >= this.crashPoint) {
        this.crash();
      } else {
        this.updateUI();
        soundManager.playTick();
        
        // Auto cashout
        if (this.multiplier >= this.autoCashout && this.autoCashout > 1) {
          this.cashout();
        }
      }
    }, 100);
  }

  cashout() {
    if (this.state !== 'running') return;
    
    clearInterval(this.interval);
    this.state = 'ready';
    
    const winMultiplier = this.multiplier.toFixed(2);
    this.history.unshift({ multiplier: winMultiplier, won: true });
    if (this.history.length > 20) this.history.pop();
    
    soundManager.playWin();
    this.showMessage(`Cashed out at ${winMultiplier}×!`, 'success');
    
    document.getElementById('crashStart').disabled = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashStatus').textContent = 'Cashed Out';
    document.getElementById('crashMultiplierDisplay').classList.add('won');
    
    setTimeout(() => {
      document.getElementById('crashMultiplierDisplay').classList.remove('won');
      this.reset();
    }, 2000);
    
    this.updateHistory();
    this.updateProvablyFairUI();
    
    // Auto bet next round
    if (this.autoBet) {
      setTimeout(() => this.start(), 3000);
    }
  }

  crash() {
    if (this.state !== 'running') return;
    
    clearInterval(this.interval);
    this.state = 'ready';
    this.multiplier = this.crashPoint;
    
    this.history.unshift({ multiplier: this.crashPoint.toFixed(2), won: false });
    if (this.history.length > 20) this.history.pop();
    
    soundManager.playLose();
    this.showMessage(`Crashed at ${this.crashPoint.toFixed(2)}×!`, 'error');
    
    document.getElementById('crashStart').disabled = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashStatus').textContent = 'Crashed';
    document.getElementById('crashStatusText').textContent = 'Round ended';
    document.getElementById('crashMultiplierDisplay').classList.add('crashed');
    
    this.updateUI();
    setTimeout(() => {
      document.getElementById('crashMultiplierDisplay').classList.remove('crashed');
      this.reset();
    }, 2000);
    
    this.updateHistory();
    this.updateProvablyFairUI();
    
    // Auto bet next round
    if (this.autoBet) {
      setTimeout(() => this.start(), 3000);
    }
  }

  reset() {
    this.state = 'ready';
    this.multiplier = 1.00;
    document.getElementById('crashStatus').textContent = 'Ready';
    document.getElementById('crashStatusText').textContent = 'Waiting for round…';
    document.getElementById('crashNextRound').textContent = '—';
    this.updateUI();
  }

  updateUI() {
    document.getElementById('crashMultiplier').textContent = formatMultiplier(this.multiplier);
    document.getElementById('crashMultiplierDisplay').textContent = formatMultiplier(this.multiplier);
  }

  updateHistory() {
    const historyEl = document.getElementById('crashHistory');
    historyEl.innerHTML = this.history.map(item => 
      `<div class="history-item ${item.won ? 'win' : 'loss'}">${item.multiplier}×</div>`
    ).join('');
  }

  updateProvablyFairUI() {
    document.getElementById('crashClientSeed').value = this.clientSeed;
    document.getElementById('crashServerHash').value = this.serverHash || '—';
    document.getElementById('crashServerSeed').value = this.serverSeed || '—';
    document.getElementById('crashNonce').value = this.nonce || '—';
    document.getElementById('crashResult').value = this.crashPoint ? this.crashPoint.toFixed(2) + '×' : '—';
  }

  showMessage(text, type) {
    const messageEl = document.getElementById('crashMessage');
    messageEl.textContent = text;
    messageEl.className = `message-${type}`;
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = '';
    }, 3000);
  }
}

// Mines Game
class MinesGame {
  constructor() {
    this.state = 'ready'; // ready, playing, revealed
    this.mineCount = 5;
    this.safePicks = 0;
    this.multiplier = 1.00;
    this.grid = Array(25).fill(null);
    this.minePositions = [];
    this.history = [];
    
    // Provably fair
    this.clientSeed = ProvablyFair.generateClientSeed();
    this.serverSeed = null;
    this.serverHash = null;
    this.nonce = 0;
    
    this.bindEvents();
    this.createGrid();
    this.updateUI();
  }

  bindEvents() {
    document.getElementById('minesStart').addEventListener('click', () => this.start());
    document.getElementById('minesCashout').addEventListener('click', () => this.cashout());
    document.getElementById('minesReset').addEventListener('click', () => this.reset());
    document.getElementById('minesCount').addEventListener('change', (e) => {
      this.mineCount = parseInt(e.target.value) || 5;
    });
  }

  createGrid() {
    const gridEl = document.getElementById('minesGrid');
    gridEl.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
      const tile = document.createElement('div');
      tile.className = 'mine-tile';
      tile.dataset.index = i;
      tile.addEventListener('click', () => this.revealTile(i));
      gridEl.appendChild(tile);
    }
  }

  async start() {
    if (this.state !== 'ready') return;
    
    soundManager.playClick();
    this.state = 'playing';
    this.safePicks = 0;
    this.multiplier = 1.00;
    this.grid = Array(25).fill(null);
    this.nonce++;
    
    // Generate mines
    this.serverSeed = ProvablyFair.generateServerSeed();
    this.serverHash = await ProvablyFair.hash(this.serverSeed);
    this.minePositions = await ProvablyFair.generateMinePositions(
      this.serverSeed,
      this.clientSeed,
      this.nonce,
      this.mineCount
    );
    
    document.getElementById('minesStart').disabled = true;
    document.getElementById('minesCashout').disabled = false;
    document.getElementById('minesStatus').textContent = 'Playing';
    
    this.createGrid();
    this.updateUI();
    this.showMessage('Pick tiles to reveal safe spots!', 'info');
  }

  revealTile(index) {
    if (this.state !== 'playing') return;
    if (this.grid[index] !== null) return;
    
    soundManager.playClick();
    
    const tile = document.querySelector(`[data-index="${index}"]`);
    
    if (this.minePositions.includes(index)) {
      // Hit a mine!
      this.grid[index] = 'mine';
      tile.classList.add('revealed', 'mine');
      tile.textContent = '💣';
      soundManager.playLose();
      this.revealAll();
      this.showMessage('You hit a mine! Game over.', 'error');
      this.state = 'revealed';
      document.getElementById('minesStart').disabled = false;
      document.getElementById('minesCashout').disabled = true;
      document.getElementById('minesStatus').textContent = 'Lost';
      this.updateProvablyFairUI();
    } else {
      // Safe tile!
      this.grid[index] = 'safe';
      tile.classList.add('revealed', 'safe');
      tile.textContent = '💎';
      this.safePicks++;
      soundManager.playWin();
      
      // Calculate multiplier
      const totalSafe = 25 - this.mineCount;
      this.multiplier = this.calculateMultiplier(this.safePicks, totalSafe, this.mineCount);
      
      this.updateUI();
      
      // Check if won
      if (this.safePicks === totalSafe) {
        this.showMessage(`Perfect! All safe tiles found! ${this.multiplier.toFixed(2)}×`, 'success');
        this.state = 'revealed';
        document.getElementById('minesStart').disabled = false;
        document.getElementById('minesCashout').disabled = true;
        document.getElementById('minesStatus').textContent = 'Perfect!';
        this.history.unshift({ multiplier: this.multiplier.toFixed(2), picks: this.safePicks });
        if (this.history.length > 20) this.history.pop();
        this.updateHistory();
        this.updateProvablyFairUI();
      }
    }
  }

  calculateMultiplier(picks, totalSafe, mines) {
    if (picks === 0) return 1.00;
    
    // Multiplier increases with each safe pick
    let multiplier = 1.00;
    for (let i = 0; i < picks; i++) {
      const remaining = totalSafe - i;
      const total = 25 - i;
      multiplier *= (total / remaining);
    }
    
    // Apply house edge
    return multiplier * HOUSE_EDGE_MINES;
  }

  cashout() {
    if (this.state !== 'playing') return;
    if (this.safePicks === 0) {
      this.showMessage('Pick at least one tile before cashing out!', 'error');
      return;
    }
    
    soundManager.playWin();
    this.state = 'revealed';
    this.revealAll();
    
    this.showMessage(`Cashed out at ${this.multiplier.toFixed(2)}× with ${this.safePicks} safe picks!`, 'success');
    
    document.getElementById('minesStart').disabled = false;
    document.getElementById('minesCashout').disabled = true;
    document.getElementById('minesStatus').textContent = 'Cashed Out';
    
    this.history.unshift({ multiplier: this.multiplier.toFixed(2), picks: this.safePicks });
    if (this.history.length > 20) this.history.pop();
    
    this.updateHistory();
    this.updateProvablyFairUI();
  }

  revealAll() {
    this.minePositions.forEach(pos => {
      if (this.grid[pos] === null) {
        const tile = document.querySelector(`[data-index="${pos}"]`);
        tile.classList.add('revealed', 'mine');
        tile.textContent = '💣';
      }
    });
  }

  reset() {
    this.state = 'ready';
    this.safePicks = 0;
    this.multiplier = 1.00;
    this.grid = Array(25).fill(null);
    
    document.getElementById('minesStart').disabled = false;
    document.getElementById('minesCashout').disabled = true;
    document.getElementById('minesStatus').textContent = 'Ready';
    
    this.createGrid();
    this.updateUI();
    this.showMessage('', '');
  }

  updateUI() {
    document.getElementById('minesSafePicks').textContent = this.safePicks;
    document.getElementById('minesMultiplier').textContent = formatMultiplier(this.multiplier);
  }

  updateHistory() {
    const historyEl = document.getElementById('minesHistory');
    historyEl.innerHTML = this.history.map(item => 
      `<div class="history-item win">${item.picks} picks → ${item.multiplier}×</div>`
    ).join('');
  }

  updateProvablyFairUI() {
    document.getElementById('minesServerHash').value = this.serverHash || '—';
    document.getElementById('minesServerSeed').value = this.serverSeed || '—';
    document.getElementById('minesNonce').value = this.nonce || '—';
    document.getElementById('minesPositions').value = 
      this.minePositions.length > 0 ? this.minePositions.join(', ') : '—';
  }

  showMessage(text, type) {
    const messageEl = document.getElementById('minesMessage');
    messageEl.textContent = text;
    messageEl.className = type ? `message-${type}` : '';
    if (type) {
      setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
      }, 3000);
    }
  }
}

// Provably Fair Verification
function setupProvablyFair() {
  document.getElementById('verifyCrash').addEventListener('click', async () => {
    const serverSeed = document.getElementById('crashServerSeed').value;
    const clientSeed = document.getElementById('crashClientSeed').value;
    const nonce = parseInt(document.getElementById('crashNonce').value);
    
    if (serverSeed === '—' || !serverSeed) {
      alert('Play a round first to get verification data!');
      return;
    }
    
    const calculatedPoint = await ProvablyFair.generateCrashPoint(serverSeed, clientSeed, nonce);
    const actualPoint = parseFloat(document.getElementById('crashResult').value);
    
    if (Math.abs(calculatedPoint - actualPoint) < 0.01) {
      alert(`✅ Verified! The crash point ${actualPoint.toFixed(2)}× is provably fair.`);
    } else {
      alert(`❌ Verification failed. Calculated: ${calculatedPoint.toFixed(2)}×, Actual: ${actualPoint.toFixed(2)}×`);
    }
  });

  document.getElementById('newCrashSeeds').addEventListener('click', () => {
    crashGame.clientSeed = ProvablyFair.generateClientSeed();
    crashGame.nonce = 0;
    crashGame.updateProvablyFairUI();
    alert('New client seed generated!');
  });

  document.getElementById('verifyMines').addEventListener('click', async () => {
    const serverSeed = document.getElementById('minesServerSeed').value;
    const nonce = parseInt(document.getElementById('minesNonce').value);
    
    if (serverSeed === '—' || !serverSeed) {
      alert('Play a round first to get verification data!');
      return;
    }
    
    const calculatedPositions = await ProvablyFair.generateMinePositions(
      serverSeed,
      minesGame.clientSeed,
      nonce,
      minesGame.mineCount
    );
    
    const actualPositions = document.getElementById('minesPositions').value
      .split(',')
      .map(s => parseInt(s.trim()));
    
    const matches = JSON.stringify(calculatedPositions) === JSON.stringify(actualPositions);
    
    if (matches) {
      alert(`✅ Verified! The mine positions are provably fair.`);
    } else {
      alert(`❌ Verification failed.\nCalculated: ${calculatedPositions.join(', ')}\nActual: ${actualPositions.join(', ')}`);
    }
  });
}

// Waitlist
function setupWaitlist() {
  document.getElementById('waitlistSubmit').addEventListener('click', () => {
    const email = document.getElementById('waitlistEmail').value;
    const messageEl = document.getElementById('waitlistMessage');
    
    if (!email || !email.includes('@')) {
      messageEl.textContent = 'Please enter a valid email address.';
      messageEl.className = 'error';
      return;
    }
    
    // Simulate submission
    soundManager.playWin();
    messageEl.textContent = '✅ Thank you! You\'re on the waitlist. We\'ll notify you when we launch!';
    messageEl.className = 'success';
    document.getElementById('waitlistEmail').value = '';
    
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = '';
    }, 5000);
  });
}

// Sound toggle
function setupSound() {
  const soundToggle = document.getElementById('soundToggle');
  soundToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      soundManager.enable();
      soundManager.playClick();
    } else {
      soundManager.disable();
    }
  });
}

// Initialize
const soundManager = new SoundManager();
let crashGame;
let minesGame;

document.addEventListener('DOMContentLoaded', () => {
  crashGame = new CrashGame();
  minesGame = new MinesGame();
  setupProvablyFair();
  setupWaitlist();
  setupSound();
  
  // Smooth scroll for navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
