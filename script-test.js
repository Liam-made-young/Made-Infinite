console.log('🚀 MADE INFINITE initializing...');

// Configuration
const API_BASE = window.location.origin + '/api';
let isAdminLoggedIn = false;
let musicFiles = [];
let selectedCoverFile = null;

// Stem Control Variables
let stemPlayers = {};
let currentStemFile = null;
let stemProcessingInProgress = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded');
    setupEventListeners();
    loadMusicFiles();
    testServerConnection();
});

// Event Listeners Setup
function setupEventListeners() {
    // Light mode toggle
    const lightToggle = document.querySelector('.light-toggle');
    if (lightToggle) {
        lightToggle.addEventListener('click', toggleLightMode);
    }
    
    // Admin toggle
    const adminToggle = document.querySelector('.admin-toggle');
    if (adminToggle) {
        adminToggle.addEventListener('click', toggleAdminLogin);
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('closeAdminModal')) {
            btn.addEventListener('click', closeAdminModal);
        }
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('closeMusicPlayer')) {
            btn.addEventListener('click', closeMusicPlayer);
        }
    });
    
    // Admin login button
    const loginBtn = document.querySelector('.access-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', adminLogin);
    }
    
    // Admin logout button
    const logoutBtn = document.querySelector('.exit-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
    
    // Upload buttons
    const audioSelectBtn = document.getElementById('audioSelectBtn');
    if (audioSelectBtn && !audioSelectBtn.hasAttribute('data-listener')) {
        audioSelectBtn.addEventListener('click', () => {
            console.log('🎵 Audio file selector clicked');
            document.getElementById('fileInput').click();
        });
        audioSelectBtn.setAttribute('data-listener', 'true');
        console.log('✅ Audio select button listener added');
    }
    
    const coverSelectBtn = document.getElementById('coverSelectBtn');
    if (coverSelectBtn && !coverSelectBtn.hasAttribute('data-listener')) {
        coverSelectBtn.addEventListener('click', () => {
            console.log('🖼️ Cover file selector clicked');
            document.getElementById('coverInput').click();
        });
        coverSelectBtn.setAttribute('data-listener', 'true');
        console.log('✅ Cover select button listener added');
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn && !uploadBtn.hasAttribute('data-listener')) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📤 Upload button clicked');
            uploadFiles();
        });
        uploadBtn.setAttribute('data-listener', 'true');
        console.log('✅ Upload button listener added');
    }
    
    // File input listeners (prevent duplicates)
    const fileInput = document.getElementById('fileInput');
    if (fileInput && !fileInput.hasAttribute('data-listener')) {
        fileInput.addEventListener('change', handleAudioFileSelection);
        fileInput.setAttribute('data-listener', 'true');
        console.log('✅ Audio file input listener added');
    }
    
    const coverInput = document.getElementById('coverInput');
    if (coverInput && !coverInput.hasAttribute('data-listener')) {
        coverInput.addEventListener('change', handleCoverFileSelection);
        coverInput.setAttribute('data-listener', 'true');
        console.log('✅ Cover file input listener added');
    }
    
    // Player controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
        console.log('✅ Play/pause button listener added');
    }
    
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', previousTrack);
        console.log('✅ Previous button listener added');
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', nextTrack);
        console.log('✅ Next button listener added');
    }
    
    // Volume controls removed - using individual stem controls only
    
    // Keyboard controls
    setupKeyboardControls();
    
    console.log('✅ Event listeners configured');
}

function toggleLightMode() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('lightMode', isLight);
    console.log(`🌓 Light mode: ${isLight ? 'ON' : 'OFF'}`);
}

// Load saved theme
if (localStorage.getItem('lightMode') === 'true') {
    document.body.classList.add('light-mode');
}

function testServerConnection() {
    fetch(`${API_BASE}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('🌐 Server status:', data.status);
            console.log('📊 Mode:', data.mode);
            console.log('📁 Files:', data.filesCount);
        })
        .catch(error => {
            console.error('❌ Server connection failed:', error);
        });
}

// Admin Functions
function toggleAdminLogin() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.style.display = 'block';
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.focus();
        }
    }
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    if (!password) {
        showStatus('Enter password', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            isAdminLoggedIn = true;
            console.log('✅ Admin access granted');
            console.log('Response data:', data);
            showStatus('ACCESS GRANTED', 'success');
            closeAdminModal();
            
            // Small delay to ensure modal closes before showing panel
            setTimeout(() => {
                showAdminPanel();
            }, 100);
        } else {
            console.error('❌ Access denied:', data);
            showStatus('ACCESS DENIED', 'error');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showStatus('CONNECTION ERROR', 'error');
    }
}

function showAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        console.log('✅ Showing admin panel');
        panel.style.display = 'block';
        refreshAdminLibrary();
        
        // Debug: Log panel visibility
        const computedStyle = window.getComputedStyle(panel);
        console.log('Admin panel display:', computedStyle.display);
        console.log('Admin panel visibility:', computedStyle.visibility);
    } else {
        console.error('❌ Admin panel element not found');
    }
}

// Debug function to bypass login
function debugShowAdmin() {
    console.log('🔧 Debug: Force showing admin panel');
    isAdminLoggedIn = true;
    showAdminPanel();
}

async function logoutAdmin() {
    try {
        await fetch(`${API_BASE}/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        isAdminLoggedIn = false;
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.style.display = 'none';
        }
        console.log('🚪 Admin logout');
        showStatus('LOGOUT COMPLETE', 'success');
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

// File Upload Functions
function handleAudioFileSelection(event) {
    const files = event.target.files;
    const preview = document.getElementById('audioPreview');
    const content = preview.querySelector('.preview-content');
    
    if (files.length > 0) {
        // Validate file types and sizes
        let validFiles = 0;
        let totalSize = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check if it's an audio file
            if (!file.type.startsWith('audio/')) {
                showStatus(`${file.name} is not an audio file`, 'error');
                continue;
            }
            
            // Check file size (200MB limit)
            if (file.size > 200 * 1024 * 1024) {
                showStatus(`${file.name} is too large (max 200MB)`, 'error');
                continue;
            }
            
            validFiles++;
            totalSize += file.size;
        }
        
        if (validFiles > 0) {
            content.innerHTML = `${validFiles} AUDIO FILE${validFiles > 1 ? 'S' : ''} (${formatFileSize(totalSize)})`;
            console.log(`🎵 ${validFiles} valid audio file(s) selected`);
        } else {
            content.innerHTML = 'NO VALID FILES';
            event.target.value = ''; // Clear invalid selection
        }
    } else {
        content.innerHTML = 'SELECT FILES';
    }
}

