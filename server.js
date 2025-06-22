const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Storage configuration
const STORAGE_MODES = {
    CLOUDINARY: 'cloudinary',
    GCS: 'gcs',
    LOCAL: 'local'
};

// Initialize storage providers
let cloudinary = null;
let gcsStorage = null;
let isCloudinaryConfigured = false;
let isGCSConfigured = false;

// Try to configure Cloudinary
try {
    cloudinary = require('cloudinary').v2;
    
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
    }
} catch (error) {
    console.log('⚠️  Cloudinary not available');
}

// Try to configure Google Cloud Storage
try {
    const { Storage } = require('@google-cloud/storage');
    
    let gcsConfig = {};
    
    if (process.env.GOOGLE_CLOUD_KEYFILE) {
        gcsConfig.keyFilename = process.env.GOOGLE_CLOUD_KEYFILE;
        console.log('🔑 Using keyfile:', process.env.GOOGLE_CLOUD_KEYFILE);
    } else if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
        // For Railway/Heroku deployment
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
            gcsConfig.credentials = credentials;
            gcsConfig.projectId = credentials.project_id;
            console.log('🔑 Using credentials from environment variable');
        } catch (parseError) {
            console.error('❌ Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError.message);
            throw parseError;
        }
    }
    
    if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        gcsConfig.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    }
    
    if (Object.keys(gcsConfig).length > 0 && process.env.GCS_BUCKET_NAME) {
        gcsStorage = new Storage(gcsConfig);
        isGCSConfigured = true;
        console.log('🌩️  Google Cloud Storage configured successfully');
        console.log(`📦 Using bucket: ${process.env.GCS_BUCKET_NAME}`);
        
        // Test the connection asynchronously
        setTimeout(async () => {
            try {
                const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
                const [exists] = await bucket.exists();
                if (exists) {
                    console.log('✅ Bucket exists and is accessible');
                } else {
                    console.log('⚠️  Bucket does not exist or is not accessible');
                }
            } catch (testError) {
                console.error('❌ Bucket test failed:', testError.message);
            }
        }, 1000);
    } else {
        console.log('⚠️  Google Cloud Storage not configured - missing config or bucket name');
        console.log('📝 Config keys:', Object.keys(gcsConfig));
        console.log('📝 Bucket name:', process.env.GCS_BUCKET_NAME);
    }
} catch (error) {
    console.log('⚠️  Google Cloud Storage not available:', error.message);
    console.log('🔍 Full error:', error);
}

// Determine storage mode
const storageMode = process.env.STORAGE_MODE || 
    (isGCSConfigured ? STORAGE_MODES.GCS : 
     isCloudinaryConfigured ? STORAGE_MODES.CLOUDINARY : 
     STORAGE_MODES.LOCAL);

console.log(`🗄️  Storage mode: ${storageMode.toUpperCase()}`);

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
            mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com", "https://www.soundjay.com", "https://storage.googleapis.com"],
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

// File upload configuration with higher limits for GCS
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: storageMode === STORAGE_MODES.GCS ? 500 * 1024 * 1024 : 200 * 1024 * 1024, // 500MB for GCS, 200MB others
        fieldSize: storageMode === STORAGE_MODES.GCS ? 500 * 1024 * 1024 : 200 * 1024 * 1024,
        fields: 10,
        files: 2
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

// Storage handler functions
async function uploadToCloudinary(musicFile, coverFile, metadata) {
    console.log('☁️  Uploading to Cloudinary...');
    
    const musicResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                resource_type: 'video',
                folder: 'made-infinite-music',
                public_id: `music_${Date.now()}_${musicFile.originalname.replace(/\.[^/.]+$/, "")}`,
                format: 'mp3',
                transformation: [{ quality: 'auto:good' }]
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else {
                    resolve(result);
                }
            }
        ).end(musicFile.buffer);
    });

    let coverResult = null;
    if (coverFile) {
        try {
            coverResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: 'made-infinite-covers',
                        public_id: `cover_${Date.now()}_${coverFile.originalname.replace(/\.[^/.]+$/, "")}`,
                        transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto:good' }]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(coverFile.buffer);
            });
        } catch (error) {
            console.error('Cover upload failed:', error);
        }
    }

    return {
        id: musicResult.public_id,
        name: musicFile.originalname,
        title: metadata.title || musicFile.originalname.replace(/\.[^/.]+$/, ''),
        size: musicFile.size,
        mimeType: 'audio/mpeg',
        createdTime: new Date().toISOString(),
        uploadDate: metadata.uploadDate || new Date().toISOString(),
        streamUrl: musicResult.secure_url,
        cloudinaryId: musicResult.public_id,
        coverUrl: coverResult ? coverResult.secure_url : null,
        coverCloudinaryId: coverResult ? coverResult.public_id : null,
        storageType: 'cloudinary'
    };
}

