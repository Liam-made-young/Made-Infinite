import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import fsExtra from 'fs-extra';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Storage } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';
import https from 'https';
import http from 'http';
import fetch from 'node-fetch';

// Configure dotenv
dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set ffmpeg path for thumbnail generation
ffmpeg.setFfmpegPath(ffmpegStatic);

// Storage configuration
const STORAGE_MODES = {
    GCS: 'gcs',
    LOCAL: 'local'
};

// Initialize storage providers
let gcsStorage = null;
let isGCSConfigured = false;

// Try to configure Google Cloud Storage
try {
    // Storage is already imported at the top
    
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
    
    // Check if GCS can be configured (either with explicit config or Cloud Run default auth)
    if (process.env.GCS_BUCKET_NAME) {
        // Use provided config if available, otherwise rely on Cloud Run default authentication
        gcsStorage = Object.keys(gcsConfig).length > 0 ? new Storage(gcsConfig) : new Storage();
        isGCSConfigured = true;
        console.log('🌩️  Google Cloud Storage configured successfully');
        console.log(`📦 Using bucket: ${process.env.GCS_BUCKET_NAME}`);
        if (Object.keys(gcsConfig).length > 0) {
            console.log('🔑 Using explicit credentials');
        } else {
            console.log('🔑 Using Cloud Run default service account');
        }
        
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
        console.log('⚠️  Google Cloud Storage not configured - missing bucket name');
        console.log('📝 Config keys:', Object.keys(gcsConfig));
        console.log('📝 Bucket name:', process.env.GCS_BUCKET_NAME);
    }
} catch (error) {
    console.log('⚠️  Google Cloud Storage not available:', error.message);
    console.log('🔍 Full error:', error);
}

// Determine storage mode (force GCS)
const storageMode = STORAGE_MODES.GCS;

console.log(`️  Storage mode: ${storageMode.toUpperCase()}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway/Heroku deployment
app.set('trust proxy', 1);

// Security middleware (permissive for development)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "blob:", "https://www.soundjay.com", "https://storage.googleapis.com"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https:", "data:"]
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.HOSTING_URL === 'http://localhost:3000' ? 'http://localhost:5173' : process.env.HOSTING_URL,
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


// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'Yourawaveydude4145!!!!',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Explicit session name
    cookie: {
        secure: false, // Always false for localhost development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Explicit SameSite policy for localhost
    }
}));

// Serve static files with proper MIME types
const express_static = express.static(path.join(__dirname, '..'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
        if (filePath.endsWith('.css')) {
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
        if (file.mimetype.startsWith('audio/') || 
            file.mimetype.startsWith('image/') || 
            file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio, image, and video files are allowed!'), false);
        }
    }
});

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        console.log('❌ Admin access denied');
        res.status(401).json({ error: 'Admin authentication required' });
    }
};

// Persistent storage for file metadata
  const STORAGE_FILE = path.join(__dirname, 'musicFiles.json');
  const VIDEO_STORAGE_FILE = path.join(__dirname, 'videoFiles.json');
  const STREAM_STORAGE_FILE = path.join(__dirname, 'liveStreams.json');
  let musicFiles = [];
  let videoFiles = [];
  let liveStreams = [];

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

function loadVideoFiles() {
    try {
        if (fs.existsSync(VIDEO_STORAGE_FILE)) {
            const data = fs.readFileSync(VIDEO_STORAGE_FILE, 'utf8');
            videoFiles = JSON.parse(data) || [];
            console.log(`📼 Loaded ${videoFiles.length} video files from storage`);
        } else {
            console.log('📼 No existing video files storage found, starting fresh');
        }
    } catch (error) {
        console.error('❌ Error loading video files:', error);
        videoFiles = [];
    }
}

function saveVideoFiles() {
    try {
        fs.writeFileSync(VIDEO_STORAGE_FILE, JSON.stringify(videoFiles || [], null, 2));
        console.log(`💾 Saved ${videoFiles.length} video files to storage`);
    } catch (error) {
        console.error('❌ Error saving video files:', error);
    }
}

function loadLiveStreams() {
    try {
        if (fs.existsSync(STREAM_STORAGE_FILE)) {
            const data = fs.readFileSync(STREAM_STORAGE_FILE, 'utf8');
            liveStreams = JSON.parse(data) || [];
            console.log(`📺 Loaded ${liveStreams.length} live streams from storage`);
        } else {
            console.log('📺 No existing streams storage found, starting fresh');
        }
    } catch (error) {
        console.error('❌ Error loading live streams:', error);
        liveStreams = [];
    }
}

function saveLiveStreams() {
    try {
        fs.writeFileSync(STREAM_STORAGE_FILE, JSON.stringify(liveStreams || [], null, 2));
        console.log(`💾 Saved ${liveStreams.length} live streams to storage`);
    } catch (error) {
        console.error('❌ Error saving live streams:', error);
    }
}

// Load files on startup
loadMusicFiles();
loadVideoFiles();
loadLiveStreams();

// Add some demo files for testing (only if no files exist)
if (musicFiles.length === 0) {
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

// YouTube API helper functions
function extractYouTubeId(url) {
    console.log('🔍 Extracting YouTube ID from URL:', url);
    
    // Support multiple YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,           // youtube.com/watch?v=VIDEO_ID
        /(?:youtu\.be\/)([^&\n?#]+)/,                      // youtu.be/VIDEO_ID
        /(?:youtube\.com\/embed\/)([^&\n?#]+)/,            // youtube.com/embed/VIDEO_ID
        /(?:youtube\.com\/v\/)([^&\n?#]+)/,                // youtube.com/v/VIDEO_ID
        /(?:youtube\.com\/watch\?.*v=)([^&\n?#]+)/,        // youtube.com/watch?other_param&v=VIDEO_ID
        /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,       // m.youtube.com/watch?v=VIDEO_ID
        /(?:youtube\.com\/live\/)([^&\n?#]+)/,             // youtube.com/live/VIDEO_ID
        /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,           // youtube.com/shorts/VIDEO_ID
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            console.log('✅ Extracted YouTube ID:', match[1]);
            return match[1];
        }
    }
    
    console.log('❌ No YouTube ID found in URL');
    return null;
}

async function getYouTubeVideoInfo(videoId) {
    console.log(`📺 Getting YouTube video info for ID: ${videoId}`);
    
    if (!process.env.YOUTUBE_API_KEY) {
        console.log('⚠️  No YouTube API key found. Stream status checking disabled.');
        return null;
    }
    
    try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,liveStreamingDetails&key=${process.env.YOUTUBE_API_KEY}`;
        console.log('🔗 YouTube API URL:', apiUrl.replace(process.env.YOUTUBE_API_KEY, 'HIDDEN'));
        
        const response = await fetch(apiUrl);
        
        console.log('📊 YouTube API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ YouTube API HTTP error:', response.status, errorText);
            throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📄 YouTube API response data:', JSON.stringify(data, null, 2));
        
        if (data.error) {
            console.error('❌ YouTube API returned error:', data.error);
            throw new Error(`YouTube API error: ${data.error.message || data.error}`);
        }
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const snippet = video.snippet;
            const liveDetails = video.liveStreamingDetails;
            
            console.log('✅ Video found:', snippet.title);
            console.log('📊 Live broadcast content:', snippet.liveBroadcastContent);
            
            return {
                title: snippet.title,
                description: snippet.description,
                thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
                isLive: snippet.liveBroadcastContent === 'live',
                status: snippet.liveBroadcastContent, // 'live', 'upcoming', 'none'
                startTime: liveDetails?.actualStartTime || liveDetails?.scheduledStartTime,
                endTime: liveDetails?.actualEndTime,
                viewerCount: liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : undefined
            };
        } else {
            console.log('❌ No video found with ID:', videoId);
            return null;
        }
        
    } catch (error) {
        console.error('❌ YouTube API error:', error.message);
        console.error('❌ Full error:', error);
        return null;
    }
}