function handleCoverFileSelection(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('coverPreview');
    const content = preview.querySelector('.preview-content');
    
    if (file) {
        // Validate image file
        if (!file.type.startsWith('image/')) {
            showStatus(`${file.name} is not an image file`, 'error');
            content.innerHTML = 'SELECT IMAGE';
            event.target.value = '';
            selectedCoverFile = null;
            return;
        }
        
        // Check file size (10MB limit for images)
        if (file.size > 10 * 1024 * 1024) {
            showStatus(`${file.name} is too large (max 10MB)`, 'error');
            content.innerHTML = 'SELECT IMAGE';
            event.target.value = '';
            selectedCoverFile = null;
            return;
        }
        
        selectedCoverFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            content.innerHTML = `<img src="${e.target.result}" class="preview-image" alt="Cover preview">`;
        };
        reader.readAsDataURL(file);
        console.log('🖼️ Cover image selected:', file.name, `(${formatFileSize(file.size)})`);
    } else {
        selectedCoverFile = null;
        content.innerHTML = 'SELECT IMAGE';
    }
}

// Upload prevention flag
let isUploading = false;

// Progress tracking functions
function showUploadProgress() {
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.style.display = 'block';
}

function hideUploadProgress() {
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.style.display = 'none';
}

function updateUploadProgress(percent, fileName, fileIndex, totalFiles) {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressText = document.getElementById('progressText');
    const currentFile = document.getElementById('currentFile');
    
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
    progressText.textContent = `Uploading ${fileIndex}/${totalFiles}`;
    currentFile.textContent = fileName;
}

async function uploadFiles() {
    // Prevent duplicate uploads
    if (isUploading) {
        console.log('⚠️ Upload already in progress, ignoring duplicate call');
        return;
    }
    
    isUploading = true;
    console.log('📤 Starting upload process');
    
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    const titleInput = document.getElementById('trackTitle');
    const customTitle = titleInput.value.trim();
    
    if (files.length === 0) {
        showStatus('SELECT AUDIO FILES', 'error');
        isUploading = false;
        return;
    }
    
    // Final validation before upload
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('audio/')) {
            showStatus(`${file.name} is not an audio file - skipping`, 'error');
            isUploading = false;
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            showStatus(`${file.name} is too large (max 200MB) - skipping`, 'error');
            isUploading = false;
            return;
        }
    }
    
    if (selectedCoverFile) {
        if (!selectedCoverFile.type.startsWith('image/')) {
            showStatus('Cover file is not an image - removing', 'error');
            selectedCoverFile = null;
        } else if (selectedCoverFile.size > 10 * 1024 * 1024) {
            showStatus('Cover file is too large (max 10MB) - removing', 'error');
            selectedCoverFile = null;
        }
    }
    
    // Show progress bar
    showUploadProgress();
    showStatus('UPLOADING...', 'success');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('musicFile', file);
        
        // Add custom title or use filename
        const finalTitle = customTitle || file.name.replace(/\.[^/.]+$/, '');
        formData.append('title', finalTitle);
        
        // Add upload timestamp
        formData.append('uploadDate', new Date().toISOString());
        
        // Add cover image if selected
        if (selectedCoverFile) {
            formData.append('coverImage', selectedCoverFile);
        }
        
        try {
            // Update progress for current file start
            updateUploadProgress(
                ((i) / files.length) * 100, 
                file.name, 
                i + 1, 
                files.length
            );
            
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            // Handle 413 Payload Too Large specifically
            if (response.status === 413) {
                throw new Error('File too large for server. Try a smaller file or check your internet connection.');
            }
            
            const data = await response.json();
            
            if (response.ok) {
                // Show stem processing status if stems were processed
                if (data.stemsProcessed) {
                    updateUploadProgress(
                        ((i + 0.5) / files.length) * 100, 
                        `🎵 Processing stems for ${file.name}...`, 
                        i + 1, 
                        files.length
                    );
                    // Give more time for stem processing feedback
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    updateUploadProgress(
                        ((i + 1) / files.length) * 100, 
                        `✅ ${file.name} + stems ready!`, 
                        i + 1, 
                        files.length
                    );
                    console.log(`✅ Upload ${i + 1}/${files.length} complete with stems:`, file.name);
                } else {
                    // Update progress for completed file (no stems)
                    updateUploadProgress(
                        ((i + 1) / files.length) * 100, 
                        `✅ ${file.name}`, 
                        i + 1, 
                        files.length
                    );
                    console.log(`✅ Upload ${i + 1}/${files.length} complete:`, file.name);
                }
                
                // Brief pause to show completion
                await new Promise(resolve => setTimeout(resolve, 800));
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error(`❌ Upload ${i + 1} failed:`, error);
            showStatus(`UPLOAD FAILED: ${error.message}`, 'error');
            hideUploadProgress();
            isUploading = false;
            return;
        }
    }
    
    showStatus('UPLOAD COMPLETE - STEMS READY!', 'success');
    
    // Hide progress bar after completion
    setTimeout(() => {
        hideUploadProgress();
    }, 2000);
    
    // Reset inputs
    fileInput.value = '';
    titleInput.value = '';
    document.getElementById('coverInput').value = '';
    selectedCoverFile = null;
    
    // Reset previews
    document.getElementById('audioPreview').querySelector('.preview-content').innerHTML = 'SELECT FILES';
    document.getElementById('coverPreview').querySelector('.preview-content').innerHTML = 'SELECT IMAGE';
    
    // Refresh libraries
    await loadMusicFiles();
    refreshAdminLibrary();
    refreshPublicLibrary();
    
    // Reset upload flag
    isUploading = false;
    console.log('✅ Upload process completed');
}

// Music Library Functions
async function loadMusicFiles() {
    try {
        const response = await fetch(`${API_BASE}/files`);
        const data = await response.json();
        
        if (response.ok) {
            musicFiles = data.files;
            lastMusicFileCount = musicFiles.length; // Set initial count for change detection
            console.log(`📚 Loaded ${musicFiles.length} tracks`);
            refreshPublicLibrary();
        } else {
            console.error('❌ Failed to load files:', data.error);
        }
    } catch (error) {
        console.error('❌ Network error:', error);
    }
}