async function uploadToGCS(musicFile, coverFile, metadata) {
    console.log('🌩️  Uploading to Google Cloud Storage...');
    
    try {
        const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
        const timestamp = Date.now();
        
        // Upload music file
        const musicFileName = `music/${timestamp}_${musicFile.originalname}`;
        const musicFileRef = bucket.file(musicFileName);
        
        console.log(`📤 Uploading music file: ${musicFileName} (${musicFile.size} bytes)`);
        await musicFileRef.save(musicFile.buffer, {
            metadata: {
                contentType: musicFile.mimetype,
                metadata: {
                    originalName: musicFile.originalname,
                    uploadDate: metadata.uploadDate || new Date().toISOString(),
                    title: metadata.title || musicFile.originalname.replace(/\.[^/.]+$/, '')
                }
            }
        });
        
        // DON'T make public - we'll use signed URLs instead
        console.log('✅ Music uploaded to GCS (private)');
        
        // Upload cover file if provided
        let coverFileName = null;
        if (coverFile) {
            try {
                coverFileName = `covers/${timestamp}_${coverFile.originalname}`;
                const coverFileRef = bucket.file(coverFileName);
                
                console.log(`📤 Uploading cover file: ${coverFileName} (${coverFile.size} bytes)`);
                await coverFileRef.save(coverFile.buffer, {
                    metadata: {
                        contentType: coverFile.mimetype,
                        metadata: {
                            originalName: coverFile.originalname,
                            uploadDate: new Date().toISOString()
                        }
                    }
                });
                
                console.log('✅ Cover uploaded to GCS (private)');
            } catch (error) {
                console.error('❌ Cover upload failed:', error.message);
                console.error('🔍 Full cover error:', error);
            }
        }
        
        return {
            id: `gcs_${timestamp}`,
            name: musicFile.originalname,
            title: metadata.title || musicFile.originalname.replace(/\.[^/.]+$/, ''),
            size: musicFile.size,
            mimeType: musicFile.mimetype,
            createdTime: new Date().toISOString(),
            uploadDate: metadata.uploadDate || new Date().toISOString(),
            streamUrl: null, // We'll generate this on-demand
            gcsFileName: musicFileName,
            coverUrl: null, // We'll generate this on-demand
            gcsCoverFileName: coverFileName,
            storageType: 'gcs'
        };
    } catch (error) {
        console.error('❌ GCS Upload Error:', error.message);
        console.error('🔍 Full error:', error);
        console.error('🔍 Error code:', error.code);
        console.error('🔍 Error details:', error.details);
        
        // Check for specific error types
        if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
            throw new Error('Service account key file not found. Check GOOGLE_CLOUD_KEYFILE path.');
        }
        
        if (error.message.includes('DECODER routines::unsupported') || error.message.includes('private key')) {
            throw new Error('Invalid private key format in service account credentials. Please re-download the JSON file from Google Cloud Console.');
        }
        
        if (error.message.includes('authentication') || error.code === 401) {
            throw new Error('Google Cloud authentication failed. Check your service account credentials.');
        }
        
        if (error.message.includes('permission') || error.code === 403) {
            throw new Error('Google Cloud permission denied. Check your service account has Storage Admin role.');
        }
        
        if (error.message.includes('not found') || error.code === 404) {
            throw new Error(`Google Cloud bucket '${process.env.GCS_BUCKET_NAME}' not found. Check your GCS_BUCKET_NAME.`);
        }
        
        throw new Error(`Google Cloud Storage upload failed: ${error.message}`);
    }
}