async function checkAllStreamStatuses() {
    console.log('🔄 Checking all stream statuses...');
    
    for (const stream of liveStreams) {
        const info = await getYouTubeVideoInfo(stream.youtubeId);
        
        if (info) {
            const wasLive = stream.isLive;
            stream.isLive = info.isLive;
            stream.status = info.status === 'live' ? 'live' : info.status === 'upcoming' ? 'upcoming' : 'ended';
            stream.viewers = info.viewerCount;
            
            // If stream just ended, convert to video
            if (wasLive && !info.isLive && stream.status === 'ended') {
                console.log(`📺➡️📼 Stream "${stream.title}" ended, converting to video`);
                await convertStreamToVideo(stream);
            }
        }
    }
    
    saveLiveStreams();
}

async function convertStreamToVideo(stream) {
    try {
        // Create a video entry for the ended stream (stays accessible via YouTube embed)
        const videoData = {
            id: `video_${Date.now()}_${stream.youtubeId}`,
            name: `${stream.title}.mp4`,
            title: stream.title,
            fileName: `${stream.title}.mp4`,
            streamUrl: stream.youtubeUrl,
            thumbnailUrl: stream.thumbnail,
            size: 0, // YouTube videos don't have file size
            uploadDate: new Date().toISOString(),
            dateAdded: new Date().toISOString(),
            description: stream.description,
            source: 'stream', // Mark as stream-derived
            originalStreamId: stream.id,
            youtubeId: stream.youtubeId, // Keep YouTube ID for embed
            isStreamVideo: true // Flag to identify stream-derived videos
        };
        
        videoFiles.push(videoData);
        saveVideoFiles();
        
        // Also mark the original stream as archived
        const streamIndex = liveStreams.findIndex(s => s.id === stream.id);
        if (streamIndex > -1) {
            liveStreams[streamIndex].status = 'archived';
            liveStreams[streamIndex].isLive = false;
            liveStreams[streamIndex].archivedDate = new Date().toISOString();
            liveStreams[streamIndex].videoId = videoData.id; // Link to video entry
            saveLiveStreams();
        }
        
        console.log(`✅ Stream converted to video and archived: ${stream.title}`);
    } catch (error) {
        console.error('❌ Error converting stream to video:', error);
    }
}

// Check stream statuses every 5 minutes
setInterval(checkAllStreamStatuses, 5 * 60 * 1000);

