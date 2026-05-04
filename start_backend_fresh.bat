@echo off
REM Kill any running Python processes
taskkill /F /IM python.exe /T 2>nul
timeout /t 3 /nobreak
REM Start fresh backend server
cd /d C:\Users\sehan\Desktop\AloeMatee\apps\server
echo Starting backend server from: %CD%
C:\Program Files\Python311\python.exe run.py
pause