function refreshAdminLibrary() {
    const container = document.getElementById('adminFileList');
    if (!container) return;
    
    if (musicFiles.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-tertiary);">NO TRACKS</div>';
        return;
    }
    
    // Sort by upload date (newest first)
    const sortedFiles = [...musicFiles].sort((a, b) => {
        const dateA = new Date(a.uploadDate || a.dateAdded || 0);
        const dateB = new Date(b.uploadDate || b.dateAdded || 0);
        return dateB - dateA;
    });
    
    let html = '';
    sortedFiles.forEach(file => {
        const escapedId = file.id.replace(/'/g, "\\'");
        const uploadDate = file.uploadDate || file.dateAdded;
        const formattedDate = uploadDate ? formatUploadDate(uploadDate) : 'Unknown date';
        const displayName = file.title || file.name;
        
        // Determine stem status for this file
        let stemStatusClass = 'stem-status-red';
        let stemTooltip = 'No stems yet. Play this track to start stem processing.';
        
        if (file.stems && Object.keys(file.stems).length > 0) {
            stemStatusClass = 'stem-status-green';
            stemTooltip = 'Stems ready! Use the volume sliders to mix individual instruments.';
        } else if (file.id === currentStemFile?.id && stemProcessingInProgress) {
            stemStatusClass = 'stem-status-yellow';
            stemTooltip = 'Processing stems with Demucs... This takes 1-2 minutes.';
        }

        html += `
            <div class="admin-file-item">
                <div class="file-cover">
                    ${file.coverUrl ? 
                        `<img src="${file.coverUrl}" alt="Cover">` : 
                        '<div style="color: var(--text-tertiary);">♫</div>'
                    }
                </div>
                <div class="file-details">
                    <div class="file-name">
                        ${displayName}
                        <span class="stem-status-bubble ${stemStatusClass}" data-file-id="${file.id}" title="${stemTooltip}"></span>
                    </div>
                    <div class="file-meta">
                        <span>${formatFileSize(file.size)}</span>
                        <span class="upload-date">• ${formattedDate}</span>
                    </div>
                </div>
                <button onclick="deleteFile('${escapedId}')" class="delete-btn">×</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Store sorted files globally so player can access them correctly
let sortedMusicFiles = [];

// Stem player variables (initialized at top of file)
let stemMode = false;
let currentTrackStems = null;

function refreshPublicLibrary() {
    const container = document.getElementById('fileDisplay');
    if (!container) return;
    
    if (musicFiles.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 80px; color: var(--text-tertiary); font-size: 1.2rem;">NO TRACKS AVAILABLE</div>';
        return;
    }
    
    // Sort by upload date (newest first) and store globally
    sortedMusicFiles = [...musicFiles].sort((a, b) => {
        const dateA = new Date(a.uploadDate || a.dateAdded || 0);
        const dateB = new Date(b.uploadDate || b.dateAdded || 0);
        return dateB - dateA;
    });
    
    let html = '';
    sortedMusicFiles.forEach((file, index) => {
        const displayName = file.title || file.name;
        const uploadDate = file.uploadDate || file.dateAdded;
        const formattedDate = uploadDate ? formatUploadDate(uploadDate) : '';
        
        // Determine stem status for this file
        let stemStatusClass = 'stem-status-red';
        let stemTooltip = 'No stems yet. Play this track to start stem processing.';
        
        if (file.stems && Object.keys(file.stems).length > 0) {
            stemStatusClass = 'stem-status-green';
            stemTooltip = 'Stems ready! Use the volume sliders to mix individual instruments.';
        } else if (file.id === currentStemFile?.id && stemProcessingInProgress) {
            stemStatusClass = 'stem-status-yellow';
            stemTooltip = 'Processing stems with Demucs... This takes 1-2 minutes.';
        }

        html += `
            <div class="music-card" onclick="playMusicFromSorted(${index})">
                <div class="card-cover">
                    ${file.coverUrl ? 
                        `<img src="${file.coverUrl}" alt="${displayName}">` : 
                        '<div class="default-cover">♫</div>'
                    }
                </div>
                <div class="card-info">
                    <div class="card-title">
                        ${displayName}
                        <span class="stem-status-bubble ${stemStatusClass}" data-file-id="${file.id}" title="${stemTooltip}"></span>
                    </div>
                    <div class="card-meta">
                        <span>${formatFileSize(file.size)}</span>
                        ${formattedDate ? `<span class="upload-date">• ${formattedDate}</span>` : ''}
                    </div>
                    <div class="card-actions">
                        <button onclick="event.stopPropagation(); playMusicFromSorted(${index})" class="play-btn">PLAY</button>
                        <button onclick="event.stopPropagation(); downloadMusicZip('${file.id}', '${displayName}')" class="download-btn">SAVE</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Music Player Functions
let currentTrackIndex = 0;
let isPlaying = false;
let musicPlayer = null;
let usingOriginalArray = true; // Track which array we're using

function playMusic(index) {
    if (musicFiles[index]) {
        const modal = document.getElementById('musicPlayerModal');
        const file = musicFiles[index];
        
        // Check if the modal is already open with the same song
        if (modal && modal.style.display === 'block' && 
            currentStemFile && currentStemFile.id === file.id) {
            // Just show the modal if it's the same song
            console.log('🎵 Reopening existing player for same song');
            return;
        }
        
        currentTrackIndex = index;
        usingOriginalArray = true;
        openMusicPlayer(index, musicFiles);
    }
}

function playMusicFromSorted(index) {
    if (sortedMusicFiles[index]) {
        const modal = document.getElementById('musicPlayerModal');
        const file = sortedMusicFiles[index];
        
        // Check if the modal is already open with the same song
        if (modal && modal.style.display === 'block' && 
            currentStemFile && currentStemFile.id === file.id) {
            // Just show the modal if it's the same song
            console.log('🎵 Reopening existing player for same song');
            return;
        }
        
        currentTrackIndex = index;
        usingOriginalArray = false;
        openMusicPlayer(index, sortedMusicFiles);
    }
}

function openMusicPlayer(trackIndex, filesArray) {
    const modal = document.getElementById('musicPlayerModal');
    const player = document.getElementById('musicPlayer');
    const titleElement = document.getElementById('playerTrackTitle');
    const trackNameElement = document.getElementById('currentTrackName');
    const albumArt = document.getElementById('albumArt');
    
    if (!modal || !player || !titleElement || !trackNameElement || !albumArt) {
        console.error('❌ Player elements missing');
        return;
    }
    
    const file = filesArray[trackIndex];
    const userTitle = file.title; // User input title
    const fileName = file.name;   // Original filename
    console.log(`🎵 Opening player: ${userTitle || fileName}`);
    
    // Update UI
    player.src = file.streamUrl;
    
    // Top title = user input title (or filename if no title)
    titleElement.textContent = (userTitle || fileName).toUpperCase();
    
    // Bottom title = filename (or user title if no filename)
    trackNameElement.textContent = fileName || userTitle;
    
    // Add stem status bubble to player title
    const existingBubble = titleElement.querySelector('.stem-status-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }
    const playerBubble = createStemStatusBubble(file);
    titleElement.appendChild(playerBubble);
    
    // Update album art
    if (file.coverUrl) {
        albumArt.innerHTML = `<img src="${file.coverUrl}" alt="${userTitle || fileName}">`;
    } else {
        albumArt.innerHTML = '<div class="default-art">♫</div>';
    }
    
    // Show modal
    modal.style.display = 'block';
    musicPlayer = player;
    
    // The main player is now just a silent timer for synchronization
    player.volume = 0;
    player.muted = true;
    
    // Initialize stem controls and check for processing
    currentTrackStems = file.stems || null;
    currentStemFile = file;
    initializeStemControls(file);
    
    // Update all bubbles immediately when track is selected
    updateAllStemStatusBubbles();
    
    // If no stems exist, start processing
    if (!file.stems || Object.keys(file.stems).length === 0) {
        console.log('🔄 No stems found, starting processing...');
        processStemsForFile(file);
    }
    
    // Initialize custom controls
    initializeCustomControls();
    
    // Setup event listeners
    setupPlayerEventListeners();
    
    // Set initial time display and controls
    updateTimeDisplay(0, 0);
    
    // Don't auto-play - wait for stems to load
    showStatus('LOADING STEMS...', 'success');
}

function setupPlayerEventListeners() {
    if (!musicPlayer) return;
    
    // Remove existing listeners to avoid duplicates
    musicPlayer.removeEventListener('loadstart', onLoadStart);
    musicPlayer.removeEventListener('canplay', onCanPlay);
    musicPlayer.removeEventListener('play', onPlay);
    musicPlayer.removeEventListener('pause', onPause);
    musicPlayer.removeEventListener('ended', onEnded);
    musicPlayer.removeEventListener('error', onError);
    musicPlayer.removeEventListener('timeupdate', onTimeUpdate);
    
    // Add comprehensive event listeners
    musicPlayer.addEventListener('loadstart', onLoadStart);
    musicPlayer.addEventListener('canplay', onCanPlay);
    musicPlayer.addEventListener('play', onPlay);
    musicPlayer.addEventListener('pause', onPause);
    musicPlayer.addEventListener('ended', onEnded);
    musicPlayer.addEventListener('error', onError);
    musicPlayer.addEventListener('timeupdate', onTimeUpdate);
}

function onLoadStart() {
    showStatus('LOADING AUDIO...', 'success');
}

function onCanPlay() {
    showStatus('READY TO PLAY', 'success');
    
    // Update duration when audio is ready
    if (musicPlayer && musicPlayer.duration) {
        updateTimeDisplay(musicPlayer.currentTime || 0, musicPlayer.duration);
    }
}

function onPlay() {
    isPlaying = true;
    updatePlayButton();
}

function onPause() {
    isPlaying = false;
    updatePlayButton();
}

function onEnded() {
    isPlaying = false;
    updatePlayButton();
    // Auto-advance to next track
    nextTrack();
}

function onError(e) {
    console.error('❌ Audio playback error:', e);
    const error = musicPlayer.error;
    let errorMessage = 'PLAYBACK ERROR';
    
    if (error) {
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
                errorMessage = 'PLAYBACK ABORTED';
                break;
            case error.MEDIA_ERR_NETWORK:
                errorMessage = 'NETWORK ERROR';
                break;
            case error.MEDIA_ERR_DECODE:
                errorMessage = 'DECODE ERROR';
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'FORMAT NOT SUPPORTED';
                break;
        }
    }
    
    showStatus(errorMessage, 'error');
}

function onTimeUpdate() {
    if (!musicPlayer || !musicPlayer.duration) return;
    
    const currentTime = musicPlayer.currentTime;
    const duration = musicPlayer.duration;
    const progress = (currentTime / duration) * 100;
    
    // Update progress slider and fill
    const progressSlider = document.getElementById('progressSlider');
    const progressFill = document.getElementById('progressFill');
    
    if (progressSlider && progressFill) {
        progressSlider.value = progress;
        progressFill.style.width = progress + '%';
    }
    
    // Update time display
    updateTimeDisplay(currentTime, duration);
}

function updateTimeDisplay(currentTime = 0, duration = 0) {
    const currentTimeElement = document.getElementById('currentTime');
    const totalTimeElement = document.getElementById('totalTime');
    
    if (currentTimeElement && totalTimeElement) {
        currentTimeElement.textContent = formatTime(currentTime);
        totalTimeElement.textContent = formatTime(duration);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function initializeCustomControls() {
    console.log('🎛️ Initializing custom player controls');
    
    // Progress slider control
    const progressSlider = document.getElementById('progressSlider');
    if (progressSlider) {
        progressSlider.oninput = function() {
            if (musicPlayer && musicPlayer.duration) {
                const newTime = (this.value / 100) * musicPlayer.duration;
                musicPlayer.currentTime = newTime;
                
                // Update visual progress
                const progressFill = document.getElementById('progressFill');
                if (progressFill) {
                    progressFill.style.width = this.value + '%';
                }
            }
        };
        console.log('✅ Progress slider initialized');
    }
    
    // Volume slider control
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.oninput = function() {
            if (musicPlayer) {
                const volume = this.value / 100;
                musicPlayer.volume = volume;
                
                // Update visual volume
                const volumeFill = document.getElementById('volumeFill');
                if (volumeFill) {
                    volumeFill.style.width = this.value + '%';
                }
                
                // Update mute button
                updateMuteButton();
            }
        };
        
        // Set initial volume fill
        const volumeFill = document.getElementById('volumeFill');
        if (volumeFill) {
            volumeFill.style.width = volumeSlider.value + '%';
        }
        console.log('✅ Volume slider initialized');
    }
    
    // Ensure button event listeners are set (backup)
    setupPlayerButtons();
}

function setupPlayerButtons() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn && !playPauseBtn.hasAttribute('data-listener')) {
        playPauseBtn.addEventListener('click', togglePlayPause);
        playPauseBtn.setAttribute('data-listener', 'true');
        console.log('🔄 Play/pause button listener set');
    }
    
    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn && !prevBtn.hasAttribute('data-listener')) {
        prevBtn.addEventListener('click', previousTrack);
        prevBtn.setAttribute('data-listener', 'true');
        console.log('🔄 Previous button listener set');
    }
    
    // Next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn && !nextBtn.hasAttribute('data-listener')) {
        nextBtn.addEventListener('click', nextTrack);
        nextBtn.setAttribute('data-listener', 'true');
        console.log('🔄 Next button listener set');
    }
    
    // Mute button
    // Mute button removed - using individual stem controls only
}