// Storage handler functions

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
        
        // Process stems if enabled
        let stems = null;
        const processStems = process.env.ENABLE_STEM_PROCESSING === 'true';
        
        if (processStems) {
            try {
                console.log('🎵 Starting stem processing...');
                
                // Save original file temporarily for processing
                const tempDir = path.join(__dirname, 'temp-processing');
                const tempInputFile = path.join(tempDir, `${timestamp}_input.${musicFile.originalname.split('.').pop()}`);
                const tempOutputDir = path.join(tempDir, `${timestamp}_stems`);
                
                fsExtra.ensureDirSync(tempDir);
                fs.writeFileSync(tempInputFile, musicFile.buffer);
                
                        // Process stems
        const stemResult = await processStemsWithDemucs(tempInputFile, tempOutputDir);
                
                if (stemResult.success) {
                    // Upload stems to GCS
                    const uploadedStems = await uploadStemsToStorage(stemResult.stems, metadata, STORAGE_MODES.GCS);
                    stems = uploadedStems;
                    console.log('✅ Stems processed and uploaded successfully');
                }
                
                // Cleanup temp files
                fsExtra.removeSync(tempInputFile);
                fsExtra.removeSync(tempOutputDir);
                
            } catch (stemError) {
                console.error('❌ Stem processing failed:', stemError.message);
                // Continue without stems - don't fail the entire upload
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
            storageType: 'gcs',
            stems: stems, // Add stems data
            hasStemProcessing: processStems
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

// Stem processing function
async function processStemsWithDemucs(inputFilePath, outputDir) {
    console.log('🎵 Starting stem separation with Demucs...');
    
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        fsExtra.ensureDirSync(outputDir);
        
        // Call improved Python stem processor
        const pythonProcess = spawn('python3', [
            path.join(__dirname, 'stem-processor-improved.py'),
            inputFilePath,
            outputDir
        ]);
        
        let output = '';
        let error = '';
        
        pythonProcess.stdout.on('data', (data) => {
            const dataStr = data.toString();
            console.log('🐍 Python:', dataStr.trim());
            output += dataStr;
        });
        
        pythonProcess.stderr.on('data', (data) => {
            const errorStr = data.toString();
            console.error('🐍 Python Error:', errorStr.trim());
            error += errorStr;
        });
        
        // Set timeout for long-running processes – configurable via env var
        const stemTimeoutMs = parseInt(process.env.STEM_PROCESSING_TIMEOUT, 10) || (20 * 60 * 1000); // default 20 min

        const timeoutTimer = setTimeout(() => {
            pythonProcess.kill();
            reject(new Error(`Stem processing timeout (${stemTimeoutMs / 60000} minutes)`));
        }, stemTimeoutMs);

        // Clear the timer on normal exit
        pythonProcess.on('close', () => clearTimeout(timeoutTimer));
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Look for the FINAL_RESULT line in the Python output
                    const lines = output.trim().split('\n');
                    let result = null;
                    
                    // Find FINAL_RESULT and extract everything after it
                    const finalResultIndex = output.indexOf('FINAL_RESULT:');
                    if (finalResultIndex >= 0) {
                        try {
                            const jsonStr = output.substring(finalResultIndex + 'FINAL_RESULT:'.length).trim();
                            console.log('🔍 Extracted JSON length:', jsonStr.length);
                            result = JSON.parse(jsonStr);
                        } catch (e) {
                            console.error('❌ Failed to parse FINAL_RESULT JSON:', e);
                            console.error('❌ JSON string was:', output.substring(finalResultIndex + 'FINAL_RESULT:'.length).trim().substring(0, 500) + '...');
                        }
                    }
                    
                    if (result && result.success) {
                        console.log('✅ Stem separation successful');
                        console.log('🎵 Found stems:', Object.keys(result.stems || {}).length);
                        resolve(result);
                    } else {
                        console.error('❌ Stem separation failed:', result?.error || 'No valid result found');
                        console.log('🔍 Debug - found result:', result);
                        console.log('🔍 Debug - all lines:');
                        lines.forEach((line, i) => {
                            console.log(`Line ${i}: ${line.substring(0, 100)}...`);
                        });
                        reject(new Error(result?.error || 'Stem separation failed'));
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse Python output:', parseError);
                    console.log('🔍 Raw output:', output);
                    reject(new Error('Failed to parse stem processing result'));
                }
            } else {
                console.error(`❌ Python process exited with code ${code}`);
                reject(new Error(`Stem processing failed with code ${code}: ${error}`));
            }
        });
    });
}

// Upload stems to storage
async function uploadStemsToStorage(stemFiles, metadata, storageType) {
    console.log('📤 Uploading stems to storage...');
    
    const uploadedStems = {};
    
    for (const [stemName, stemPath] of Object.entries(stemFiles)) {
        try {
            const stemBuffer = fs.readFileSync(stemPath);
            const stemFile = {
                buffer: stemBuffer,
                originalname: `${stemName}.wav`,
                mimetype: 'audio/wav',
                size: stemBuffer.length
            };
            
            let uploadResult;
            
            switch (storageType) {
                case STORAGE_MODES.GCS:
                    if (isGCSConfigured) {
                        uploadResult = await uploadSingleStemToGCS(stemFile, metadata, stemName);
                    }
                    break;
                case STORAGE_MODES.CLOUDINARY:
                    // Cloudinary removed - only GCS supported
                    throw new Error('Cloudinary support has been removed');
                    break;
                default:
                    uploadResult = {
                        url: `demo://${stemName}.wav`,
                        fileName: `${stemName}.wav`
                    };
            }
            
            uploadedStems[stemName] = uploadResult;
            console.log(`✅ Uploaded ${stemName} stem`);
            
        } catch (error) {
            console.error(`❌ Failed to upload ${stemName} stem:`, error);
            uploadedStems[stemName] = { error: error.message };
        }
    }
    
    return uploadedStems;
}

// Upload single stem to GCS
async function uploadSingleStemToGCS(stemFile, metadata, stemName) {
    const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
    const timestamp = Date.now();
    const fileName = `stems/${timestamp}_${metadata.title || 'unknown'}_${stemName}.wav`;
    const fileRef = bucket.file(fileName);
    
    await fileRef.save(stemFile.buffer, {
        metadata: {
            contentType: stemFile.mimetype,
            metadata: {
                originalName: stemFile.originalname,
                uploadDate: metadata.uploadDate || new Date().toISOString(),
                title: metadata.title,
                stemType: stemName
            }
        }
    });
    
    return {
        fileName: fileName,
        url: null // Will generate signed URL on-demand
    };
}



// Video thumbnail generation function
async function generateVideoThumbnail(videoBuffer, outputPath) {
    return new Promise((resolve, reject) => {
        const tempVideoPath = path.join(__dirname, 'temp-processing', `temp_video_${Date.now()}.mp4`);
        
        // Ensure temp directory exists
        fsExtra.ensureDirSync(path.dirname(tempVideoPath));
        
        // Write video buffer to temporary file
        fs.writeFileSync(tempVideoPath, videoBuffer);
        
        ffmpeg(tempVideoPath)
            .screenshots({
                timestamps: ['50%'], // Take screenshot at 50% of video duration
                filename: 'thumbnail.jpg',
                folder: path.dirname(outputPath),
                size: '800x450'
            })
            .on('end', () => {
                // Clean up temp video file
                fs.unlinkSync(tempVideoPath);
                
                // Rename the generated screenshot to the desired output path
                const generatedPath = path.join(path.dirname(outputPath), 'thumbnail.jpg');
                if (fs.existsSync(generatedPath)) {
                    fs.renameSync(generatedPath, outputPath);
                    resolve(outputPath);
                } else {
                    reject(new Error('Thumbnail was not generated'));
                }
            })
            .on('error', (err) => {
                // Clean up temp video file
                if (fs.existsSync(tempVideoPath)) {
                    fs.unlinkSync(tempVideoPath);
                }
                reject(err);
            });
    });
}

