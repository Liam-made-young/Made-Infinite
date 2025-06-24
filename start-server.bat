@echo off
title MADE INFINITE - Music Portal Server
echo ================================================
echo    MADE INFINITE - Starting Server
echo ================================================
echo.
echo Hardware: 32GB RAM + Intel i9 (Beast Mode!)
echo Storage: Local (Unlimited)
echo Stem Processing: ENABLED with full power
echo.

REM Copy desktop environment file
copy env.desktop .env

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

REM Get local IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LOCAL_IP=%%i
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo ================================================
echo           SERVER STARTING
echo ================================================
echo.
echo Access URLs:
echo - Local:    http://localhost:3000
echo - Network:  http://%LOCAL_IP%:3000
echo.
echo Features Available:
echo - Music Upload (up to 1GB files)
echo - Stem Separation (Demucs + Spleeter)
echo - Unlimited Processing
echo - No quotas or limits!
echo.
echo Press Ctrl+C to stop server
echo ================================================
echo.

REM Start the server
node server.js

pause 