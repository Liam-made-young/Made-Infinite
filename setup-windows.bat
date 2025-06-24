@echo off
echo ================================================
echo    MADE INFINITE - Windows Desktop Setup
echo ================================================
echo.
echo Hardware Detected:
echo - 32GB RAM (Perfect for Demucs!)
echo - Intel i9 CPU (High Performance!)
echo - 2TB+ Storage (Unlimited space!)
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/8] Installing Chocolatey (Windows Package Manager)...
powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"

echo [2/8] Installing Node.js...
choco install nodejs -y

echo [3/8] Installing Python...
choco install python -y

echo [4/8] Installing Git...
choco install git -y

echo [5/8] Installing FFmpeg...
choco install ffmpeg -y

echo [6/8] Refreshing environment variables...
call refreshenv

echo [7/8] Installing Python packages...
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install demucs spleeter numpy librosa soundfile scipy

echo [8/8] Pre-downloading Demucs models...
python -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')"
python -c "import demucs.pretrained; demucs.pretrained.get_model('mdx_extra')"

echo.
echo ================================================
echo         INSTALLATION COMPLETE!
echo ================================================
echo.
echo Next steps:
echo 1. Navigate to your MADE_INFINITE folder
echo 2. Run: npm install
echo 3. Run: node server.js
echo 4. Open browser to: http://localhost:3000
echo.
echo For network access from other devices:
echo - Local network: http://YOUR_PC_IP:3000
echo - External access: Use ngrok or port forwarding
echo.
pause 