async function uploadToLocal(musicFile, coverFile, metadata) {
    console.log('💾 Storing locally (demo mode)...');
    
    // This is just a simulation - in production you'd save to disk
    return {
        id: `local_${Date.now()}`,
        name: musicFile.originalname,
        title: metadata.title || musicFile.originalname.replace(/\.[^/.]+$/, ''),
        size: musicFile.size,
        mimeType: musicFile.mimetype,
        createdTime: new Date().toISOString(),
        uploadDate: metadata.uploadDate || new Date().toISOString(),
        streamUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        coverUrl: coverFile ? 'https://via.placeholder.com/500x500/000000/FFFFFF?text=DEMO' : null,
        storageType: 'local',
        note: 'Demo mode - file not actually stored'
    };
}

// Generate signed URLs for Google Cloud Storage files
async function generateSignedUrl(fileName, expirationHours = 24) {
    try {
        const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
        const file = bucket.file(fileName);
        
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + (expirationHours * 60 * 60 * 1000), // expires in specified hours
        });
        
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
}

// Updated upload endpoint
app.post('/api/upload', requireAdmin, upload.fields([
    { name: 'musicFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
    console.log('📤 File upload attempt');
    console.log('📊 Request size:', req.get('Content-Length') || 'Unknown');
    console.log('🗄️  Storage mode:', storageMode);
    
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

        const metadata = {
            title: req.body.title,
            uploadDate: req.body.uploadDate
        };

        let fileData;
        
        // Route to appropriate storage backend
        switch (storageMode) {
            case STORAGE_MODES.GCS:
                if (!isGCSConfigured) {
                    throw new Error('Google Cloud Storage not configured');
                }
                fileData = await uploadToGCS(musicFile, coverFile, metadata);
                break;
                
            case STORAGE_MODES.CLOUDINARY:
                if (!isCloudinaryConfigured) {
                    throw new Error('Cloudinary not configured');
                }
                fileData = await uploadToCloudinary(musicFile, coverFile, metadata);
                break;
                
            case STORAGE_MODES.LOCAL:
            default:
                fileData = await uploadToLocal(musicFile, coverFile, metadata);
                break;
        }

        console.log(`📁 Before push: ${musicFiles.length} files`);
        musicFiles.push(fileData);
        console.log(`📁 After push: ${musicFiles.length} files`);
        
        // Save to persistent storage
        saveMusicFiles();
        
        res.json({ 
            success: true, 
            file: fileData,
            storageMode: storageMode,
            warning: storageMode === STORAGE_MODES.LOCAL ? 'Demo mode: File uploaded but not stored. Configure GCS or Cloudinary for real uploads.' : null
        });
        
    } catch (error) {
        console.error('❌ Upload error:', error);
        
        // Handle specific GCS errors
        if (error.message && error.message.includes('does not exist')) {
            return res.status(500).json({ 
                error: 'Google Cloud Storage bucket not found. Please check your GCS_BUCKET_NAME configuration.',
                code: 'GCS_BUCKET_NOT_FOUND'
            });
        }
        
        if (error.message && error.message.includes('authentication')) {
            return res.status(500).json({ 
                error: 'Google Cloud Storage authentication failed. Please check your credentials.',
                code: 'GCS_AUTH_FAILED'
            });
        }
        
        res.status(500).json({ 
            error: 'Upload failed: ' + error.message,
            storageMode: storageMode
        });
    }
});

// Updated delete endpoint
app.delete('/api/files/:fileId', requireAdmin, async (req, res) => {
    console.log('🗑️  Delete file attempt');
    
    try {
        const fileId = decodeURIComponent(req.params.fileId);
        console.log(`Deleting file ID: ${fileId}`);
        
        const fileIndex = musicFiles.findIndex(file => file.id === fileId);
        
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const file = musicFiles[fileIndex];
        console.log(`Found file: ${file.name} (storage: ${file.storageType})`);
        
        // Delete from appropriate storage backend
        if (file.storageType === 'gcs' && isGCSConfigured) {
            console.log('🌩️  Deleting from Google Cloud Storage...');
            try {
                const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
                
                // Delete music file
                if (file.gcsFileName) {
                    await bucket.file(file.gcsFileName).delete();
                    console.log('✅ Music file deleted from GCS');
                }
                
                // Delete cover file if it exists
                if (file.gcsCoverFileName) {
                    await bucket.file(file.gcsCoverFileName).delete();
                    console.log('✅ Cover file deleted from GCS');
                }
            } catch (gcsError) {
                console.error('❌ GCS deletion failed:', gcsError);
                // Continue with local deletion even if GCS deletion fails
            }
        } else if (file.storageType === 'cloudinary' && isCloudinaryConfigured) {
            console.log('☁️  Deleting from Cloudinary...');
            try {
                if (file.cloudinaryId) {
                    await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'auto' });
                    console.log('✅ Music file deleted from Cloudinary');
                }
                
                if (file.coverCloudinaryId) {
                    await cloudinary.uploader.destroy(file.coverCloudinaryId, { resource_type: 'image' });
                    console.log('✅ Cover image deleted from Cloudinary');
                }
            } catch (cloudinaryError) {
                console.error('❌ Cloudinary deletion failed:', cloudinaryError);
            }
        }
        
        // Remove from local array
        musicFiles.splice(fileIndex, 1);
        console.log(`📁 After deletion: ${musicFiles.length} files remaining`);
        
        // Save to persistent storage
        saveMusicFiles();
        
        res.json({ success: true, message: 'File deleted successfully' });
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ error: 'Delete failed: ' + error.message });
    }
});

