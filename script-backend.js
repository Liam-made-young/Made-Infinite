// Backend API URL
const API_BASE = window.location.origin + '/api';

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
let isAdminLoggedIn = false;
let musicFiles = [];
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

async function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            isAdminLoggedIn = true;
            document.getElementById('adminModal').style.display = 'none';
            showAdminPanel();
            document.querySelector('.admin-toggle').textContent = 'Admin Panel';
            showUploadStatus('Login successful!', 'success');
        } else {
            showUploadStatus(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showUploadStatus('Network error: ' + error.message, 'error');
    }
    
    document.getElementById('adminPassword').value = '';
}

function showAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
    refreshAdminFileList();
}

async function logoutAdmin() {
    try {
        await fetch(`${API_BASE}/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        isAdminLoggedIn = false;
        document.getElementById('adminPanel').style.display = 'none';
        document.querySelector('.admin-toggle').textContent = 'Admin';
        showUploadStatus('Logged out successfully!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// File upload functions
async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showUploadStatus('Please select music files to upload!', 'error');
        return;
    }
    
    showUploadStatus('Uploading files...', 'success');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('musicFile', file);
        
        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showUploadStatus(`✅ ${file.name} uploaded successfully!`, 'success');
            } else {
                showUploadStatus(`❌ ${file.name}: ${data.error}`, 'error');
            }
        } catch (error) {
            showUploadStatus(`❌ ${file.name}: Network error`, 'error');
        }
    }
    
    // Refresh file lists
    await loadMusicFiles();
    refreshAdminFileList();
    fileInput.value = '';
}

async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this music file?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/files/${fileId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showUploadStatus('File deleted successfully!', 'success');
            await loadMusicFiles();
            refreshAdminFileList();
        } else {
            showUploadStatus(data.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showUploadStatus('Network error: ' + error.message, 'error');
    }
}

// Load music files from backend
async function loadMusicFiles() {
    try {
        const response = await fetch(`${API_BASE}/files`);
        const data = await response.json();
        
        if (response.ok) {
            musicFiles = data.files;
            refreshPublicFileDisplay();
        } else {
            console.error('Failed to load files:', data.error);
        }
    } catch (error) {
        console.error('Network error loading files:', error);
    }
}

function refreshAdminFileList() {
    const adminFileList = document.getElementById('adminFileList');
    
    if (musicFiles.length === 0) {
        adminFileList.innerHTML = '<p>No music files uploaded yet.</p>';
        return;
    }
    
    let html = '<h4>Uploaded Music Files:</h4>';
    musicFiles.forEach((file, index) => {
        html += `
            <div class="file-item admin-file">
                <span class="file-name">🎵 ${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button onclick="deleteFile('${file.id}')" class="delete-btn">Delete</button>
            </div>
        `;
    });
    
    adminFileList.innerHTML = html;
}

function refreshPublicFileDisplay() {
    const fileDisplay = document.getElementById('fileDisplay');
    
    if (musicFiles.length === 0) {
        fileDisplay.innerHTML = '<p>No music files available. Check back later!</p>';
        return;
    }
    
    let html = '';
    musicFiles.forEach((file, index) => {
        html += `
            <div class="file-item">
                <div class="file-info">
                    <span class="file-name">🎵 ${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
            </div>
        `;
    });
    
    fileDisplay.innerHTML = html;
} 