// Generate thumbnail buffer for upload to cloud storage
async function generateVideoThumbnailBuffer(videoBuffer) {
    return new Promise((resolve, reject) => {
        const tempVideoPath = path.join(__dirname, 'temp-processing', `temp_video_${Date.now()}.mp4`);
        const tempThumbnailPath = path.join(__dirname, 'temp-processing', `temp_thumbnail_${Date.now()}.jpg`);
        
        // Ensure temp directory exists
        fsExtra.ensureDirSync(path.dirname(tempVideoPath));
        
        // Write video buffer to temporary file
        fs.writeFileSync(tempVideoPath, videoBuffer);
        
        ffmpeg(tempVideoPath)
            .screenshots({
                timestamps: ['50%'],
                filename: path.basename(tempThumbnailPath),
                folder: path.dirname(tempThumbnailPath),
                size: '800x450'
            })
            .on('end', () => {
                // Clean up temp video file
                fs.unlinkSync(tempVideoPath);
                
                if (fs.existsSync(tempThumbnailPath)) {
                    const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
                    fs.unlinkSync(tempThumbnailPath); // Clean up temp thumbnail file
                    resolve(thumbnailBuffer);
                } else {
                    reject(new Error('Thumbnail was not generated'));
                }
            })
            .on('error', (err) => {
                // Clean up temp files
                if (fs.existsSync(tempVideoPath)) {
                    fs.unlinkSync(tempVideoPath);
                }
                if (fs.existsSync(tempThumbnailPath)) {
                    fs.unlinkSync(tempThumbnailPath);
                }
                reject(err);
            });
    });
}

// Video upload functions (similar to music uploads)
async function uploadVideoToGCS(videoFile, thumbnailFile, metadata) {
    console.log('🌩️  Uploading video to Google Cloud Storage...');
    
    try {
        const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
        const timestamp = Date.now();
        
        // Upload video file
        const videoFileName = `videos/${timestamp}_${videoFile.originalname}`;
        const videoFileRef = bucket.file(videoFileName);
        
        console.log(`📤 Uploading video file: ${videoFileName} (${videoFile.size} bytes)`);
        await videoFileRef.save(videoFile.buffer, {
            metadata: {
                contentType: videoFile.mimetype,
                metadata: {
                    originalName: videoFile.originalname,
                    uploadDate: metadata.uploadDate || new Date().toISOString(),
                    title: metadata.title || videoFile.originalname.replace(/\.[^/.]+$/, '')
                }
            }
        });
        
        console.log('✅ Video uploaded to GCS (private)');
        
        // Generate or upload thumbnail
        let thumbnailFileName = null;
        let thumbnailUrl = null;
        
        if (thumbnailFile) {
            // Use provided thumbnail
            try {
                thumbnailFileName = `video-thumbnails/${timestamp}_${thumbnailFile.originalname}`;
                const thumbnailFileRef = bucket.file(thumbnailFileName);
                
                console.log(`📤 Uploading provided thumbnail: ${thumbnailFileName} (${thumbnailFile.size} bytes)`);
                await thumbnailFileRef.save(thumbnailFile.buffer, {
                    metadata: {
                        contentType: thumbnailFile.mimetype,
                        metadata: {
                            originalName: thumbnailFile.originalname,
                            uploadDate: new Date().toISOString()
                        }
                    }
                });
                
                console.log('✅ Thumbnail uploaded to GCS (private)');
                thumbnailUrl = await generateSignedUrl(thumbnailFileName, 24);
            } catch (error) {
                console.error('❌ Thumbnail upload failed:', error.message);
            }
        } else {
            // Auto-generate thumbnail
            try {
                console.log('🎬 Generating thumbnail from video...');
                const thumbnailBuffer = await generateVideoThumbnailBuffer(videoFile.buffer);
                
                thumbnailFileName = `video-thumbnails/${timestamp}_auto_thumbnail.jpg`;
                const thumbnailFileRef = bucket.file(thumbnailFileName);
                
                console.log(`📤 Uploading auto-generated thumbnail: ${thumbnailFileName}`);
                await thumbnailFileRef.save(thumbnailBuffer, {
                    metadata: {
                        contentType: 'image/jpeg',
                        metadata: {
                            originalName: 'auto_thumbnail.jpg',
                            uploadDate: new Date().toISOString(),
                            autoGenerated: 'true'
                        }
                    }
                });
                
                console.log('✅ Auto-generated thumbnail uploaded to GCS');
                thumbnailUrl = await generateSignedUrl(thumbnailFileName, 24);
            } catch (error) {
                console.error('❌ Auto thumbnail generation failed:', error.message);
            }
        }
        
        // Generate signed URL for video
        const streamUrl = await generateSignedUrl(videoFileName, 24);
        
        return {
            id: `gcs_video_${timestamp}`,
            name: videoFile.originalname,
            title: metadata.title || videoFile.originalname.replace(/\.[^/.]+$/, ''),
            fileName: videoFile.originalname,
            size: videoFile.size,
            uploadDate: metadata.uploadDate || new Date().toISOString(),
            dateAdded: new Date().toISOString(),
            gcsFileName: videoFileName,
            gcsThumbnailFileName: thumbnailFileName,
            streamUrl: streamUrl,
            thumbnailUrl: thumbnailUrl,
            storageType: 'gcs',
            source: 'upload'
        };
        
    } catch (error) {
        console.error('❌ GCS video upload error:', error);
        throw new Error(`Video upload failed: ${error.message}`);
    }
}



