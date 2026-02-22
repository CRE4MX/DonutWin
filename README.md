# DonutWin
Mitko's Gambling Website

## Multi-File Casino Platform
DonutWin is a Node.js-powered online casino platform with six provably-fair games. The project has been refactored from a single HTML file into a proper multi-file architecture with a server backend, ready for public deployment.

### Features
- 🎰 **Crash** - Multiplier game with auto-cashout
- 💎 **Mines** - Minesweeper-style casino game
- 🎲 **Dice** - Classic dice rolling game
- 🎱 **Plinko** - Probability-based drop game
- 🃏 **Blackjack** - Card game against the dealer
- 🎰 **Slots** - Classic slot machine
- 🌍 **Country Royale** - Multiplayer betting game
- 🔐 **Provably Fair** - Cryptographic verification for all games
- 🔑 **Authentication** - Login & registration API
- 💬 **Live Chat** - Real-time chat API
- 💰 **Server-Side Credits** - Server-authoritative balance management
- 💳 **Payments** - Deposit & withdrawal API
- 🎵 **Sound Effects** - Optional audio feedback
- 📱 **Mobile-Responsive** - Works on all devices
- ✨ **Animated UI** - Smooth animations and effects

### Project Structure
```
DonutWin/
├── server.js            # Express server entry point
├── package.json         # Node.js dependencies
├── .env.example         # Environment config template
├── public/              # Static assets served by Express
│   ├── index.html       # Main casino page
│   ├── css/
│   │   └── style.css    # Extracted styles
│   └── js/
│       └── app.js       # Client-side game logic
├── routes/              # Server-side API routes
│   ├── auth.js          # POST /api/auth/login, /register, /logout, GET /me
│   ├── chat.js          # GET & POST /api/chat/messages
│   ├── credits.js       # GET /balance, POST /bet, /win, /reset
│   └── payments.js      # POST /deposit, /withdraw, GET /history
└── index.html           # Legacy single-file version (original)
```

### Getting Started
```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env

# Start the server
npm start
```

The server runs at `http://localhost:3000` by default.

### API Endpoints

| Method | Endpoint               | Description                     |
|--------|------------------------|---------------------------------|
| POST   | `/api/auth/register`   | Create a new account            |
| POST   | `/api/auth/login`      | Log in                          |
| POST   | `/api/auth/logout`     | Log out                         |
| GET    | `/api/auth/me`         | Get current user                |
| GET    | `/api/credits/balance` | Get user balance                |
| POST   | `/api/credits/bet`     | Place a bet (server-verified)   |
| POST   | `/api/credits/win`     | Credit a win (server-verified)  |
| POST   | `/api/credits/reset`   | Reset balance                   |
| GET    | `/api/chat/messages`   | Get recent chat messages        |
| POST   | `/api/chat/messages`   | Send a chat message             |
| POST   | `/api/payments/deposit`   | Initiate a deposit           |
| POST   | `/api/payments/withdraw`  | Initiate a withdrawal        |
| GET    | `/api/payments/history`   | Get transaction history      |

### Technical Details
- **Runtime**: Node.js with Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Session**: express-session (swap for Redis/DB store in production)
- **Games**: Client-side rendering, server-authoritative balance