// Master volume and mute functions removed - now using individual stem controls only

function updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
        btn.textContent = isPlaying ? '⏸' : '▶';
    }
}

function closeMusicPlayer() {
    const modal = document.getElementById('musicPlayerModal');
    
    // Stop all stem players
    Object.values(stemPlayers).forEach(stemPlayer => {
        if (stemPlayer) {
            stemPlayer.pause();
            stemPlayer.currentTime = 0;
        }
    });
    
    // Stop main player
    if (musicPlayer) {
        musicPlayer.pause();
        musicPlayer.currentTime = 0;
        // Don't clear src or set to null - keep it for reopening
    }
    
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset custom controls
    const progressSlider = document.getElementById('progressSlider');
    const progressFill = document.getElementById('progressFill');
    if (progressSlider && progressFill) {
        progressSlider.value = 0;
        progressFill.style.width = '0%';
    }
    
    updateTimeDisplay(0, 0);
    isPlaying = false;
    updatePlayButton();
    
    // Stop sync monitoring
    if (window.stopSyncMonitoring) {
        window.stopSyncMonitoring();
    }
    
    showStatus('STOPPED', 'success');
}

function togglePlayPause() {
    if (!musicPlayer) {
        console.log('❌ No music player available');
        return;
    }
    
    // Check if we have stems loaded
    const hasStemsLoaded = Object.keys(stemPlayers).length > 0;
    
    if (!hasStemsLoaded) {
        showStatus('WAITING FOR STEMS...', 'error');
        return;
    }
    
    if (musicPlayer.paused) {
        console.log('▶️ Starting stem playback');
        musicPlayer.play().then(() => {
            isPlaying = true;
            updatePlayButton();
            showStatus('PLAYING STEMS', 'success');
        }).catch(e => {
            console.error('❌ Play error:', e);
            showStatus('PLAYBACK ERROR', 'error');
            isPlaying = false;
            updatePlayButton();
        });
    } else {
        console.log('⏸️ Pausing stem playback');
        musicPlayer.pause();
        isPlaying = false;
        updatePlayButton();
        showStatus('PAUSED', 'success');
    }
}