async function uploadVideoToLocal(videoFile, thumbnailFile, metadata) {
    console.log('💾 Uploading video to local storage...');
    
    const timestamp = Date.now();
    const videoFileName = `${timestamp}_${videoFile.originalname}`;
    const videoPath = path.join(__dirname, '..', 'uploads', 'videos', videoFileName);
    
    // Ensure upload directory exists
    fsExtra.ensureDirSync(path.dirname(videoPath));
    
    // Write video file
    fs.writeFileSync(videoPath, videoFile.buffer);
    
    let thumbnailFileName = null;
    let thumbnailUrl = null;
    
    if (thumbnailFile) {
        // Use provided thumbnail
        thumbnailFileName = `${timestamp}_${thumbnailFile.originalname}`;
        const thumbnailPath = path.join(__dirname, '..', 'uploads', 'video-thumbnails', thumbnailFileName);
        fsExtra.ensureDirSync(path.dirname(thumbnailPath));
        fs.writeFileSync(thumbnailPath, thumbnailFile.buffer);
        thumbnailUrl = `/uploads/video-thumbnails/${thumbnailFileName}`;
        console.log('✅ Provided thumbnail saved locally');
    } else {
        // Auto-generate thumbnail
        try {
            console.log('🎬 Generating thumbnail from video...');
            thumbnailFileName = `${timestamp}_auto_thumbnail.jpg`;
            const thumbnailPath = path.join(__dirname, '..', 'uploads', 'video-thumbnails', thumbnailFileName);
            fsExtra.ensureDirSync(path.dirname(thumbnailPath));
            
            await generateVideoThumbnail(videoFile.buffer, thumbnailPath);
            thumbnailUrl = `/uploads/video-thumbnails/${thumbnailFileName}`;
            console.log('✅ Auto-generated thumbnail saved locally');
        } catch (error) {
            console.error('❌ Auto thumbnail generation failed:', error.message);
        }
    }
    
    return {
        id: `local_video_${timestamp}`,
        name: videoFile.originalname,
        title: metadata.title || videoFile.originalname.replace(/\.[^/.]+$/, ''),
        fileName: videoFile.originalname,
        size: videoFile.size,
        uploadDate: metadata.uploadDate || new Date().toISOString(),
        dateAdded: new Date().toISOString(),
        streamUrl: `/uploads/videos/${videoFileName}`,
        thumbnailUrl: thumbnailUrl,
        localFileName: videoFileName,
        localThumbnailFileName: thumbnailFileName,
        storageType: 'local',
        source: 'upload'
    };
}

