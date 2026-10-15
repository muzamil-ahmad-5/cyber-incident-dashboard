@echo off
echo ========================================================
echo CYBERGUARD - Security Incident Dashboard
echo Launching Backend (Port 8000) and Frontend (Port 5173)...
echo ========================================================

start "CYBERGUARD - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

start "CYBERGUARD - Frontend (React Vite)" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 0.0.0.0"

timeout /t 2 /nobreak >nul

start http://localhost:5173

echo ========================================================
echo Applications launched successfully!
echo Backend API Docs: http://127.0.0.1:8000/docs
echo Frontend (Laptop): http://localhost:5173
echo Frontend (Mobile): http://10.60.14.133:5173 (Same Wi-Fi)
echo ========================================================