function previousTrack() {
    const currentArray = usingOriginalArray ? musicFiles : sortedMusicFiles;
    if (currentArray.length === 0) return;
    
    // Circular navigation - wrap around to last track
    currentTrackIndex = (currentTrackIndex - 1 + currentArray.length) % currentArray.length;
    openMusicPlayer(currentTrackIndex, currentArray);
}

function nextTrack() {
    const currentArray = usingOriginalArray ? musicFiles : sortedMusicFiles;
    if (currentArray.length === 0) return;
    
    // Circular navigation - wrap around to first track
    currentTrackIndex = (currentTrackIndex + 1) % currentArray.length;
    openMusicPlayer(currentTrackIndex, currentArray);
}

// New direct download function
async function downloadMusicFile(url, filename) {
    try {
        showStatus('DOWNLOADING...', 'success');
        console.log('💾 Starting download:', filename);
        
        // Fetch the file as a blob
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        
        showStatus('DOWNLOAD COMPLETE', 'success');
        console.log('✅ Download completed:', filename);
        
    } catch (error) {
        console.error('❌ Download failed:', error);
        showStatus('DOWNLOAD FAILED', 'error');
        
        // Fallback to old method if fetch fails
        console.log('🔄 Trying fallback download method...');
        downloadMusicFallback(url, filename);
    }
}

// Fallback download function (old method)
function downloadMusicFallback(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log('💾 Fallback download initiated:', filename);
    showStatus('DOWNLOAD STARTED', 'success');
}

// Keep old function for backward compatibility
function downloadMusic(url, filename) {
    downloadMusicFile(url, filename);
}

async function downloadMusicZip(fileId, displayName) {
    try {
        console.log(`📦 Downloading zip for: ${displayName}`);
        showStatus('PREPARING ZIP DOWNLOAD...', 'success');
        
        // Find the file object
        const file = allFiles.find(f => f.id === fileId);
        if (!file) {
            console.error('❌ File not found:', fileId);
            showStatus('FILE NOT FOUND', 'error');
            return;
        }
        
        // Check if stems exist
        if (!file.stems || Object.keys(file.stems).length === 0) {
            console.log('⚠️ No stems found, downloading original file only');
            showStatus('NO STEMS - DOWNLOADING ORIGINAL', 'success');
            await downloadMusicFile(file.streamUrl, displayName);
            return;
        }
        
        // Create zip with JSZip
        const JSZip = window.JSZip || await loadJSZip();
        const zip = new JSZip();
        
        // Add original file
        console.log('📁 Adding original file to zip...');
        const originalResponse = await fetch(file.streamUrl);
        const originalBlob = await originalResponse.blob();
        zip.file(`${displayName}.wav`, originalBlob);
        
        // Add stems
        const stemTypes = ['vocals', 'drums', 'bass', 'other'];
        for (const stemType of stemTypes) {
            if (file.stems[stemType]) {
                console.log(`📁 Adding ${stemType} stem to zip...`);
                try {
                    // Generate signed URL for stem
                    const stemUrlResponse = await fetch('/api/generate-url', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fileName: file.stems[stemType].fileName
                        })
                    });
                    
                    if (stemUrlResponse.ok) {
                        const stemUrlData = await stemUrlResponse.json();
                        const stemResponse = await fetch(stemUrlData.url);
                        const stemBlob = await stemResponse.blob();
                        zip.file(`${displayName}_${stemType}.wav`, stemBlob);
                    } else {
                        console.error(`❌ Failed to get URL for ${stemType} stem`);
                    }
                } catch (error) {
                    console.error(`❌ Error adding ${stemType} stem:`, error);
                }
            }
        }
        
        // Generate and download zip
        console.log('📦 Generating zip file...');
        showStatus('GENERATING ZIP...', 'success');
        const zipBlob = await zip.generateAsync({type: 'blob'});
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${displayName}_complete.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('ZIP DOWNLOADED!', 'success');
        console.log('✅ Zip download completed');
        
    } catch (error) {
        console.error('❌ Error downloading zip:', error);
        showStatus('ZIP DOWNLOAD FAILED', 'error');
        
        // Fallback to original file download
        setTimeout(() => {
            showStatus('DOWNLOADING ORIGINAL FILE...', 'success');
            downloadMusicFile(file.streamUrl, displayName);
        }, 2000);
    }
}