// Updated files endpoint with signed URLs for GCS
app.get('/api/files', async (req, res) => {
    console.log(`📚 Returning ${musicFiles.length} music files`);
    
    // For GCS files, generate signed URLs
    const filesWithUrls = await Promise.all(musicFiles.map(async (file) => {
        if (file.storageType === 'gcs' && isGCSConfigured) {
            const streamUrl = file.gcsFileName ? await generateSignedUrl(file.gcsFileName, 24) : null;
            const coverUrl = file.gcsCoverFileName ? await generateSignedUrl(file.gcsCoverFileName, 24) : null;
            
            return {
                ...file,
                streamUrl,
                coverUrl
            };
        }
        return file;
    }));
    
    res.json({ 
        files: filesWithUrls,
        storageMode: storageMode,
        gcsConfigured: isGCSConfigured,
        cloudinaryConfigured: isCloudinaryConfigured,
        demoMode: storageMode === STORAGE_MODES.LOCAL
    });
});

// Add endpoint to refresh signed URLs (for long-playing sessions)
app.get('/api/files/:fileId/url', async (req, res) => {
    try {
        const fileId = decodeURIComponent(req.params.fileId);
        const file = musicFiles.find(f => f.id === fileId);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        if (file.storageType === 'gcs' && isGCSConfigured && file.gcsFileName) {
            const signedUrl = await generateSignedUrl(file.gcsFileName, 24);
            res.json({ streamUrl: signedUrl });
        } else {
            res.json({ streamUrl: file.streamUrl });
        }
    } catch (error) {
        console.error('Error refreshing URL:', error);
        res.status(500).json({ error: 'Failed to refresh URL' });
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
        mode: storageMode === STORAGE_MODES.GCS ? 'Production (Google Cloud Storage)' :
              storageMode === STORAGE_MODES.CLOUDINARY ? 'Production (Cloudinary)' : 'Demo Mode',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        filesCount: musicFiles.length,
        gcsConfigured: isGCSConfigured,
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
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🗄️  Storage mode: ${storageMode.toUpperCase()}`);
    console.log(`📁 Loaded ${musicFiles.length} music files`);
    
    if (storageMode === STORAGE_MODES.GCS && isGCSConfigured) {
        console.log(`🌩️  Google Cloud Storage ready with bucket: ${process.env.GCS_BUCKET_NAME}`);
        console.log(`📊 File size limit: 500MB`);
    } else if (storageMode === STORAGE_MODES.CLOUDINARY && isCloudinaryConfigured) {
        console.log(`☁️  Cloudinary ready`);
        console.log(`📊 File size limit: 200MB`);
    } else {
        console.log(`💾 Demo mode - configure GCS or Cloudinary for real uploads`);
    }
});

// Increase server timeout for large file uploads (10 minutes)
server.timeout = 600000;
server.keepAliveTimeout = 600000;
server.headersTimeout = 610000;

module.exports = app; 