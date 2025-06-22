const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Try to load Cloudinary, but don't fail if it's not configured
let cloudinary = null;
let isCloudinaryConfigured = false;

try {
    cloudinary = require('cloudinary').v2;
    
    // Check if Cloudinary credentials are provided
    if (process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_CLOUD_NAME !== 'demo') {
        
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        isCloudinaryConfigured = true;
        console.log('☁️  Cloudinary configured successfully');
    } else {
        console.log('⚠️  Cloudinary not configured - using local storage mode');
    }
} catch (error) {
    console.log('⚠️  Cloudinary not available - using local storage mode');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (permissive for development)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com", "https://www.soundjay.com"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https:", "data:"]
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.HOSTING_URL : true,
    credentials: true
}));

// Increase payload limits for large file uploads
app.use(express.json({ limit: '200mb', parameterLimit: 50000 }));
app.use(express.urlencoded({ extended: true, limit: '200mb', parameterLimit: 50000 }));

// Handle payload too large errors
app.use((error, req, res, next) => {
    if (error && error.type === 'entity.too.large') {
        console.log('❌ Payload too large error caught');
        return res.status(413).json({ 
            error: 'File too large. Maximum size is 200MB.',
            code: 'PAYLOAD_TOO_LARGE'
        });
    }
    next(error);
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);


// Update your session configuration (around line 71-80)
app.use(session({
    secret: process.env.SESSION_SECRET || 'Yourawaveydude4145!!!!',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to false for now to test
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files with proper MIME types
const express_static = express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
});
app.use(express_static);

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
        fieldSize: 200 * 1024 * 1024, // 200MB field limit
        fields: 10, // Max number of non-file fields
        files: 2 // Max number of files (music + cover)
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio and image files are allowed!'), false);
        }
    }
});

// Admin middleware
const requireAdmin = (req, res, next) => {
    console.log('🔒 Admin check - session:', req.session.isAdmin ? 'Authenticated' : 'Not authenticated');
    
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Admin authentication required' });
    }
};

// Persistent storage for file metadata
const fs = require('fs');
const STORAGE_FILE = path.join(__dirname, 'musicFiles.json');

let musicFiles = [];

// Load existing files from storage
function loadMusicFiles() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf8');
            musicFiles = JSON.parse(data);
            console.log(`📁 Loaded ${musicFiles.length} files from storage`);
        } else {
            console.log('📁 No existing storage file found, starting fresh');
            musicFiles = [];
        }
    } catch (error) {
        console.error('❌ Error loading files from storage:', error);
        musicFiles = [];
    }
}

// Save files to storage
function saveMusicFiles() {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(musicFiles, null, 2));
        console.log(`💾 Saved ${musicFiles.length} files to storage`);
    } catch (error) {
        console.error('❌ Error saving files to storage:', error);
    }
}

// Load files on startup
loadMusicFiles();

// Add some demo files for testing (only if no files exist and Cloudinary not configured)
if (!isCloudinaryConfigured && musicFiles.length === 0) {
    musicFiles = [
        {
            id: 'demo_1',
            name: 'Demo Song 1.mp3',
            title: 'Demo Song 1',
            size: 3500000,
            mimeType: 'audio/mpeg',
            createdTime: new Date().toISOString(),
            uploadDate: new Date().toISOString(),
            streamUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
        },
        {
            id: 'demo_2',
            name: 'Demo Song 2.mp3',
            title: 'Demo Song 2',
            size: 4200000,
            mimeType: 'audio/mpeg',
            createdTime: new Date().toISOString(),
            uploadDate: new Date().toISOString(),
            streamUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
        }
    ];
    saveMusicFiles();
}

