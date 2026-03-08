@echo off
REM Train both Stage A and Stage B, then copy to server

echo ==========================================
echo Training Two-Stage Pipeline
echo ==========================================

cd /d "%~dp0\.."

REM Train Stage A
echo.
echo 🔷 Training Stage A...
call scripts\train_stage_a.bat
if errorlevel 1 (
    echo ERROR: Stage A training failed
    exit /b 1
)

REM Train Stage B
echo.
echo 🔶 Training Stage B...
call scripts\train_stage_b.bat
if errorlevel 1 (
    echo ERROR: Stage B training failed
    exit /b 1
)

REM Copy to server
echo.
echo 📦 Copying artifacts to server...

set SERVER_DIR=..\server\data\models
if not exist "%SERVER_DIR%\stage_a" mkdir "%SERVER_DIR%\stage_a"
if not exist "%SERVER_DIR%\stage_b" mkdir "%SERVER_DIR%\stage_b"

REM Copy Stage A
echo   Copying stage_a artifacts...
copy /Y artifacts\stage_a\model.pt "%SERVER_DIR%\stage_a\" >nul
copy /Y artifacts\stage_a\model_metadata.json "%SERVER_DIR%\stage_a\" >nul
if exist artifacts\stage_a\calibration.json (
    copy /Y artifacts\stage_a\calibration.json "%SERVER_DIR%\stage_a\" >nul
)

REM Copy Stage B
echo   Copying stage_b artifacts...
copy /Y artifacts\stage_b\model.pt "%SERVER_DIR%\stage_b\" >nul
copy /Y artifacts\stage_b\model_metadata.json "%SERVER_DIR%\stage_b\" >nul
if exist artifacts\stage_b\calibration.json (
    copy /Y artifacts\stage_b\calibration.json "%SERVER_DIR%\stage_b\" >nul
)

echo.
echo ==========================================
echo ✅ Two-Stage Training Complete!
echo ==========================================
echo Stage A artifacts: %SERVER_DIR%\stage_a\
echo Stage B artifacts: %SERVER_DIR%\stage_b\
echo.
echo Next steps:
echo   1. Review training metrics in artifacts\
echo   2. Test the server with the new models
echo   3. Deploy to production
echo.
