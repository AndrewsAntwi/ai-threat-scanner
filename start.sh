#!/bin/bash
# AI Threat Scanner - Launch Script

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        AI THREAT SCANNER  v1.0               ║"
echo "║    AI Security Detection & Analysis          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Check Python ──────────────────────────────────────────────────────────────
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.10+"
    exit 1
fi

# ── Check Node ────────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Backend Setup ─────────────────────────────────────────────────────────────
echo "▸ Setting up Python backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "  Installing dependencies..."
pip install -q -r requirements.txt

mkdir -p data

# ── Frontend Setup ────────────────────────────────────────────────────────────
echo ""
echo "▸ Setting up React frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "  Installing npm packages (first run - takes ~2min)..."
    npm install --silent
fi

# ── Launch ────────────────────────────────────────────────────────────────────
echo ""
echo "▸ Starting services..."
echo ""

# Start backend
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  ✓ Backend: http://localhost:8000  (PID: $BACKEND_PID)"

sleep 2

# Start frontend
cd "$SCRIPT_DIR/frontend"
BROWSER=none npm start &
FRONTEND_PID=$!
echo "  ✓ Frontend: http://localhost:3000  (PID: $FRONTEND_PID)"

echo ""
echo "════════════════════════════════════════════════"
echo "  🟢 AI Threat Scanner is running!"
echo ""
echo "  Open: http://localhost:3000"
echo "  API:  http://localhost:8000/docs"
echo ""
echo "  First step: Go to Settings → enter OpenAI API key"
echo "════════════════════════════════════════════════"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    echo "Stopped."
}

trap cleanup EXIT INT TERM
wait
