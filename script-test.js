console.log('🚀 MADE INFINITE initializing...');

// Configuration
const API_BASE = window.location.origin + '/api';
let isAdminLoggedIn = false;
let musicFiles = [];
let selectedCoverFile = null;

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
    
    // Volume controls
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
        console.log('✅ Mute button listener added');
    }
    
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
            showStatus('ACCESS GRANTED', 'success');
            closeAdminModal();
            showAdminPanel();
        } else {
            console.error('❌ Access denied');
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
        panel.style.display = 'block';
        refreshAdminLibrary();
    }
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
            
            // Check file size (50MB limit)
            if (file.size > 50 * 1024 * 1024) {
                showStatus(`${file.name} is too large (max 50MB)`, 'error');
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
        if (file.size > 50 * 1024 * 1024) {
            showStatus(`${file.name} is too large (max 50MB) - skipping`, 'error');
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
    
    showStatus('UPLOADING...', 'success');
    
    for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('musicFile', files[i]);
        
        // Add cover image if selected
        if (selectedCoverFile) {
            formData.append('coverImage', selectedCoverFile);
        }
        
        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log(`✅ Upload ${i + 1}/${files.length} complete:`, files[i].name);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error(`❌ Upload ${i + 1} failed:`, error);
            showStatus(`UPLOAD FAILED: ${error.message}`, 'error');
            isUploading = false;
            return;
        }
    }
    
    showStatus('UPLOAD COMPLETE', 'success');
    
    // Reset inputs
    fileInput.value = '';
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
    
    let html = '';
    musicFiles.forEach(file => {
        const escapedId = file.id.replace(/'/g, "\\'");
        html += `
            <div class="admin-file-item">
                <div class="file-cover">
                    ${file.coverUrl ? 
                        `<img src="${file.coverUrl}" alt="Cover">` : 
                        '<div style="color: var(--text-tertiary);">♫</div>'
                    }
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${formatFileSize(file.size)}</div>
                </div>
                <button onclick="deleteFile('${escapedId}')" class="delete-btn">×</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function refreshPublicLibrary() {
    const container = document.getElementById('fileDisplay');
    if (!container) return;
    
    if (musicFiles.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 80px; color: var(--text-tertiary); font-size: 1.2rem;">NO TRACKS AVAILABLE</div>';
        return;
    }
    
    let html = '';
    musicFiles.forEach((file, index) => {
        html += `
            <div class="music-card" onclick="playMusic(${index})">
                <div class="card-cover">
                    ${file.coverUrl ? 
                        `<img src="${file.coverUrl}" alt="${file.name}">` : 
                        '<div class="default-cover">♫</div>'
                    }
                </div>
                <div class="card-info">
                    <div class="card-title">${file.name}</div>
                    <div class="card-meta">${formatFileSize(file.size)}</div>
                    <div class="card-actions">
                        <button onclick="event.stopPropagation(); playMusic(${index})" class="play-btn">PLAY</button>
                        <button onclick="event.stopPropagation(); downloadMusic('${file.streamUrl}', '${file.name}')" class="download-btn">SAVE</button>
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

function playMusic(index) {
    if (musicFiles[index]) {
        currentTrackIndex = index;
        openMusicPlayer(index);
    }
}

function openMusicPlayer(trackIndex) {
    const modal = document.getElementById('musicPlayerModal');
    const player = document.getElementById('musicPlayer');
    const titleElement = document.getElementById('trackTitle');
    const trackNameElement = document.getElementById('currentTrackName');
    const albumArt = document.getElementById('albumArt');
    
    if (!modal || !player || !titleElement || !trackNameElement || !albumArt) {
        console.error('❌ Player elements missing');
        return;
    }
    
    const file = musicFiles[trackIndex];
    console.log(`🎵 Opening player: ${file.name}`);
    
    // Update UI
    player.src = file.streamUrl;
    titleElement.textContent = file.name.toUpperCase();
    trackNameElement.textContent = file.name;
    
    // Update album art
    if (file.coverUrl) {
        albumArt.innerHTML = `<img src="${file.coverUrl}" alt="${file.name}">`;
    } else {
        albumArt.innerHTML = '<div class="default-art">♫</div>';
    }
    
    // Show modal
    modal.style.display = 'block';
    musicPlayer = player;
    
    // Initialize custom controls
    initializeCustomControls();
    
    // Setup event listeners
    setupPlayerEventListeners();
    
    // Set initial time display and controls
    updateTimeDisplay(0, 0);
    
    // Auto-play
    player.play().catch(e => {
        console.log('Auto-play blocked:', e);
        showStatus('CLICK PLAY TO START', 'success');
    });
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
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn && !muteBtn.hasAttribute('data-listener')) {
        muteBtn.addEventListener('click', toggleMute);
        muteBtn.setAttribute('data-listener', 'true');
        console.log('🔄 Mute button listener set');
    }
}

function toggleMute() {
    if (!musicPlayer) return;
    
    musicPlayer.muted = !musicPlayer.muted;
    updateMuteButton();
    showStatus(musicPlayer.muted ? 'MUTED' : 'UNMUTED', 'success');
}

function updateMuteButton() {
    const muteBtn = document.getElementById('muteBtn');
    if (!muteBtn || !musicPlayer) return;
    
    if (musicPlayer.muted || musicPlayer.volume === 0) {
        muteBtn.textContent = '🔇';
    } else if (musicPlayer.volume < 0.5) {
        muteBtn.textContent = '🔉';
    } else {
        muteBtn.textContent = '🔊';
    }
}

function updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
        btn.textContent = isPlaying ? '⏸' : '▶';
    }
}

function closeMusicPlayer() {
    const modal = document.getElementById('musicPlayerModal');
    if (musicPlayer) {
        musicPlayer.pause();
        musicPlayer.src = '';
        musicPlayer = null;
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
}

function togglePlayPause() {
    if (!musicPlayer) {
        console.log('❌ No music player available');
        return;
    }
    
    if (musicPlayer.paused) {
        console.log('▶️ Playing music');
        musicPlayer.play().then(() => {
            isPlaying = true;
            updatePlayButton();
            showStatus('PLAYING', 'success');
        }).catch(e => {
            console.error('❌ Play error:', e);
            showStatus('PLAYBACK ERROR', 'error');
            isPlaying = false;
            updatePlayButton();
        });
    } else {
        console.log('⏸️ Pausing music');
        musicPlayer.pause();
        isPlaying = false;
        updatePlayButton();
        showStatus('PAUSED', 'success');
    }
}

function previousTrack() {
    if (musicFiles.length === 0) return;
    
    // Circular navigation - wrap around to last track
    currentTrackIndex = (currentTrackIndex - 1 + musicFiles.length) % musicFiles.length;
    playMusic(currentTrackIndex);
}

function nextTrack() {
    if (musicFiles.length === 0) return;
    
    // Circular navigation - wrap around to first track
    currentTrackIndex = (currentTrackIndex + 1) % musicFiles.length;
    playMusic(currentTrackIndex);
}

function downloadMusic(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log('💾 Download initiated:', filename);
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

console.log('✅ MADE INFINITE ready');
console.log('⌨️  Controls: SPACE=play/pause, ←→=tracks, M=mute, ESC=close'); 