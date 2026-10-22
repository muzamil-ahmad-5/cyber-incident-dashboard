@echo off
title Push Cyber Incident Dashboard to GitHub
color 0b
echo ========================================================
echo   CYBERGUARD: Pushing Full Project to GitHub
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Adding all files and source directories...
git add .

echo.
echo [2/3] Setting branch to main...
git branch -M main

echo.
echo [3/3] Uploading all code to GitHub (muzamil-ahmad-5/cyber-incident-dashboard)...
echo If prompted, click "Sign in with your browser" in the popup window.
echo.
git push -u origin main --force

echo.
echo ========================================================
echo   Upload complete! Vercel is now building your site.
echo ========================================================
echo.
pause
