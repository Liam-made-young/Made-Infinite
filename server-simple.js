const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary configuration (free 25GB storage)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Security and middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(__dirname));

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'), false);
        }
    }
});

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Admin authentication required' });
    }
};

// In-memory storage for file metadata (in production, use a database)
let musicFiles = [];

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === (process.env.ADMIN_PASSWORD || 'admin123')) {
        req.session.isAdmin = true;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Upload music file to Cloudinary
app.post('/api/upload', requireAdmin, upload.single('musicFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: 'auto',
                    folder: 'made-infinite-music',
                    public_id: `music_${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, "")}`,
                    format: 'mp3' // Convert to mp3 for consistency
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(req.file.buffer);
        });

        // Store file metadata
        const fileData = {
            id: result.public_id,
            name: req.file.originalname,
            size: req.file.size,
            mimeType: 'audio/mpeg',
            createdTime: new Date().toISOString(),
            streamUrl: result.secure_url,
            cloudinaryId: result.public_id
        };

        musicFiles.push(fileData);

        res.json({
            success: true,
            file: fileData
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// Get all music files
app.get('/api/files', (req, res) => {
    res.json({ files: musicFiles });
});

// Delete music file
app.delete('/api/files/:fileId', requireAdmin, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // Remove from Cloudinary
        await cloudinary.uploader.destroy(fileId, { resource_type: 'auto' });
        
        // Remove from local storage
        musicFiles = musicFiles.filter(file => file.id !== fileId);

        res.json({ success: true, message: 'File deleted successfully' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed: ' + error.message });
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        filesCount: musicFiles.length
    });
});

// Error handling
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 100MB)' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🎵 MADE INFINITE server running on port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
});

module.exports = app; 