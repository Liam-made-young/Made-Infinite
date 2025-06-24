# MADE INFINITE - Windows Desktop Setup Guide

## 🔥 Your Hardware (Perfect for Demucs!)
- **32GB RAM** - 4x more than we could get on cloud!
- **Intel i9 CPU** - High-performance processing
- **2TB+ Storage** - Unlimited space for music
- **Windows 10/11** - Ready to rock!

## 🚀 Quick Setup (5 Minutes)

### Step 1: Copy Files to Desktop
1. Copy the entire `MADE_INFINITE` folder to your desktop
2. Navigate to the folder in File Explorer

### Step 2: Run Automatic Setup
1. **Right-click** on `setup-windows.bat`
2. Select **"Run as administrator"** 
3. Wait for installation (5-10 minutes)
   - Installs Node.js, Python, Demucs, etc.
   - Downloads AI models (~300MB)

### Step 3: Start Server
1. Double-click `start-server.bat`
2. Server will start automatically
3. Open browser to displayed URLs

## 🌐 Access Your Server

### Local Access
```
http://localhost:3000
```

### Network Access (from phones, tablets, other computers)
```
http://YOUR_PC_IP:3000
```
The startup script will show your PC's IP address.

### External Access (from anywhere on internet)
Install ngrok for external access:
```bash
# Download ngrok from https://ngrok.com/
# Run: ngrok http 3000
```

## ⚡ Performance Advantages

### vs Cloud Run Free Tier:
- **RAM**: 32GB vs 1GB (32x more!)
- **Processing**: Unlimited vs quota limited
- **Speed**: Local disk vs network storage
- **Cost**: Free vs pay-per-use

### Demucs Performance:
- **Multiple concurrent stems** (4+ at once)
- **Full quality models** (not memory-limited)
- **Fast local storage** (no upload/download delays)
- **GPU support** (if you add NVIDIA GPU later)

## 🛠️ Configuration

### Environment File (`env.desktop`)
- **Storage**: Local (unlimited)
- **Processing**: Full power mode
- **File size**: Up to 1GB
- **Concurrent jobs**: 4 simultaneous stems

### Server Settings:
- **Port**: 3000 (changeable)
- **Memory**: Uses all 32GB as needed
- **CPU**: Uses all i9 cores
- **Timeout**: 30 minutes per stem

## 🔧 Advanced Setup

### Enable GPU Acceleration (Optional)
If you have NVIDIA GPU:
```bash
pip uninstall torch torchaudio
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Auto-Start on Boot
1. Press `Win+R`, type `shell:startup`
2. Copy `start-server.bat` to startup folder
3. Server starts when Windows boots

### Port Forwarding (External Access)
1. Router settings → Port Forwarding
2. Forward port 3000 → Your PC's IP
3. Access via your public IP:3000

## 📱 Network Access Setup

### Find Your PC's IP:
```bash
ipconfig
# Look for "IPv4 Address"
```

### Allow Through Windows Firewall:
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Add Node.js and allow on private network

### Access from Other Devices:
- **Phones**: http://PC_IP:3000
- **Tablets**: http://PC_IP:3000  
- **Other PCs**: http://PC_IP:3000

## 🎵 Usage Examples

### Upload Music:
- Drag & drop files up to 1GB
- Supports MP3, WAV, FLAC, M4A

### Stem Separation:
- Click "Process Stems" on any song
- Uses full 32GB RAM + i9 power
- Results in 2-5 minutes (vs 10+ on cloud)

### Multiple Users:
- Family/friends can access simultaneously
- Each gets their own session
- Concurrent processing supported

## 🔍 Troubleshooting

### Server Won't Start:
```bash
# Check if port is in use
netstat -an | findstr 3000

# Kill any existing process
taskkill /f /im node.exe
```

### Python/Demucs Issues:
```bash
# Reinstall Python packages
pip uninstall demucs spleeter
pip install demucs spleeter
```

### Network Access Issues:
- Check Windows Firewall settings
- Verify PC's IP address hasn't changed
- Ensure router allows local network traffic

## 💡 Pro Tips

### Performance:
- Close unnecessary programs while processing
- Use SSD for faster file operations
- Monitor Task Manager during processing

### Storage:
- Processed stems saved locally
- Organize by artist/album folders
- Backup important stems to external drive

### Security:
- Only allow network access on trusted networks
- Use strong admin password
- Consider VPN for external access

## 🎉 You're Ready!

Your desktop server will be **significantly faster and more powerful** than any cloud solution, with:
- ✅ **No limits** on processing
- ✅ **No costs** per stem separation  
- ✅ **Full control** over your music files
- ✅ **32GB RAM** for lightning-fast processing
- ✅ **Unlimited storage** for your music library

**Enjoy your personal music stem separation beast!** 🎵🔥 