async function loadJSZip() {
    // Load JSZip library if not already loaded
    if (window.JSZip) return window.JSZip;
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Delete Function
async function deleteFile(fileId) {
    if (!confirm('DELETE THIS TRACK?')) {
        return;
    }
    
    showStatus('DELETING...', 'success');
    
    try {
        const encodedFileId = encodeURIComponent(fileId);
        const response = await fetch(`${API_BASE}/files/${encodedFileId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Track deleted');
            showStatus('DELETED', 'success');
            await loadMusicFiles();
            refreshAdminLibrary();
            refreshPublicLibrary();
        } else {
            showStatus('DELETE FAILED', 'error');
        }
    } catch (error) {
        console.error('❌ Delete error:', error);
        showStatus('DELETE ERROR', 'error');
    }
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

function formatUploadDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}w ago`;
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Unknown date';
    }
}

function showStatus(message, type) {
    const statusElement = document.getElementById('uploadStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-display ${type}`;
        
        setTimeout(() => {
            if (statusElement.textContent === message) {
                statusElement.textContent = '';
                statusElement.className = 'status-display';
            }
        }, 3000);
    }
    console.log(`💬 ${message} (${type})`);
}

// Enhanced Keyboard Controls
function setupKeyboardControls() {
    // Handle Enter key in password field
    const passwordField = document.getElementById('adminPassword');
    if (passwordField) {
        passwordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adminLogin();
            }
        });
    }
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        const adminModal = document.getElementById('adminModal');
        const musicModal = document.getElementById('musicPlayerModal');
        
        if (event.target === adminModal) {
            closeAdminModal();
        }
        if (event.target === musicModal) {
            closeMusicPlayer();
        }
    };
    
    // Music player keyboard shortcuts (only when player is open)
    document.addEventListener('keydown', function(e) {
        const musicModal = document.getElementById('musicPlayerModal');
        
        // Only handle shortcuts when music player is visible
        if (!musicModal || musicModal.style.display !== 'block') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousTrack();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextTrack();
                break;
            case 'Escape':
                e.preventDefault();
                closeMusicPlayer();
                break;
            case 'KeyM':
                e.preventDefault();
                if (musicPlayer) {
                    musicPlayer.muted = !musicPlayer.muted;
                    showStatus(musicPlayer.muted ? 'MUTED' : 'UNMUTED', 'success');
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (musicPlayer) {
                    const newVolume = Math.min(1, musicPlayer.volume + 0.1);
                    musicPlayer.volume = newVolume;
                    showStatus(`VOLUME: ${Math.round(newVolume * 100)}%`, 'success');
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (musicPlayer) {
                    const newVolume = Math.max(0, musicPlayer.volume - 0.1);
                    musicPlayer.volume = newVolume;
                    showStatus(`VOLUME: ${Math.round(newVolume * 100)}%`, 'success');
                }
                break;
        }
    });
}

// Enhanced auto-refresh with change detection
let lastMusicFileCount = 0;

