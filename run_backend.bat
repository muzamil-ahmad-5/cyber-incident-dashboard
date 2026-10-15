@echo off
echo ========================================================
echo Launching Security Incident Dashboard - FastAPI Backend
echo Port: 8000 | SQLite Database: data/incident_dashboard.db
echo ========================================================
cd /d %~dp0backend
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
pause