// Admin login
app.post('/api/admin/login', (req, res) => {
    console.log('🔑 Admin login attempt');
    const { password } = req.body;
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log('Password provided:', password ? 'Yes' : 'No');
    console.log('Checking against:', correctPassword);
    
    if (password === correctPassword) {
        req.session.isAdmin = true;
        console.log('✅ Admin login successful');
        res.json({ success: true, message: 'Login successful' });
    } else {
        console.log('❌ Admin login failed - wrong password');
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    console.log('🚪 Admin logout');
    req.session.isAdmin = false;
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Upload music file with optional cover image
app.post('/api/upload', requireAdmin, upload.fields([
    { name: 'musicFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
    console.log('📤 File upload attempt');
    console.log('📊 Request size:', req.get('Content-Length') || 'Unknown');
    console.log('📊 Content type:', req.get('Content-Type') || 'Unknown');
    
    try {
        if (!req.files || !req.files.musicFile) {
            return res.status(400).json({ error: 'No music file uploaded' });
        }

        const musicFile = req.files.musicFile[0];
        const coverFile = req.files.coverImage ? req.files.coverImage[0] : null;
        
        console.log(`Uploading: ${musicFile.originalname} (${musicFile.size} bytes)`);
        if (coverFile) {
            console.log(`Cover image: ${coverFile.originalname} (${coverFile.size} bytes)`);
        }

        if (isCloudinaryConfigured && cloudinary) {
            console.log('☁️  Uploading to Cloudinary...');
            
            // Validate file types before upload
            if (!musicFile.mimetype.startsWith('audio/')) {
                return res.status(400).json({ error: 'Music file must be an audio format' });
            }
            if (coverFile && !coverFile.mimetype.startsWith('image/')) {
                return res.status(400).json({ error: 'Cover file must be an image format' });
            }

            // Upload music file to Cloudinary
            const musicResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'video', // Use 'video' for audio files in Cloudinary
                        folder: 'made-infinite-music',
                        public_id: `music_${Date.now()}_${musicFile.originalname.replace(/\.[^/.]+$/, "")}`,
                        format: 'mp3',
                        transformation: [
                            { quality: 'auto:good' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary music upload error:', error);
                            // Handle specific Cloudinary errors
                            if (error.message && error.message.includes('too large to process synchronously')) {
                                reject(new Error('File too large. Please use a smaller audio file (under 200MB).'));
                            } else {
                                reject(new Error(`Upload failed: ${error.message || error}`));
                            }
                        } else {
                            console.log('✅ Music upload successful');
                            resolve(result);
                        }
                    }
                ).end(musicFile.buffer);
            });

            // Upload cover image if provided
            let coverResult = null;
            if (coverFile) {
                try {
                    coverResult = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'image',
                                folder: 'made-infinite-covers',
                                public_id: `cover_${Date.now()}_${coverFile.originalname.replace(/\.[^/.]+$/, "")}`,
                                transformation: [
                                    { width: 500, height: 500, crop: 'fill', quality: 'auto:good' }
                                ]
                            },
                            (error, result) => {
                                if (error) {
                                    console.error('Cloudinary cover upload error:', error);
                                    reject(error);
                                } else {
                                    console.log('✅ Cover upload successful');
                                    resolve(result);
                                }
                            }
                        ).end(coverFile.buffer);
                    });
                } catch (coverError) {
                    console.error('❌ Cover upload failed, continuing without cover:', coverError);
                }
            }

            // Store file metadata
            const fileData = {
                id: musicResult.public_id,
                name: musicFile.originalname,
                title: req.body.title || musicFile.originalname.replace(/\.[^/.]+$/, ''),
                size: musicFile.size,
                mimeType: 'audio/mpeg',
                createdTime: new Date().toISOString(),
                uploadDate: req.body.uploadDate || new Date().toISOString(),
                streamUrl: musicResult.secure_url,
                cloudinaryId: musicResult.public_id,
                coverUrl: coverResult ? coverResult.secure_url : null,
                coverCloudinaryId: coverResult ? coverResult.public_id : null
            };

            console.log(`📁 Before push: ${musicFiles.length} files`);
            musicFiles.push(fileData);
            console.log(`📁 After push: ${musicFiles.length} files`);
            console.log(`📁 All file IDs: ${musicFiles.map(f => f.id).join(', ')}`);
            
            // Save to persistent storage
            saveMusicFiles();
            
            res.json({ success: true, file: fileData });
            
        } else {
            console.log('💾 Cloudinary not configured - simulating upload...');
            
            // Simulate upload without actually storing the file
            const fileData = {
                id: `local_${Date.now()}`,
                name: musicFile.originalname,
                title: req.body.title || musicFile.originalname.replace(/\.[^/.]+$/, ''),
                size: musicFile.size,
                mimeType: musicFile.mimetype,
                createdTime: new Date().toISOString(),
                uploadDate: req.body.uploadDate || new Date().toISOString(),
                streamUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Demo URL
                coverUrl: coverFile ? 'https://via.placeholder.com/500x500/000000/FFFFFF?text=DEMO' : null,
                note: 'Demo mode - file not actually stored'
            };

            console.log(`📁 Before push (demo): ${musicFiles.length} files`);
            musicFiles.push(fileData);
            console.log(`📁 After push (demo): ${musicFiles.length} files`);
            console.log(`📁 All file IDs (demo): ${musicFiles.map(f => f.id).join(', ')}`);
            
            // Save to persistent storage
            saveMusicFiles();
            
            res.json({ 
                success: true, 
                file: fileData,
                warning: 'Demo mode: File uploaded but not stored. Configure Cloudinary for real uploads.'
            });
        }

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// Get all music files
app.get('/api/files', (req, res) => {
    console.log(`📚 Returning ${musicFiles.length} music files`);
    res.json({ 
        files: musicFiles,
        cloudinaryConfigured: isCloudinaryConfigured,
        demoMode: !isCloudinaryConfigured
    });
});

// Delete music file
app.delete('/api/files/:fileId', requireAdmin, async (req, res) => {
    console.log('🗑️  Delete file attempt');
    
    try {
        // Decode the file ID properly (it may be URL encoded)
        const fileId = decodeURIComponent(req.params.fileId);
        console.log(`Deleting file ID: ${fileId}`);
        
        // Find the file
        const fileIndex = musicFiles.findIndex(file => file.id === fileId);
        
        if (fileIndex === -1) {
            console.log(`❌ File not found. Available IDs: ${musicFiles.map(f => f.id).join(', ')}`);
            return res.status(404).json({ error: 'File not found' });
        }
        
        const file = musicFiles[fileIndex];
        console.log(`Found file: ${file.name} (cloudinaryId: ${file.cloudinaryId})`);
        
        // Delete from Cloudinary if configured
        if (isCloudinaryConfigured && cloudinary && file.cloudinaryId) {
            console.log('☁️  Deleting from Cloudinary...');
            try {
                // Delete music file
                await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'auto' });
                console.log('✅ Music file deleted from Cloudinary');
                
                // Delete cover image if it exists
                if (file.coverCloudinaryId) {
                    await cloudinary.uploader.destroy(file.coverCloudinaryId, { resource_type: 'image' });
                    console.log('✅ Cover image deleted from Cloudinary');
                }
            } catch (cloudinaryError) {
                console.error('❌ Cloudinary deletion failed:', cloudinaryError);
                // Continue anyway - remove from our list even if Cloudinary fails
            }
        }
        
        // Remove from local storage
        musicFiles.splice(fileIndex, 1);
        console.log('✅ File deleted successfully from local storage');

        // Save to persistent storage
        saveMusicFiles();

        res.json({ success: true, message: 'File deleted successfully' });

    } catch (error) {
        console.error('❌ Delete error:', error);
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
        mode: isCloudinaryConfigured ? 'Production (Cloudinary)' : 'Demo Mode',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        filesCount: musicFiles.length,
        cloudinaryConfigured: isCloudinaryConfigured,
        adminPassword: process.env.ADMIN_PASSWORD || 'admin123'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('💥 Server error:', error);
    
    if (error instanceof multer.MulterError) {
        console.log('🔍 Multer error code:', error.code);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                error: 'File too large (max 200MB)',
                code: 'LIMIT_FILE_SIZE',
                maxSize: '200MB'
            });
        }
        if (error.code === 'LIMIT_FIELD_VALUE') {
            return res.status(413).json({ 
                error: 'Field value too large (max 200MB)',
                code: 'LIMIT_FIELD_VALUE'
            });
        }
    }
    
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ 
            error: 'Request payload too large (max 200MB)',
            code: 'ENTITY_TOO_LARGE'
        });
    }
    
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
    console.log(`🎵 MADE INFINITE server running on port ${PORT}`);
    console.log(`🕐 Server started at: ${new Date().toISOString()}`);
    console.log(`📁 Initial files count: ${musicFiles.length}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Admin password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    
    if (isCloudinaryConfigured) {
        console.log(`☁️  Cloudinary mode: Unlimited storage enabled`);
        console.log(`🔧 Note: Files stored in memory - will reset on server restart`);
        console.log(`💡 Consider adding persistent database for production use`);
    } else {
        console.log(`💾 Demo mode: Files simulated (configure Cloudinary for real uploads)`);
        console.log(`🔧 To enable Cloudinary:`);
        console.log(`   1. Sign up at https://cloudinary.com`);
        console.log(`   2. Get your credentials from the dashboard`);
        console.log(`   3. Update your .env file with real credentials`);
    }
});

// Increase server timeout for large file uploads (10 minutes)
server.timeout = 600000;
server.keepAliveTimeout = 600000;
server.headersTimeout = 610000;

module.exports = app; 