// Updated upload endpoint
app.post('/api/upload', requireAdmin, upload.fields([
    { name: 'musicFile', maxCount: 1 },
    { name: 'coverFile', maxCount: 1 }
]), async (req, res) => {
    console.log('📤 File upload attempt');
    console.log('📊 Request size:', req.get('Content-Length') || 'Unknown');
    console.log('🗄️  Storage mode:', storageMode);
    
    try {
        if (!req.files || !req.files.musicFile) {
            return res.status(400).json({ error: 'No music file uploaded' });
        }

        const musicFile = req.files.musicFile[0];
        const coverFile = req.files.coverFile ? req.files.coverFile[0] : null;
        
        console.log(`Uploading: ${musicFile.originalname} (${musicFile.size} bytes)`);
        if (coverFile) {
            console.log(`Cover image: ${coverFile.originalname} (${coverFile.size} bytes)`);
        }

        const metadata = {
            title: req.body.title,
            uploadDate: req.body.uploadDate
        };

        let fileData;
        
        // Route to GCS only
        if (!isGCSConfigured) {
            throw new Error('Google Cloud Storage not configured');
        }
        fileData = await uploadToGCS(musicFile, coverFile, metadata);

        // Process stems automatically if enabled
        if (process.env.ENABLE_STEM_PROCESSING === 'true') {
            console.log('🎵 Starting automatic stem processing...');
            
            try {
                // Create temp directory for processing
                const tempDir = path.join(__dirname, 'temp-processing');
                const outputDir = path.join(__dirname, 'stems-output');
                fsExtra.ensureDirSync(tempDir);
                fsExtra.ensureDirSync(outputDir);
                
                // Use the uploaded file directly for processing
                let inputFilePath;
                
                if (storageMode === STORAGE_MODES.GCS && fileData.gcsFileName) {
                    // Download from GCS for processing
                    const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
                    const gcsFile = bucket.file(fileData.gcsFileName);
                    inputFilePath = path.join(tempDir, `temp_${Date.now()}.${path.extname(musicFile.originalname)}`);
                    
                    await gcsFile.download({ destination: inputFilePath });
                    console.log('✅ Downloaded file from GCS for stem processing');
                    
                } else {
                    // Use the original uploaded file buffer
                    inputFilePath = path.join(tempDir, `temp_${Date.now()}.${path.extname(musicFile.originalname)}`);
                    fs.writeFileSync(inputFilePath, musicFile.buffer);
                    console.log('✅ Created temp file for stem processing');
                }
                
                // Process stems with Demucs
                console.log('🔄 Processing stems with Demucs...');
                const stemResult = await processStemsWithDemucs(inputFilePath, outputDir);
                
                if (stemResult.success) {
                    // Upload stems to storage
                    const stemFiles = {};
                    Object.entries(stemResult.stems).forEach(([stemName, stemPath]) => {
                        stemFiles[stemName] = stemPath;
                    });
                    
                    const uploadedStems = await uploadStemsToStorage(stemFiles, {
                        title: fileData.name,
                        uploadDate: fileData.uploadDate
                    }, storageMode);
                    
                    // Add stems to file data
                    fileData.stems = uploadedStems;
                    console.log('✅ Stems processed and uploaded successfully');
                    
                    // Clean up temp files
                    fs.unlinkSync(inputFilePath);
                    Object.values(stemResult.stems).forEach(stemPath => {
                        if (fs.existsSync(stemPath)) {
                            fs.unlinkSync(stemPath);
                        }
                    });
                } else {
                    console.log('⚠️ Stem processing failed, continuing without stems');
                    // Clean up temp file
                    if (fs.existsSync(inputFilePath)) {
                        fs.unlinkSync(inputFilePath);
                    }
                }
                
            } catch (stemError) {
                console.error('❌ Stem processing error (continuing without stems):', stemError);
                // Clean up temp file if it exists
                if (typeof inputFilePath !== 'undefined' && fs.existsSync(inputFilePath)) {
                    fs.unlinkSync(inputFilePath);
                }
            }
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
            stemsProcessed: fileData.stems ? Object.keys(fileData.stems).length > 0 : false,
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
        } else if (file.storageType === 'cloudinary') {
            // Cloudinary support has been removed - skip deletion
            console.log('⚠️  Cloudinary file found but Cloudinary support has been removed');
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

// Generate signed URL for any GCS file (for stems)
app.post('/api/generate-url', async (req, res) => {
    try {
        const { fileName } = req.body;
        
        if (!fileName) {
            return res.status(400).json({ error: 'fileName required' });
        }
        
        if (isGCSConfigured) {
            const signedUrl = await generateSignedUrl(fileName, 24);
            res.json({ url: signedUrl });
        } else {
            res.status(400).json({ error: 'Google Cloud Storage not configured' });
        }
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

// Generate signed upload URL for direct GCS upload (bypasses Cloud Run size limits)
app.post('/api/upload/signed-url', requireAdmin, async (req, res) => {
    try {
        const { fileName, contentType, fileSize } = req.body;
        
        if (!fileName || !contentType) {
            return res.status(400).json({ error: 'fileName and contentType are required' });
        }

        // Check file size limits
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (fileSize && fileSize > maxSize) {
            return res.status(400).json({ error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` });
        }

        if (!isGCSConfigured) {
            return res.status(400).json({ error: 'Google Cloud Storage not configured' });
        }

        const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
        const timestamp = Date.now();
        const gcsFileName = `music/${timestamp}_${fileName}`;
        const file = bucket.file(gcsFileName);

        // Generate signed upload URL
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
            contentType: contentType,
        });

        console.log(`🔗 Generated upload URL for: ${fileName} (${fileSize} bytes)`);

        res.json({ 
            uploadUrl: url, 
            gcsFileName: gcsFileName,
            uploadId: timestamp 
        });
    } catch (error) {
        console.error('Error generating signed upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

// Confirm upload and process file after direct GCS upload
app.post('/api/upload/confirm', requireAdmin, async (req, res) => {
    try {
        const { gcsFileName, uploadId, title, originalName, fileSize, mimeType, coverGcsFileName } = req.body;
        
        if (!gcsFileName || !originalName) {
            return res.status(400).json({ error: 'gcsFileName and originalName are required' });
        }

        // Create file metadata
        const fileData = {
            id: `gcs_${uploadId}`,
            name: originalName,
            title: title || originalName.replace(/\.[^/.]+$/, ''),
            size: fileSize || 0,
            mimeType: mimeType || 'audio/mpeg',
            createdTime: new Date().toISOString(),
            uploadDate: new Date().toISOString(),
            gcsFileName: gcsFileName,
            gcsCoverFileName: coverGcsFileName || null,
            streamUrl: null, // Will generate signed URL on-demand
            coverUrl: null,
            storageType: 'gcs'
        };

        // Add to music files
        musicFiles.push(fileData);
        saveMusicFiles();

        console.log(`✅ Direct upload confirmed: ${originalName}`);

        // Process stems if enabled
        let stemsProcessed = false;
        if (process.env.ENABLE_STEM_PROCESSING === 'true') {
            try {
                console.log('🎵 Starting stem processing...');
                
                // Create temp directory for processing
                const tempDir = path.join(__dirname, 'temp-processing');
                const outputDir = path.join(__dirname, 'stems-output');
                fsExtra.ensureDirSync(tempDir);
                fsExtra.ensureDirSync(outputDir);
                
                // Download from GCS for processing
                const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
                const gcsFile = bucket.file(gcsFileName);
                const inputFilePath = path.join(tempDir, `temp_${Date.now()}.${path.extname(originalName)}`);
                
                await gcsFile.download({ destination: inputFilePath });
                console.log('✅ Downloaded file from GCS for stem processing');
                
                // Process stems with Demucs
                const stemResult = await processStemsWithDemucs(inputFilePath, outputDir);
                
                if (stemResult.success) {
                    // Upload stems to storage
                    const stemFiles = {};
                    Object.entries(stemResult.stems).forEach(([stemName, stemPath]) => {
                        stemFiles[stemName] = stemPath;
                    });
                    
                    const uploadedStems = await uploadStemsToStorage(stemFiles, {
                        title: fileData.name,
                        uploadDate: fileData.uploadDate
                    }, STORAGE_MODES.GCS);
                    
                    // Update file record with stems
                    fileData.stems = uploadedStems;
                    saveMusicFiles();
                    stemsProcessed = true;
                    
                    // Clean up temp files
                    fs.unlinkSync(inputFilePath);
                    Object.values(stemResult.stems).forEach(stemPath => {
                        if (fs.existsSync(stemPath)) {
                            fs.unlinkSync(stemPath);
                        }
                    });
                    
                    console.log('✅ Stems processed successfully for direct upload');
                } else {
                    console.error('❌ Stem processing failed:', stemResult.error);
                }
            } catch (error) {
                console.error('❌ Stem processing failed:', error);
            }
        }

        res.json({ 
            success: true, 
            file: fileData,
            stemsProcessed 
        });
    } catch (error) {
        console.error('Error confirming upload:', error);
        res.status(500).json({ error: 'Failed to confirm upload' });
    }
});

// Stem processing endpoint
app.post('/api/process-stems', async (req, res) => {
    console.log('🎵 Stem processing request received');
    
    try {
        const { fileId, fileName } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ error: 'File ID required' });
        }
        
        // Find the file
        const file = musicFiles.find(f => f.id === fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        console.log(`🔄 Processing stems for: ${file.name}`);
        
        // Check if stems already exist
        if (file.stems && Object.keys(file.stems).length > 0) {
            console.log('✅ Stems already exist');
            return res.json({ 
                success: true, 
                message: 'Stems already processed',
                stems: file.stems 
            });
        }
        
        // Create temp directory for processing
        const tempDir = path.join(__dirname, 'temp-processing');
        const outputDir = path.join(__dirname, 'stems-output');
        fsExtra.ensureDirSync(tempDir);
        fsExtra.ensureDirSync(outputDir);
        
        // Download or get the audio file
        let inputFilePath;
        
        if (file.storageType === 'gcs' && isGCSConfigured) {
            // Download from GCS
            const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
            const gcsFile = bucket.file(file.gcsFileName);
            inputFilePath = path.join(tempDir, `temp_${Date.now()}.${path.extname(file.name)}`);
            
            await gcsFile.download({ destination: inputFilePath });
            console.log('✅ Downloaded file from GCS for processing');
            
        } else if (file.storageType === 'cloudinary') {
            // Cloudinary support has been removed
            return res.status(400).json({ error: 'Cloudinary files are no longer supported for processing' });
            
        } else {
            return res.status(400).json({ error: 'File not available for processing' });
        }
        
        // Process stems with Demucs
        const stemResult = await processStemsWithDemucs(inputFilePath, outputDir);
        
        if (!stemResult.success) {
            throw new Error(stemResult.error || 'Stem processing failed');
        }
        
        // Upload stems to storage
        const stemFiles = {};
        // Convert stems object to the expected format
        Object.entries(stemResult.stems).forEach(([stemName, stemPath]) => {
            stemFiles[stemName] = stemPath;
        });
        
        const uploadedStems = await uploadStemsToStorage(stemFiles, {
            title: file.name,
            uploadDate: new Date().toISOString()
        }, storageMode);
        
        // Update file record with stems
        file.stems = uploadedStems;
        saveMusicFiles();
        
        // Clean up temp files
        fs.unlinkSync(inputFilePath);
        Object.values(stemResult.stems).forEach(stemPath => {
            if (fs.existsSync(stemPath)) {
                fs.unlinkSync(stemPath);
            }
        });
        
        console.log('✅ Stem processing completed successfully');
        res.json({ 
            success: true, 
            message: 'Stems processed successfully',
            stems: uploadedStems 
        });
        
    } catch (error) {
        console.error('❌ Stem processing error:', error);
        res.status(500).json({ 
            error: 'Stem processing failed: ' + error.message 
        });
    }
});

// Video Management Endpoints
app.get('/api/videos', async (req, res) => {
    console.log(`📼 Returning ${videoFiles.length} video files`);
    
    // Filter out fake video entries that are actually streams (have YouTube URLs)
    const realVideoFiles = videoFiles.filter(video => 
        video.source !== 'stream' && 
        !video.originalStreamId &&
        (!video.streamUrl || !video.streamUrl.includes('youtube.com'))
    );
    
    console.log(`📼 Filtered to ${realVideoFiles.length} real video files (removed ${videoFiles.length - realVideoFiles.length} stream-converted entries)`);
    
    // For GCS videos, generate fresh signed URLs  
    const videosWithUrls = await Promise.all(realVideoFiles.map(async (video) => {
        if (video.storageType === 'gcs' && isGCSConfigured && video.gcsFileName) {
            const streamUrl = await generateSignedUrl(video.gcsFileName, 24);
            let thumbnailUrl = video.thumbnailUrl;
            
            // Generate fresh signed URL for thumbnail if it exists
            if (video.gcsThumbnailFileName) {
                thumbnailUrl = await generateSignedUrl(video.gcsThumbnailFileName, 24);
            }
            
            return { ...video, streamUrl, thumbnailUrl };
        }
        return video;
    }));
    
    res.json({ 
        videos: videosWithUrls,
        storageMode: storageMode
    });
});

app.post('/api/videos', requireAdmin, (req, res) => {
    console.log('📼 Video upload request received');
    
    upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ])(req, res, async (err) => {
        if (err) {
            console.error('❌ Video upload error:', err);
            return res.status(400).json({ error: 'Video upload failed: ' + err.message });
        }
        
        try {
            const videoFile = req.files?.video?.[0];
            const thumbnailFile = req.files?.thumbnail?.[0];
            const { title } = req.body;
            
            if (!videoFile) {
                return res.status(400).json({ error: 'No video file provided' });
            }
            
            console.log(`📤 Processing video upload: ${videoFile.originalname} (${videoFile.size} bytes)`);
            
            // Upload to storage (similar to music but for videos)
            let uploadResult;
            const metadata = {
                title: title || videoFile.originalname.replace(/\.[^/.]+$/, ''),
                uploadDate: new Date().toISOString()
            };
            
            if (!isGCSConfigured) {
                throw new Error('Google Cloud Storage not configured');
            }
            uploadResult = await uploadVideoToGCS(videoFile, thumbnailFile, metadata);
            
            videoFiles.push(uploadResult);
            saveVideoFiles();
            
            console.log('✅ Video upload completed:', uploadResult.title);
            res.json({ success: true, video: uploadResult });
            
        } catch (error) {
            console.error('❌ Video upload error:', error);
            res.status(500).json({ error: 'Video upload failed: ' + error.message });
        }
    });
});

app.delete('/api/videos/:videoId', requireAdmin, async (req, res) => {
    try {
        const videoId = decodeURIComponent(req.params.videoId);
        console.log(`🗑️ Deleting video: ${videoId}`);
        
        const videoIndex = videoFiles.findIndex(v => v.id === videoId);
        if (videoIndex === -1) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        const video = videoFiles[videoIndex];
        
        // Delete from GCS storage if not a converted stream
        if (video.source !== 'stream' && video.storageType === 'gcs' && isGCSConfigured && video.gcsFileName) {
            const bucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);
            await bucket.file(video.gcsFileName).delete().catch(console.error);
            if (video.gcsThumbnailFileName) {
                await bucket.file(video.gcsThumbnailFileName).delete().catch(console.error);
            }
        }
        
        videoFiles.splice(videoIndex, 1);
        saveVideoFiles();
        
        res.json({ success: true, message: 'Video deleted successfully' });
        
    } catch (error) {
        console.error('❌ Video delete error:', error);
        res.status(500).json({ error: 'Delete failed: ' + error.message });
    }
});

// Stream Management Endpoints  
app.get('/api/streams', async (req, res) => {
    console.log(`📺 Returning ${liveStreams.length} live streams`);
    
    // Check if we need to update stream statuses
    if (liveStreams.length > 0) {
        await checkAllStreamStatuses();
    }
    
    // Include stream-derived videos in the streams tab
    const streamVideos = videoFiles.filter(video => 
        video.source === 'stream' || video.isStreamVideo
    );
    
    console.log(`📺 Including ${streamVideos.length} stream-derived videos`);
    
    // Convert stream videos back to stream format for display in streams tab
    const streamVideosAsStreams = streamVideos
        .filter(video => {
            // Validate that we have proper YouTube data
            const hasYouTubeId = video.youtubeId || extractYouTubeId(video.streamUrl);
            if (!hasYouTubeId) {
                console.warn(`⚠️ Skipping stream video with missing/invalid YouTube ID:`, {
                    id: video.id,
                    title: video.title,
                    streamUrl: video.streamUrl
                });
                return false;
            }
            return true;
        })
        .map(video => {
            // Extract YouTube ID if missing
            const youtubeId = video.youtubeId || extractYouTubeId(video.streamUrl);
            
            return {
                id: video.id,
                title: video.title,
                thumbnail: video.thumbnailUrl,
                youtubeId: youtubeId,
                youtubeUrl: video.streamUrl,
                isLive: false,
                viewers: null,
                description: video.description,
                status: 'archived',
                archivedDate: video.dateAdded,
                isStreamVideo: true // Flag to identify these as converted videos
            };
        });
    
    // Combine all streams (active + archived) with stream-derived videos
    const allStreams = [...liveStreams, ...streamVideosAsStreams];
    
    console.log(`📺 Total streams (active + archived): ${allStreams.length}`);
    
    res.json({ 
        streams: allStreams,
        hasLiveStream: liveStreams.some(stream => stream.isLive)
    });
});

app.get('/api/streams/admin', requireAdmin, async (req, res) => {
    console.log(`📺 Admin: Returning all ${liveStreams.length} streams`);
    
    try {
        if (liveStreams.length > 0) {
            await checkAllStreamStatuses();
        }
        
        res.json({ 
            streams: liveStreams
        });
    } catch (error) {
        console.error('❌ Error checking stream statuses:', error);
        // Return streams anyway, even if status check failed
        res.json({ 
            streams: liveStreams,
            statusCheckFailed: true
        });
    }
});

app.post('/api/streams', requireAdmin, async (req, res) => {
    try {
        const { youtubeUrl } = req.body;
        
        if (!youtubeUrl) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }
        
        const youtubeId = extractYouTubeId(youtubeUrl);
        if (!youtubeId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }
        
        // Check if stream already exists
        const existingStream = liveStreams.find(s => s.youtubeId === youtubeId);
        if (existingStream) {
            return res.status(400).json({ error: 'Stream already exists' });
        }
        
        console.log(`📺 Adding new stream: ${youtubeId}`);
        
        // Get video info from YouTube API (fallback if no API key)
        const videoInfo = await getYouTubeVideoInfo(youtubeId);
        
        let streamData;
        if (videoInfo) {
            // Use YouTube API data
            streamData = {
                id: `stream_${Date.now()}_${youtubeId}`,
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                youtubeId: youtubeId,
                youtubeUrl: youtubeUrl,
                isLive: videoInfo.isLive,
                viewers: videoInfo.viewerCount,
                description: videoInfo.description,
                status: videoInfo.status === 'live' ? 'live' : videoInfo.status === 'upcoming' ? 'upcoming' : 'ended',
                startTime: videoInfo.startTime,
                endTime: videoInfo.endTime
            };
        } else {
            // Fallback: create stream with basic info (no YouTube API)
            console.log('⚠️ YouTube API unavailable, creating stream with basic info');
            streamData = {
                id: `stream_${Date.now()}_${youtubeId}`,
                title: `YouTube Stream ${youtubeId}`,
                thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`, // YouTube thumbnail URL
                youtubeId: youtubeId,
                youtubeUrl: youtubeUrl,
                isLive: true, // Assume live for now
                viewers: null,
                description: 'Live stream (YouTube API unavailable)',
                status: 'live',
                startTime: new Date().toISOString(),
                endTime: null
            };
        }
        
        liveStreams.push(streamData);
        saveLiveStreams();
        
        console.log(`✅ Stream added: ${streamData.title} (${streamData.status})`);
        res.json({ success: true, stream: streamData });
        
    } catch (error) {
        console.error('❌ Stream add error:', error);
        res.status(500).json({ error: 'Failed to add stream: ' + error.message });
    }
});

app.delete('/api/streams/:streamId', requireAdmin, async (req, res) => {
    try {
        const streamId = decodeURIComponent(req.params.streamId);
        console.log(`🗑️ Deleting stream: ${streamId}`);
        
        const streamIndex = liveStreams.findIndex(s => s.id === streamId);
        if (streamIndex === -1) {
            return res.status(404).json({ error: 'Stream not found' });
        }
        
        liveStreams.splice(streamIndex, 1);
        saveLiveStreams();
        
        res.json({ success: true, message: 'Stream deleted successfully' });
        
    } catch (error) {
        console.error('❌ Stream delete error:', error);
        res.status(500).json({ error: 'Delete failed: ' + error.message });
    }
});



// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        mode: 'Production (Google Cloud Storage)',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        filesCount: musicFiles.length,
        gcsConfigured: isGCSConfigured,
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
    
    if (isGCSConfigured) {
        console.log(`🌩️  Google Cloud Storage ready with bucket: ${process.env.GCS_BUCKET_NAME}`);
        console.log(`📊 File size limit: 500MB`);
    } else {
        console.log(`⚠️  Google Cloud Storage not configured`);
    }
});

// Increase server timeout for large file uploads and stem processing (20 minutes)
server.timeout = 1200000;
server.keepAliveTimeout = 1200000;
server.headersTimeout = 1210000;

export default app; 