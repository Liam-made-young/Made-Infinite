// Color mode toggle functionality
let colorModeToggle = document.querySelector(".color-mode-toggle");
let title = document.querySelector(".title");
let body = document.querySelector(".body-class");

colorModeToggle.addEventListener("click", function() {
    body.classList.toggle("light-mode");
    title.classList.toggle("light-mode");
    
    if (body.classList.contains("light-mode")) {
        colorModeToggle.textContent = "Dark Mode";
    } else {
        colorModeToggle.textContent = "Light Mode";
    }
});

// Admin system
const ADMIN_PASSWORD = "admin123"; // Change this to a secure password
let isAdminLoggedIn = false;
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedMusicFiles')) || [];

// Music player system
let currentTrackIndex = 0;
let isPlaying = false;
let musicPlayer = null;

// Admin login functions
function toggleAdminLogin() {
    if (isAdminLoggedIn) {
        showAdminPanel();
    } else {
        document.getElementById('adminModal').style.display = 'block';
    }
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        document.getElementById('adminModal').style.display = 'none';
        showAdminPanel();
        document.querySelector('.admin-toggle').textContent = 'Admin Panel';
        showUploadStatus('Login successful!', 'success');
    } else {
        showUploadStatus('Incorrect password!', 'error');
    }
    
    document.getElementById('adminPassword').value = '';
}

function showAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
    refreshAdminFileList();
    updateStorageUsage();
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    document.getElementById('adminPanel').style.display = 'none';
    document.querySelector('.admin-toggle').textContent = 'Admin';
    showUploadStatus('Logged out successfully!', 'success');
}

// File upload functions (fixed for music files)
function uploadFiles() {
    console.log('uploadFiles() called');
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    console.log('Files selected:', files ? files.length : 'No files');
    
    if (files.length === 0) {
        console.log('No files selected, showing error');
        showUploadStatus('Please select music files to upload!', 'error');
        return;
    }
    
    let uploadCount = 0;
    let totalFiles = files.length;
    
    showUploadStatus('Uploading files...', 'success');
    
    Array.from(files).forEach((file, index) => {
        console.log(`Processing file ${index + 1}/${totalFiles}: ${file.name}, type: ${file.type}`);
        
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            console.log(`File rejected - not audio: ${file.name}`);
            showUploadStatus(`${file.name} is not a valid audio file!`, 'error');
            uploadCount++;
            if (uploadCount === totalFiles) {
                finishUpload();
            }
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            console.log(`File read successfully: ${file.name}`);
            
            // Check file size limit (3MB for localStorage compatibility)
            const maxSize = 3 * 1024 * 1024; // 3MB
            if (file.size > maxSize) {
                console.log(`File too large: ${file.name} (${file.size} bytes)`);
                showUploadStatus(`${file.name} is too large (max 3MB for web storage)`, 'error');
                uploadCount++;
                if (uploadCount === totalFiles) {
                    finishUpload();
                }
                return;
            }
            
            const fileData = {
                id: Date.now() + Math.random() + index,
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result,
                uploadDate: new Date().toISOString()
            };
            
            try {
                uploadedFiles.push(fileData);
                // Test if we can save to localStorage
                const testData = JSON.stringify(uploadedFiles);
                localStorage.setItem('uploadedMusicFiles', testData);
                
                uploadCount++;
                console.log(`Upload progress: ${uploadCount}/${totalFiles}`);
                
                if (uploadCount === totalFiles) {
                    console.log('All files processed, calling finishUpload()');
                    finishUpload();
                }
            } catch (error) {
                console.error('Storage error:', error);
                if (error.name === 'QuotaExceededError') {
                    // Remove the file we just tried to add
                    uploadedFiles.pop();
                    showUploadStatus(`Storage full! ${file.name} couldn't be saved. Try smaller files or clear browser data.`, 'error');
                } else {
                    showUploadStatus(`Error saving ${file.name}: ${error.message}`, 'error');
                }
                
                uploadCount++;
                if (uploadCount === totalFiles) {
                    finishUpload();
                }
            }
        };
        
        reader.onerror = function() {
            showUploadStatus(`Error reading ${file.name}`, 'error');
            uploadCount++;
            if (uploadCount === totalFiles) {
                finishUpload();
            }
        };
        
        reader.readAsDataURL(file);
    });
    
    function finishUpload() {
        console.log(`finishUpload() called with ${uploadedFiles.length} files`);
        
        try {
            localStorage.setItem('uploadedMusicFiles', JSON.stringify(uploadedFiles));
            console.log('Files saved to localStorage');
            
            if (uploadedFiles.length > 0) {
                showUploadStatus(`Successfully uploaded ${uploadedFiles.length} music files!`, 'success');
            } else {
                showUploadStatus('No files were uploaded successfully', 'error');
            }
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            showUploadStatus('Error saving files to storage', 'error');
        }
        
        refreshAdminFileList();
        refreshPublicFileDisplay();
        updateStorageUsage();
        fileInput.value = '';
        console.log('Upload process completed');
    }
}

function deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this music file?')) {
        uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
        localStorage.setItem('uploadedMusicFiles', JSON.stringify(uploadedFiles));
        
        showUploadStatus('Music file deleted successfully!', 'success');
        refreshAdminFileList();
        refreshPublicFileDisplay();
    }
}

function refreshAdminFileList() {
    // Always reload from localStorage to get the latest files
    uploadedFiles = JSON.parse(localStorage.getItem('uploadedMusicFiles')) || [];
    
    const adminFileList = document.getElementById('adminFileList');
    adminFileList.innerHTML = '';
    
    if (uploadedFiles.length === 0) {
        adminFileList.innerHTML = '<p>No music files uploaded yet.</p>';
        return;
    }
    
    uploadedFiles.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.innerHTML = '🎵';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
            <div class="file-date">Uploaded: ${new Date(file.uploadDate).toLocaleDateString()}</div>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteFile(file.id);
        
        fileElement.appendChild(preview);
        fileElement.appendChild(fileInfo);
        fileElement.appendChild(deleteBtn);
        
        adminFileList.appendChild(fileElement);
    });
}

function refreshPublicFileDisplay() {
    console.log('refreshPublicFileDisplay() called');
    // Always reload from localStorage to get the latest files
    uploadedFiles = JSON.parse(localStorage.getItem('uploadedMusicFiles')) || [];
    console.log(`Loaded ${uploadedFiles.length} files from localStorage`);
    
    const fileDisplay = document.getElementById('fileDisplay');
    if (!fileDisplay) {
        console.error('fileDisplay element not found!');
        return;
    }
    fileDisplay.innerHTML = '';
    
    if (uploadedFiles.length === 0) {
        console.log('No files to display');
        fileDisplay.innerHTML = '<p>No music files available.</p>';
        return;
    }
    
    uploadedFiles.forEach((file, index) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.innerHTML = '🎵';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
        `;
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn';
        playBtn.textContent = '▶️ Play';
        playBtn.onclick = () => openMusicPlayer(index);
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.onclick = () => downloadFile(file);
        
        fileActions.appendChild(playBtn);
        fileActions.appendChild(downloadBtn);
        
        fileElement.appendChild(preview);
        fileElement.appendChild(fileInfo);
        fileElement.appendChild(fileActions);
        
        // Make the entire file item clickable to play music
        fileElement.onclick = (e) => {
            if (!e.target.closest('button')) {
                openMusicPlayer(index);
            }
        };
        
        fileDisplay.appendChild(fileElement);
    });
}

// Music player functions
function openMusicPlayer(trackIndex) {
    if (uploadedFiles.length === 0) return;
    
    currentTrackIndex = trackIndex;
    musicPlayer = document.getElementById('musicPlayer');
    
    loadTrack(currentTrackIndex);
    document.getElementById('musicPlayerModal').style.display = 'block';
}

function closeMusicPlayer() {
    document.getElementById('musicPlayerModal').style.display = 'none';
    if (musicPlayer) {
        musicPlayer.pause();
        isPlaying = false;
        updatePlayPauseButton();
    }
}

function loadTrack(index) {
    if (index < 0 || index >= uploadedFiles.length) return;
    
    const track = uploadedFiles[index];
    musicPlayer.src = track.data;
    
    document.getElementById('currentTrackName').textContent = track.name;
    document.getElementById('nowPlayingTitle').textContent = `Now Playing (${index + 1}/${uploadedFiles.length})`;
    
    // Auto-play when track loads
    musicPlayer.onloadeddata = () => {
        musicPlayer.play().then(() => {
            isPlaying = true;
            updatePlayPauseButton();
        }).catch(e => {
            console.log('Auto-play prevented:', e);
            isPlaying = false;
            updatePlayPauseButton();
        });
    };
    
    // Handle track end
    musicPlayer.onended = () => {
        nextTrack();
    };
}

function togglePlayPause() {
    if (!musicPlayer) return;
    
    if (isPlaying) {
        musicPlayer.pause();
        isPlaying = false;
    } else {
        musicPlayer.play().then(() => {
            isPlaying = true;
        }).catch(e => {
            console.log('Play prevented:', e);
            isPlaying = false;
        });
    }
    updatePlayPauseButton();
}

function updatePlayPauseButton() {
    const btn = document.getElementById('playPauseBtn');
    btn.textContent = isPlaying ? '⏸️' : '▶️';
}

function previousTrack() {
    if (uploadedFiles.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex - 1 + uploadedFiles.length) % uploadedFiles.length;
    loadTrack(currentTrackIndex);
}

function nextTrack() {
    if (uploadedFiles.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % uploadedFiles.length;
    loadTrack(currentTrackIndex);
}

function downloadFile(file) {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showUploadStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = type === 'success' ? 'upload-success' : 'upload-error';
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

function updateStorageUsage() {
    try {
        const storageUsed = JSON.stringify(localStorage).length;
        const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(2);
        const storageLimit = 5; // Approximate localStorage limit in MB
        const usagePercent = ((storageUsed / (storageLimit * 1024 * 1024)) * 100).toFixed(1);
        
        const storageElement = document.getElementById('storageUsage');
        if (storageElement) {
            storageElement.textContent = `${storageUsedMB}MB / ~${storageLimit}MB (${usagePercent}%)`;
            
            // Color code based on usage
            if (usagePercent > 80) {
                storageElement.style.color = '#ff4444';
            } else if (usagePercent > 60) {
                storageElement.style.color = '#ffaa00';
            } else {
                storageElement.style.color = '#4CAF50';
            }
        }
    } catch (error) {
        console.error('Error calculating storage usage:', error);
    }
}

function clearAllStorage() {
    if (confirm('This will delete ALL uploaded music files. Are you sure?')) {
        localStorage.removeItem('uploadedMusicFiles');
        uploadedFiles = [];
        refreshAdminFileList();
        refreshPublicFileDisplay();
        updateStorageUsage();
        showUploadStatus('All music files cleared!', 'success');
    }
}

function showMusicUpdateNotification(message) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        font-family: 'Courier New', Courier, monospace;
        z-index: 2000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds with slide out animation
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 300);
    }, 4000);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    refreshPublicFileDisplay();
    
    // Auto-refresh the public file display every 5 seconds to show new uploads
    setInterval(function() {
        if (!isAdminLoggedIn) { // Only refresh for regular users
            const currentCount = uploadedFiles.length;
            const storedFiles = JSON.parse(localStorage.getItem('uploadedMusicFiles')) || [];
            if (storedFiles.length !== currentCount) {
                refreshPublicFileDisplay();
                
                // Show a subtle notification that new music was added
                if (storedFiles.length > currentCount) {
                    const newCount = storedFiles.length - currentCount;
                    showMusicUpdateNotification(`${newCount} new music file${newCount > 1 ? 's' : ''} added!`);
                }
            }
        }
    }, 5000);
    
    // Handle Enter key in password field
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            adminLogin();
        }
    });
    
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
    
    // Handle keyboard shortcuts for music player
    document.addEventListener('keydown', function(e) {
        if (document.getElementById('musicPlayerModal').style.display === 'block') {
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
                    closeMusicPlayer();
                    break;
            }
        }
    });
});