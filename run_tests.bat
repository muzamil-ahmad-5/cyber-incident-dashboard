@echo off
echo ========================================================
echo Running Automated Pytest Backend Test Suite
echo ========================================================
cd /d %~dp0backend
.\venv\Scripts\python.exe -m pytest -v
pause
