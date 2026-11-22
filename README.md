# ScoreSync 🏆
Real-time, website-based game scoring application designed for game nights, parties, and tournaments with zero signup friction.

---

## 🌟 Highlights & Features
- **Zero Login / Signup Friction**: Host creates a game instantly; players join by scanning a QR code, using a direct link, or entering a 6-character Game ID.
- **Strict Role Authority**: Only the host can start the game, enter scores, edit rounds, or complete the match. Players enjoy clean, read-only live synchronization.
- **Single-Service Architecture**: Unified Python FastAPI backend that serves the compiled React Single-Page Application, REST APIs, and live WebSockets from one single port and service.
- **Dynamic Scoring Rules**: Supports both **Highest Score Wins** and **Lowest Score Wins** modes with tie-breaking rules.
- **Mid-Game Joining & Admission Lock**: New players can join ongoing games at any point via the on-screen corner QR code. If the host is actively entering/editing scores, an admission lock safely queues newcomers until the round starts.
- **Historical Round Editing & Audit History**: Host can correct past round scores with an automatic audit trail; all connected devices update their leaderboards in real time.
- **Comedic Round Tracking**: Late joiners viewing past rounds they missed see witty indicators (`Not born yet 🐣` / `You didn’t exist here! 👻`).
- **Live Event Toasts**: Attention-grabbing animated toast notifications slide in whenever players join or leave.
- **One-Click "Play Again" & "Home"**:
  - *Play Again*: Reverts all connected devices directly back to the lobby together for another match.
  - *Home*: Cleans up the active game from MongoDB Atlas and cleanly terminates all player connections.
- **1-Hour Auto-Cleanup**: Automated expiration removes completed games after 1 hour of host inactivity to keep database storage minimal.

---

## 🛠️ Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Lucide React, HTML5-QRCode, Canvas Confetti.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Motor (Async MongoDB), WebSockets, Pydantic v2.
- **Database**: MongoDB Atlas (Free Tier compatible).
- **Hosting**: Render (Single Unified Web Service) + UptimeRobot (1 single ping target at `/health`).

---

## 📁 Repository Structure
```text
ScoreSync/
├── backend/
│   ├── main.py              # FastAPI app, WebSocket manager & SPA static server
│   ├── database.py          # MongoDB client configuration (Motor)
│   ├── models.py            # Pydantic data schemas (Game, Player, Round, Audit)
│   ├── scoring.py           # Ranking algorithms & leaderboard calculations
│   ├── requirements.txt     # Python backend dependencies
│   └── .env.example         # Template for environment variables
├── frontend/
│   ├── src/
│   │   ├── components/      # Avatar, Add/Edit Round sheets, Modals, Toasts, SVGs
│   │   ├── screens/         # Welcome, Create, GameCreated, Join, Waiting, Dashboard, Leaderboard, Results
│   │   ├── store/           # Zustand state management with local persistence
│   │   ├── services/        # Dynamic API & WebSocket client
│   │   ├── types/           # TypeScript definitions
│   │   ├── App.tsx          # React Router setup
│   │   └── main.tsx         # Root entry point
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.ts       # Vite bundler configuration
│   └── tsconfig.json        # TypeScript configuration
├── .gitignore               # Strict exclusion of secrets, node_modules & build artifacts
├── package.json             # Root monorepo build & start script for Render
└── README.md                # Project documentation
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB Atlas** database cluster (or local MongoDB)

### 2. Clone & Setup Environment
```bash
git clone https://github.com/<your-username>/ScoreSync.git
cd ScoreSync

# Configure backend environment
cp backend/.env.example backend/.env
```
Open `backend/.env` and insert your MongoDB connection string:
```env
MONGODB_URI=your_mongodb_connection_string
DATABASE_NAME=scoresync
PORT=8000
HOST=0.0.0.0
```

### 3. Install Dependencies & Build
```bash
# 1. Install frontend packages and build static bundle
cd frontend
npm install
npm run build
cd ..

# 2. Install backend Python dependencies
pip install -r backend/requirements.txt
```

### 4. Run the Unified Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- Open in your browser: `http://localhost:8000`
- Access from mobile devices on the same Wi-Fi: `http://<your-computer-ip>:8000`

---

## ☁️ Deployment on Render (Single Web Service)

Deploy the entire full-stack app (React + FastAPI + WebSockets) as **1 single Render Web Service**:

1. **Create Web Service** on Render connected to your GitHub repository.
2. **Environment**: `Python 3`
3. **Build Command**:
   ```bash
   npm --prefix frontend install && npm --prefix frontend run build && pip install -r backend/requirements.txt
   ```
4. **Start Command**:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
5. **Environment Variables**:
   - `MONGODB_URI`: *Your MongoDB connection string*
   - `DATABASE_NAME`: `scoresync`
6. **Keep Awake (24/7)**: Set up a single monitor on [UptimeRobot](https://uptimerobot.com) pinging `https://<your-render-url>/health` every 5–10 minutes.

---

## 📄 License
This project is open-source and available under the MIT License.

Made with ❤️ By Sumit G.
