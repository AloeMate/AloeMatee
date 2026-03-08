@echo off
REM AloeVeraMate Setup Script for Windows

echo.
echo 🌿 AloeVeraMate Setup Script
echo ==============================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)

node --version
echo ✅ Node.js found
echo.

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python is not installed. Please install Python 3.10 or higher.
    exit /b 1
)

python --version
echo ✅ Python found
echo.

REM Setup Backend
echo 📦 Setting up backend...
cd apps\server

REM Create virtual environment
if not exist "venv" (
    python -m venv venv
    echo ✅ Created Python virtual environment
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo ✅ Backend dependencies installed

REM Copy environment file
if not exist ".env" (
    copy .env.example .env
    echo ✅ Created .env file from template
)

cd ..\..

REM Setup Mobile App
echo.
echo 📱 Setting up mobile app...
cd apps\mobile

REM Install dependencies
call npm install
echo ✅ Mobile app dependencies installed

REM Copy environment file
if not exist ".env" (
    copy .env.example .env
    echo ✅ Created .env file from template
    echo.
    echo ⚠️  IMPORTANT: Edit apps\mobile\.env and update EXPO_PUBLIC_API_URL
    echo    - For Android Emulator: use http://10.0.2.2:8000
    echo    - For iOS Simulator: use http://localhost:8000  
    echo    - For Physical Device: use http://YOUR_IP:8000
)

cd ..\..

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit apps\mobile\.env and set appropriate API URL
echo 2. Start backend: cd apps\server ^&^& venv\Scripts\activate ^&^& python run.py
echo 3. Start mobile: cd apps\mobile ^&^& npm start
echo.
echo See README.md for detailed instructions.
echo.
pause
