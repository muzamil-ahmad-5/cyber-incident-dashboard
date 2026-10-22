@echo off
title CYBERGUARD - Public Online Tunnel (Any Wi-Fi / Mobile)
echo ========================================================
echo CYBERGUARD SOC SENTINEL - PUBLIC INTERNET ACCESS
echo Share on ANY Wi-Fi, Mobile Data, or Remote Devices
echo ========================================================
echo.
echo [1/2] Checking Backend & Frontend Status...
netstat -ano | findstr ":8000" >nul
if errorlevel 1 (
    echo Starting Backend on Port 8000...
    start "CYBERGUARD - Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"
    timeout /t 2 /nobreak >nul
) else (
    echo Backend is already running on Port 8000.
)

netstat -ano | findstr ":5173" >nul
if errorlevel 1 (
    echo Starting Frontend on Port 5173...
    start "CYBERGUARD - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 0.0.0.0"
    timeout /t 2 /nobreak >nul
) else (
    echo Frontend is already running on Port 5173.
)

echo.
echo.
echo ========================================================
echo [DIRECT PUBLIC HTTPS TUNNEL]
echo No password required! Direct instant access from any Wi-Fi.
echo ========================================================
echo.
echo Launching direct secure tunnel...
echo.

ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:5173 nokey@localhost.run
pause