function showMusicUpdateNotification(message) {
    // Create animated notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent);
        color: var(--bg-primary);
        padding: 15px 20px;
        border: 1px solid var(--border);
        font-family: inherit;
        z-index: 3000;
        font-size: 0.9rem;
        letter-spacing: 0.1em;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Slide out and remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Auto-refresh with change detection
setInterval(async () => {
    if (!isAdminLoggedIn) {
        try {
            const response = await fetch(`${API_BASE}/files`);
            const data = await response.json();
            
            if (response.ok && data.files) {
                const newCount = data.files.length;
                
                // Check if new files were added
                if (lastMusicFileCount > 0 && newCount > lastMusicFileCount) {
                    const addedCount = newCount - lastMusicFileCount;
                    showMusicUpdateNotification(`${addedCount} NEW TRACK${addedCount > 1 ? 'S' : ''} ADDED`);
                }
                
                // Update if count changed
                if (newCount !== musicFiles.length) {
                    musicFiles = data.files;
                    refreshPublicLibrary();
                    console.log(`🔄 Library updated: ${newCount} tracks`);
                }
                
                lastMusicFileCount = newCount;
            }
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 5000); // Check every 5 seconds

// Stem Control Functions

function initializeStemControls(file) {
    console.log('🎵 Initializing stem controls for:', file.title || file.name);
    currentStemFile = file;
    
    // Check if track has stems
    if (file.stems && Object.keys(file.stems).length > 0) {
        console.log('✅ Stems available, loading players');
        loadStemPlayers(file.stems);
    } else {
        console.log('⚠️ No stems available, starting stem processing...');
        
        // Always try to process real stems
        processStemsForFile(file);
    }
    
    // Enable stem volume controls
    enableStemControls();
}

async function loadStemPlayers(stems) {
    stemPlayers = {};
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    
    console.log('🎵 Loading stem players with data:', stems);
    
    for (const stemType of stemTypes) {
        if (stems[stemType]) {
            const stemData = stems[stemType];
            console.log(`🔍 Processing ${stemType} stem:`, stemData);
            
            if (stemData.url) {
                // Direct URL available
                stemPlayers[stemType] = new Audio();
                stemPlayers[stemType].src = stemData.url;
                stemPlayers[stemType].preload = 'metadata';
                stemPlayers[stemType].volume = 1.0;
                console.log(`✅ Loaded ${stemType} stem with direct URL`);
            } else if (stemData.fileName) {
                // Need to generate signed URL
                try {
                    console.log(`🔗 Generating signed URL for ${stemType}: ${stemData.fileName}`);
                    const response = await fetch(`${API_BASE}/generate-url`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ fileName: stemData.fileName })
                    });
                    
                    if (response.ok) {
                        const urlData = await response.json();
                        stemPlayers[stemType] = new Audio();
                        stemPlayers[stemType].src = urlData.url;
                        stemPlayers[stemType].preload = 'metadata';
                        stemPlayers[stemType].volume = 1.0;
                        console.log(`✅ Loaded ${stemType} stem with signed URL`);
                    } else {
                        console.error(`❌ Failed to get signed URL for ${stemType}`);
                        continue;
                    }
                } catch (error) {
                    console.error(`❌ Error generating URL for ${stemType}:`, error);
                    continue;
                }
            } else {
                console.log(`⚠️ No URL or fileName for ${stemType} stem`);
                continue;
            }
            
            // Add event listeners for each stem player
            stemPlayers[stemType].addEventListener('loadedmetadata', () => {
                console.log(`✅ ${stemType} stem metadata loaded`);
            });
            
            stemPlayers[stemType].addEventListener('error', (e) => {
                console.error(`❌ Error loading ${stemType} stem:`, e);
            });
            
            stemPlayers[stemType].addEventListener('canplay', () => {
                console.log(`🎵 ${stemType} stem ready to play`);
            });
        }
    }
    
    console.log('🎵 Loaded stem players:', Object.keys(stemPlayers));
    
    // Setup synchronized playback with main player
    setupStemSynchronization();
}

function enableStemControls() {
    const stemControls = document.querySelectorAll('.stem-volume');
    stemControls.forEach(control => {
        control.style.opacity = '1';
        control.style.pointerEvents = 'auto';
    });
    console.log('✅ Stem controls enabled');
}

async function processStemsForFile(file) {
    if (stemProcessingInProgress) {
        console.log('⚠️ Stem processing already in progress');
        return;
    }
    
    // Remove admin requirement for now to test functionality
    console.log('🔄 Attempting stem processing...');
    
    stemProcessingInProgress = true;
    console.log('🔄 Starting stem processing for:', file.title || file.name);
    showStatus('PROCESSING STEMS...', 'success');
    
    // Update all status bubbles to show processing state
    updateAllStemStatusBubbles();
    
    // Start periodic bubble updates during processing
    startBubbleUpdateTimer();
    
    try {
        console.log('📡 Making request to:', `${API_BASE}/process-stems`);
        console.log('📦 Request data:', { 
            fileId: file.id,
            fileName: file.fileName || file.originalName || file.name
        });
        
        const response = await fetch(`${API_BASE}/process-stems`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                fileId: file.id,
                fileName: file.fileName || file.originalName || file.name
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Stem processing failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Stem processing completed:', result);
        
        if (result.stems) {
            // Update file data with new stems
            file.stems = result.stems;
            currentStemFile.stems = result.stems;
            currentTrackStems = result.stems;
            
            // Update the file in the global arrays
            const originalIndex = musicFiles.findIndex(f => f.id === file.id);
            if (originalIndex !== -1) {
                musicFiles[originalIndex].stems = result.stems;
            }
            
            const sortedIndex = sortedMusicFiles.findIndex(f => f.id === file.id);
            if (sortedIndex !== -1) {
                sortedMusicFiles[sortedIndex].stems = result.stems;
            }
            
            // Load stem players
            await loadStemPlayers(result.stems);
            showStatus('STEMS READY - CLICK PLAY!', 'success');
            
            // Update all status bubbles to show completed state
            updateAllStemStatusBubbles();
            
            // Auto-start the silent timer once stems are ready
            const mainPlayer = document.getElementById('musicPlayer');
            if (mainPlayer && Object.keys(stemPlayers).length > 0) {
                console.log('🎵 Auto-starting stem playback');
                mainPlayer.play().catch(e => {
                    console.log('Auto-play blocked:', e);
                    showStatus('STEMS READY - CLICK PLAY!', 'success');
                });
            }
        } else {
            showStatus('STEM PROCESSING COMPLETED BUT NO STEMS RETURNED', 'error');
        }
        
    } catch (error) {
        console.error('❌ Stem processing error:', error);
        showStatus(`STEM PROCESSING FAILED: ${error.message}`, 'error');
    } finally {
        stemProcessingInProgress = false;
        // Update all status bubbles when processing ends
        updateAllStemStatusBubbles();
    }
}

function setupStemSynchronization() {
    const mainPlayer = document.getElementById('musicPlayer');
    if (!mainPlayer) return;
    
    // The main player is now just a timer - it's muted and used only for sync
    mainPlayer.volume = 0;
    mainPlayer.muted = true;
    
    // Sync all stems when main player plays/pauses
    mainPlayer.addEventListener('play', () => {
        console.log('🎵 Starting stem playback');
        isPlaying = true;
        
        Object.keys(stemPlayers).forEach(stemType => {
            if (stemPlayers[stemType]) {
                // Always sync time first
                stemPlayers[stemType].currentTime = mainPlayer.currentTime;
                
                // Only play if volume > 0
                const slider = document.querySelector(`[data-stem="${stemType}"] .volume-slider-vertical`);
                if (slider && slider.value > 0) {
                    stemPlayers[stemType].play().catch(e => 
                        console.log(`${stemType} stem play blocked:`, e)
                    );
                    console.log(`🎵 Started ${stemType} stem`);
                }
            }
        });
        
        updatePlayButton();
    });
    
    mainPlayer.addEventListener('pause', () => {
        console.log('⏸️ Pausing all stems');
        isPlaying = false;
        
        Object.keys(stemPlayers).forEach(stemType => {
            if (stemPlayers[stemType]) {
                stemPlayers[stemType].pause();
            }
        });
        
        updatePlayButton();
    });
    
    // Aggressive synchronization system
    let syncInterval = null;
    
    const startSyncMonitoring = () => {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => {
            if (!mainPlayer.paused && Object.keys(stemPlayers).length > 0) {
                const masterTime = mainPlayer.currentTime;
                
                Object.keys(stemPlayers).forEach(stemType => {
                    const stemPlayer = stemPlayers[stemType];
                    if (stemPlayer) {
                        const slider = document.querySelector(`[data-stem="${stemType}"] .volume-slider-vertical`);
                        const shouldBePlaying = slider && slider.value > 0;
                        
                        if (shouldBePlaying) {
                            // Check if stem is playing when it should be
                            if (stemPlayer.paused) {
                                console.log(`🔄 Restarting dropped ${stemType} stem`);
                                stemPlayer.currentTime = masterTime;
                                stemPlayer.play().catch(e => console.log(`${stemType} restart blocked:`, e));
                            } else {
                                // Check sync drift
                                const timeDiff = Math.abs(stemPlayer.currentTime - masterTime);
                                if (timeDiff > 0.15) { // Tighter sync
                                    console.log(`🔄 Resyncing ${stemType} stem (drift: ${timeDiff.toFixed(2)}s)`);
                                    stemPlayer.currentTime = masterTime;
                                }
                            }
                        } else if (!stemPlayer.paused) {
                            // Should be paused but isn't
                            stemPlayer.pause();
                        }
                    }
                });
            }
        }, 250); // Check every 250ms for tighter sync
    };
    
    const stopSyncMonitoring = () => {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    };
    
    mainPlayer.addEventListener('play', startSyncMonitoring);
    mainPlayer.addEventListener('pause', stopSyncMonitoring);
    mainPlayer.addEventListener('ended', stopSyncMonitoring);
    
    console.log('✅ Stems-only synchronization setup complete');
}

function setStemVolume(stemType, volume) {
    console.log(`🔊 setStemVolume called: ${stemType} = ${volume}%`);
    const volumePercent = volume / 100;
    
    // Handle individual stem volume
    showStatus(`${stemType.toUpperCase()} VOLUME: ${volume}%`, 'success');
    
    if (stemPlayers[stemType]) {
        // Set stem volume directly
        stemPlayers[stemType].volume = volumePercent;
        console.log(`✅ Set ${stemType} volume to ${volumePercent}`);
        
        // Manage playback based on volume
        if (stemPlayers[stemType].paused && volume > 0 && isPlaying) {
            // Sync time and start playing
            const mainPlayer = document.getElementById('musicPlayer');
            if (mainPlayer) {
                stemPlayers[stemType].currentTime = mainPlayer.currentTime;
            }
            stemPlayers[stemType].play().catch(e => console.log('Stem play blocked:', e));
            console.log(`🎵 Started playing ${stemType} stem`);
        } else if (volume === 0) {
            stemPlayers[stemType].pause();
            console.log(`⏸️ Paused ${stemType} stem (volume = 0)`);
        }
    } else {
        console.log(`⚠️ No stem player found for ${stemType} - stems may not be loaded yet`);
    }
}

function downloadStem(stemType) {
    if (!currentStemFile || !currentStemFile.stems || !currentStemFile.stems[stemType]) {
        showStatus(`${stemType.toUpperCase()} STEM NOT AVAILABLE`, 'error');
        return;
    }
    
    const stemData = currentStemFile.stems[stemType];
    const filename = `${currentStemFile.title || 'track'}_${stemType}.wav`;
    
    if (stemData.url) {
        downloadMusicFile(stemData.url, filename);
        showStatus(`DOWNLOADING ${stemType.toUpperCase()} STEM`, 'success');
    } else {
        showStatus(`${stemType.toUpperCase()} DOWNLOAD NOT AVAILABLE`, 'error');
    }
}

function createTestStemPlayer(stemType) {
    console.log(`🧪 Creating placeholder for ${stemType} - will be replaced by real stems`);
    
    // Don't create actual players - just show that we're waiting for real stems
    showStatus(`WAITING FOR ${stemType.toUpperCase()} STEM...`, 'success');
}

function showStemProcessingStatus() {
    console.log('🔄 Showing stem processing status');
    showStatus('DEMUCS IS PROCESSING STEMS... THIS TAKES 1-2 MINUTES', 'success');
    
    setupStemSynchronization();
}

// Test stem controls function removed

// Stem Status Bubble Functions
function createStemStatusBubble(file) {
    const bubble = document.createElement('span');
    bubble.className = 'stem-status-bubble';
    bubble.setAttribute('data-file-id', file.id);
    
    // Set initial status
    updateStemStatusBubble(bubble, file);
    
    // Add tooltip
    bubble.title = getStemStatusTooltip(file);
    
    return bubble;
}

function updateStemStatusBubble(bubble, file) {
    if (!bubble) return;
    
    // Remove existing status classes
    bubble.classList.remove('stem-status-red', 'stem-status-yellow', 'stem-status-green');
    
    // Determine status and add appropriate class
    if (file.stems && Object.keys(file.stems).length > 0) {
        // Green: Stems are ready
        bubble.classList.add('stem-status-green');
        bubble.title = 'Stems ready! Use the volume sliders to mix individual instruments.';
    } else if (file.id === currentStemFile?.id && stemProcessingInProgress) {
        // Yellow: Currently processing
        bubble.classList.add('stem-status-yellow');
        bubble.title = 'Processing stems with Demucs... This takes 1-2 minutes.';
    } else {
        // Red: No stems available
        bubble.classList.add('stem-status-red');
        bubble.title = 'No stems yet. Play this track to start stem processing.';
    }
}

function getStemStatusTooltip(file) {
    if (file.stems && Object.keys(file.stems).length > 0) {
        const stemTypes = Object.keys(file.stems);
        return `Stems ready: ${stemTypes.join(', ')}`;
    } else if (file.id === currentStemFile?.id && stemProcessingInProgress) {
        return 'Processing stems with Demucs... Please wait.';
    } else {
        return 'Click to play and start stem processing';
    }
}

function updateAllStemStatusBubbles() {
    console.log('🔄 Updating all stem status bubbles');
    console.log('📊 Current state:', {
        currentStemFile: currentStemFile?.id || 'none',
        stemProcessingInProgress: stemProcessingInProgress,
        totalFiles: musicFiles.length
    });
    
    // Update bubbles in library (music cards)
    const libraryBubbles = document.querySelectorAll('.music-card .stem-status-bubble');
    console.log(`🔍 Found ${libraryBubbles.length} library bubbles`);
    libraryBubbles.forEach(bubble => {
        const fileId = bubble.getAttribute('data-file-id');
        const file = musicFiles.find(f => f.id === fileId);
        if (file) {
            updateStemStatusBubble(bubble, file);
            console.log(`✅ Updated bubble for ${file.title || file.name}`);
        }
    });
    
    // Update bubbles in admin panel
    const adminBubbles = document.querySelectorAll('.admin-file-item .stem-status-bubble');
    console.log(`🔍 Found ${adminBubbles.length} admin bubbles`);
    adminBubbles.forEach(bubble => {
        const fileId = bubble.getAttribute('data-file-id');
        const file = musicFiles.find(f => f.id === fileId);
        if (file) {
            updateStemStatusBubble(bubble, file);
        }
    });
    
    // Update bubble in music player
    const playerBubble = document.querySelector('.music-player h2 .stem-status-bubble');
    if (playerBubble && currentStemFile) {
        updateStemStatusBubble(playerBubble, currentStemFile);
        console.log(`✅ Updated player bubble for ${currentStemFile.title || currentStemFile.name}`);
    }
}

// Periodic bubble update system
let bubbleUpdateInterval = null;

function startBubbleUpdateTimer() {
    // Clear any existing timer
    if (bubbleUpdateInterval) {
        clearInterval(bubbleUpdateInterval);
    }
    
    // Update bubbles every 2 seconds while processing
    bubbleUpdateInterval = setInterval(() => {
        if (stemProcessingInProgress) {
            console.log('🔄 Periodic bubble update during processing');
            updateAllStemStatusBubbles();
        } else {
            // Stop the timer when not processing
            clearInterval(bubbleUpdateInterval);
            bubbleUpdateInterval = null;
        }
    }, 2000);
}

function stopBubbleUpdateTimer() {
    if (bubbleUpdateInterval) {
        clearInterval(bubbleUpdateInterval);
        bubbleUpdateInterval = null;
    }
}

// Stem controls are now fully integrated and synchronized with main player
// Volume sliders control individual stem volumes  
// Download buttons allow downloading individual stems
// All stems play in sync with the main track automatically

console.log('✅ MADE INFINITE ready');
console.log('⌨️  Controls: SPACE=play/pause, ←→=tracks, M=mute, ESC=close');
console.log('🎛️  Stem controls: Individual play/volume/download for each stem'); 