# 🎵 Stem Processing Setup Guide

Transform your MADE INFINITE music portal into an interactive stem player! This feature automatically separates every uploaded song into 4 tracks: **Vocals**, **Drums**, **Bass**, and **Instruments**.

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Set up Python environment and Spleeter
chmod +x setup-spleeter.sh
./setup-spleeter.sh
```

### Step 2: Configure Environment
Add these variables to your `.env` file:
```env
# Enable stem processing
ENABLE_STEM_PROCESSING=true

# Python configuration (optional - defaults shown)
PYTHON_PATH=python3
SPLEETER_ENV_PATH=./spleeter-env/bin/activate
```

### Step 3: Test the Setup
```bash
# Start the server
npm start

# Upload a song and watch the magic happen!
```

## 🎛️ How It Works

### Upload Process
1. **User uploads** an audio file
2. **Server processes** the file with Spleeter AI
3. **Four stems generated**: vocals, drums, bass, instruments
4. **All files stored** in your chosen storage (GCS/Cloudinary)
5. **Interactive player** loads with individual track controls

### Stem Separation Technology
- **AI Model**: Spleeter by Deezer (Facebook's Demucs also available)
- **Processing Time**: ~30-60 seconds per song
- **Quality**: Professional-grade source separation
- **Format**: High-quality WAV files

## 🎮 Frontend Features (Coming Next)

### Multi-Track Player
- **4 individual volume sliders** (Vocals, Drums, Bass, Instruments)
- **Mute/Solo buttons** for each track
- **Synchronized playback** across all stems
- **Visual feedback** with waveforms and levels

### User Experience
- **Real-time mixing** - adjust levels while playing
- **Preset combinations** - save favorite mixes
- **Social sharing** - share custom mixes
- **Mobile responsive** - works on all devices

## 🛠️ Technical Details

### File Structure
```
music/
└── [timestamp]_[song]/
    ├── original.mp3      # Original upload
    ├── vocals.wav        # Isolated vocals
    ├── drums.wav         # Drum track
    ├── bass.wav          # Bass line
    └── instruments.wav   # Other instruments
```

### API Response
```json
{
  "id": "gcs_1234567890",
  "name": "song.mp3",
  "title": "My Song",
  "hasStemProcessing": true,
  "stems": {
    "vocals": { "fileName": "stems/1234567890_song_vocals.wav" },
    "drums": { "fileName": "stems/1234567890_song_drums.wav" },
    "bass": { "fileName": "stems/1234567890_song_bass.wav" },
    "instruments": { "fileName": "stems/1234567890_song_instruments.wav" }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

**Python/Spleeter not found:**
```bash
# Check Python installation
python3 --version

# Reinstall Spleeter
source spleeter-env/bin/activate
pip install spleeter
```

**Processing timeout:**
```bash
# Increase timeout in server.js (currently 5 minutes)
# Large files may need more time
```

**Storage issues:**
```bash
# Check available disk space
df -h

# Clean temp files
rm -rf temp-processing/*
```

### Performance Tips
- **File size**: Smaller files process faster
- **File format**: MP3/WAV work best
- **Server resources**: More RAM = faster processing
- **Concurrent uploads**: Process one at a time for best results

## 🚀 Railway Deployment

### Environment Variables
Add to Railway dashboard:
```env
ENABLE_STEM_PROCESSING=true
PYTHON_PATH=python3
```

### Build Configuration
Create `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["python3", "python3Packages.pip", "ffmpeg"]

[phases.install]
cmds = ["npm install", "./setup-spleeter.sh"]
```

## 🎯 Next Steps

1. **Test locally** - Upload a song and verify stems are generated
2. **Enhance frontend** - Add multi-track player interface
3. **Deploy to Railway** - Configure production environment
4. **Add features** - Presets, sharing, mobile optimization

## 🎵 Demo Songs for Testing

Try these genres for best stem separation results:
- **Pop/Rock** - Clear vocals and instruments
- **Hip-Hop** - Strong drum patterns
- **Electronic** - Distinct bass lines
- **Jazz** - Complex instrument separation

---

**Ready to transform your music portal into an interactive stem player?** 🎛️

Run `./setup-spleeter.sh` and start uploading! 