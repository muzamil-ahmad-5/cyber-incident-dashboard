@echo off
echo ========================================================
echo Launching CYBERGUARD SOC Dashboard - React Frontend
echo Local URL:   http://localhost:5173
echo Mobile/LAN:  http://10.60.14.133:5173
echo ========================================================
cd /d %~dp0frontend
npm run dev -- --host 0.0.0.0
pause
