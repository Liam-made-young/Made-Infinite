import React, { useState, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Input,
  LinearProgress,
  Alert,
  Chip,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  CloudUpload,
  Refresh,
  MusicNote,
  Settings,
  Delete,
  SettingsBackupRestore,
  Info,
  Storage,
  VideoLibrary,
  LiveTv,
  YouTube,
  Add,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../contexts/AppContext'
import { apiClient } from '../services/api'
import { UploadData, VideoFile, LiveStream } from '../types'
import GoogleCloudSetup from './GoogleCloudSetup'
import { useQuery } from 'react-query'

interface AdminPanelProps {
  onRefreshLibrary: () => void
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onRefreshLibrary }) => {
  const { state, dispatch } = useAppContext()
  
  // Tab state
  const [currentTab, setCurrentTab] = useState(0)
  
  // Music upload state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  
  // Video upload state
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<FileList | null>(null)
  const [videoThumbnailFile, setVideoThumbnailFile] = useState<File | null>(null)
  const [videoTitle, setVideoTitle] = useState('')
  
  // Stream management state
  const [youtubeUrl, setYoutubeUrl] = useState('')
  
  // General state
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [autoProcessStems, setAutoProcessStems] = useState(true)
  const [gcsSetupOpen, setGcsSetupOpen] = useState(false)

  // Load videos and streams
  const { data: videosData } = useQuery('adminVideos', async () => {
    const response = await apiClient.get('/videos')
    return response.data
  })

  const { data: streamsData } = useQuery('adminStreams', async () => {
    const response = await apiClient.get('/streams/admin')
    return response.data
  })

  const videos = videosData?.videos || []
  const streams = streamsData?.streams || []

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    
    // Check file sizes to prevent browser crashes
    if (files) {
      const maxSize = 500 * 1024 * 1024 // 500MB per file
      const totalMaxSize = 2 * 1024 * 1024 * 1024 // 2GB total
      let totalSize = 0
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (file.size > maxSize) {
          setUploadError(`File "${file.name}" is too large. Maximum size per file is 500MB.`)
          event.target.value = '' // Clear the input
          return
        }
        
        totalSize += file.size
      }
      
      if (totalSize > totalMaxSize) {
        setUploadError(`Total files size is too large. Maximum total size is 2GB.`)
        event.target.value = '' // Clear the input
        return
      }
      
      if (files.length > 20) {
        setUploadError(`Too many files selected. Maximum is 20 files at once.`)
        event.target.value = '' // Clear the input
        return
      }
    }
    
    setSelectedFiles(files)
    setUploadError(null)
    setUploadSuccess(null)
  }

  const handleCoverSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setCoverFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadError('Please select at least one music file')
      return
    }

    try {
      dispatch({ type: 'SET_UPLOADING', payload: true })
      setUploadError(null)
      setUploadSuccess(null)

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        // Update progress
        dispatch({
          type: 'SET_UPLOAD_PROGRESS',
          payload: {
            percent: 0,
            fileName: file.name,
            fileIndex: i,
            totalFiles: selectedFiles.length,
          },
        })

        const formData = new FormData()
        formData.append('musicFile', file)
        
        if (coverFile && i === 0) {
          formData.append('coverFile', coverFile)
        }
        
        if (customTitle && selectedFiles.length === 1) {
          formData.append('title', customTitle)
        }

        formData.append('autoProcessStems', autoProcessStems.toString())

        await apiClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            )
            dispatch({
              type: 'SET_UPLOAD_PROGRESS',
              payload: {
                percent,
                fileName: file.name,
                fileIndex: i,
                totalFiles: selectedFiles.length,
              },
            })
          },
        })
      }

      setUploadSuccess(`Successfully uploaded ${selectedFiles.length} file(s)`)
      setSelectedFiles(null)
      setCoverFile(null)
      setCustomTitle('')
      
      // Refresh library
      onRefreshLibrary()
      
      // Reset file inputs
      const fileInput = document.getElementById('music-file-input') as HTMLInputElement
      const coverInput = document.getElementById('cover-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      if (coverInput) coverInput.value = ''

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.response?.data?.message || 'Upload failed')
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false })
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: null })
    }
  }

  // Video upload functions
  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    setSelectedVideoFiles(files)
    setUploadError(null)
    setUploadSuccess(null)
  }

  const handleVideoThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setVideoThumbnailFile(file)
  }

  const handleVideoUpload = async () => {
    if (!selectedVideoFiles || selectedVideoFiles.length === 0) {
      setUploadError('Please select at least one video file')
      return
    }

    try {
      dispatch({ type: 'SET_UPLOADING', payload: true })
      setUploadError(null)
      setUploadSuccess(null)

      for (let i = 0; i < selectedVideoFiles.length; i++) {
        const file = selectedVideoFiles[i]
        
        dispatch({
          type: 'SET_UPLOAD_PROGRESS',
          payload: {
            percent: 0,
            fileName: file.name,
            fileIndex: i,
            totalFiles: selectedVideoFiles.length,
          },
        })

        const formData = new FormData()
        formData.append('video', file)
        
        if (videoThumbnailFile && i === 0) {
          formData.append('thumbnail', videoThumbnailFile)
        }
        
        if (videoTitle && selectedVideoFiles.length === 1) {
          formData.append('title', videoTitle)
        }

        await apiClient.post('/videos', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            )
            dispatch({
              type: 'SET_UPLOAD_PROGRESS',
              payload: {
                percent,
                fileName: file.name,
                fileIndex: i,
                totalFiles: selectedVideoFiles.length,
              },
            })
          },
        })
      }

      setUploadSuccess(`Successfully uploaded ${selectedVideoFiles.length} video(s)`)
      setSelectedVideoFiles(null)
      setVideoThumbnailFile(null)
      setVideoTitle('')
      
      // Reset file inputs
      const videoInput = document.getElementById('video-file-input') as HTMLInputElement
      const thumbInput = document.getElementById('video-thumbnail-input') as HTMLInputElement
      if (videoInput) videoInput.value = ''
      if (thumbInput) thumbInput.value = ''

    } catch (error: any) {
      console.error('Video upload error:', error)
      setUploadError(error.response?.data?.message || 'Video upload failed')
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false })
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: null })
    }
  }

  // Stream management functions
  const handleAddStream = async () => {
    if (!youtubeUrl.trim()) {
      setUploadError('Please enter a YouTube URL')
      return
    }

    try {
      setUploadError(null)
      setUploadSuccess(null)

      await apiClient.post('/streams', {
        youtubeUrl: youtubeUrl.trim()
      })

      setUploadSuccess('Stream added successfully')
      setYoutubeUrl('')
      
    } catch (error: any) {
      console.error('Add stream error:', error)
      setUploadError(error.response?.data?.message || 'Failed to add stream')
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return
    }

    try {
      await apiClient.delete(`/videos/${videoId}`)
      setUploadSuccess('Video deleted successfully')
    } catch (error: any) {
      console.error('Delete video error:', error)
      setUploadError(error.response?.data?.message || 'Failed to delete video')
    }
  }

  const handleDeleteStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to delete this stream?')) {
      return
    }

    try {
      await apiClient.delete(`/streams/${streamId}`)
      setUploadSuccess('Stream deleted successfully')
    } catch (error: any) {
      console.error('Delete stream error:', error)
      setUploadError(error.response?.data?.message || 'Failed to delete stream')
    }
  }

  const handleProcessStems = async (trackId: string) => {
    try {
      dispatch({ type: 'SET_STEM_PROCESSING', payload: true })
      await apiClient.post(`/process-stems/${trackId}`)
      setUploadSuccess('Stem processing started')
      onRefreshLibrary()
    } catch (error: any) {
      console.error('Stem processing error:', error)
      setUploadError(error.response?.data?.message || 'Stem processing failed')
    } finally {
      dispatch({ type: 'SET_STEM_PROCESSING', payload: false })
    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
      return
    }

    try {
      await apiClient.delete(`/tracks/${trackId}`)
      setUploadSuccess('Track deleted successfully')
      onRefreshLibrary()
    } catch (error: any) {
      console.error('Delete error:', error)
      setUploadError(error.response?.data?.message || 'Delete failed')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const MusicUploadSection = () => (
    <Card
      sx={{
        background: state.lightMode ? '#f8f8f8' : '#1a1a1a',
        border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
        borderRadius: '12px',
        mb: 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <MusicNote sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '0.1em',
              fontWeight: 'bold',
            }}
          >
            MUSIC UPLOAD
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <input
            id="music-file-input"
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="music-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                borderColor: state.lightMode ? '#333' : '#666',
                '&:hover': {
                  borderColor: state.lightMode ? '#000' : '#fff',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              {selectedFiles ? `${selectedFiles.length} files selected` : 'Select Music Files'}
            </Button>
          </label>
        </Box>

        <Box sx={{ mb: 3 }}>
          <input
            id="cover-file-input"
            type="file"
            accept="image/*"
            onChange={handleCoverSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="cover-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                borderColor: state.lightMode ? '#333' : '#666',
                '&:hover': {
                  borderColor: state.lightMode ? '#000' : '#fff',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              {coverFile ? coverFile.name : 'Select Cover Image (Optional)'}
            </Button>
          </label>
        </Box>

        {selectedFiles && selectedFiles.length === 1 && (
          <TextField
            fullWidth
            label="Custom Title (Optional)"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            sx={{ mb: 3 }}
          />
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFiles || state.isUploading}
          variant="contained"
          sx={{
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            backgroundColor: state.lightMode ? '#000' : '#fff',
            color: state.lightMode ? '#fff' : '#000',
            '&:hover': {
              backgroundColor: state.lightMode ? '#333' : '#ccc',
            },
          }}
        >
          {state.isUploading ? 'Uploading...' : 'Upload Music'}
        </Button>
      </CardContent>
    </Card>
  )

  const VideoUploadSection = () => (
    <Card
      sx={{
        background: state.lightMode ? '#f8f8f8' : '#1a1a1a',
        border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
        borderRadius: '12px',
        mb: 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <VideoLibrary sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '0.1em',
              fontWeight: 'bold',
            }}
          >
            VIDEO UPLOAD
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <input
            id="video-file-input"
            type="file"
            multiple
            accept="video/*"
            onChange={handleVideoSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="video-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                borderColor: state.lightMode ? '#333' : '#666',
                '&:hover': {
                  borderColor: state.lightMode ? '#000' : '#fff',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              {selectedVideoFiles ? `${selectedVideoFiles.length} videos selected` : 'Select Video Files'}
            </Button>
          </label>
        </Box>

        <Box sx={{ mb: 3 }}>
          <input
            id="video-thumbnail-input"
            type="file"
            accept="image/*"
            onChange={handleVideoThumbnailSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="video-thumbnail-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                borderColor: state.lightMode ? '#333' : '#666',
                '&:hover': {
                  borderColor: state.lightMode ? '#000' : '#fff',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              {videoThumbnailFile ? videoThumbnailFile.name : 'Select Thumbnail (Optional)'}
            </Button>
          </label>
        </Box>

        {selectedVideoFiles && selectedVideoFiles.length === 1 && (
          <TextField
            fullWidth
            label="Video Title (Optional)"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            sx={{ mb: 3 }}
          />
        )}

        <Button
          onClick={handleVideoUpload}
          disabled={!selectedVideoFiles || state.isUploading}
          variant="contained"
          sx={{
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            backgroundColor: state.lightMode ? '#000' : '#fff',
            color: state.lightMode ? '#fff' : '#000',
            '&:hover': {
              backgroundColor: state.lightMode ? '#333' : '#ccc',
            },
          }}
        >
          {state.isUploading ? 'Uploading...' : 'Upload Videos'}
        </Button>

        {/* Video Management Table */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif' }}>
            Video Library ({videos.length})
          </Typography>
          {videos.length > 0 ? (
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {videos.map((video: VideoFile) => (
                    <TableRow key={video.id}>
                      <TableCell>{video.title || video.name}</TableCell>
                      <TableCell>{formatFileSize(video.size)}</TableCell>
                      <TableCell>
                        <Chip
                          label={video.source === 'upload' ? 'Upload' : 'Stream'}
                          color={video.source === 'upload' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(video.uploadDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleDeleteVideo(video.id)} color="error">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No videos uploaded yet
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )

  const StreamManagementSection = () => (
    <Card
      sx={{
        background: state.lightMode ? '#f8f8f8' : '#1a1a1a',
        border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
        borderRadius: '12px',
        mb: 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <LiveTv sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '0.1em',
              fontWeight: 'bold',
            }}
          >
            STREAM MANAGEMENT
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="YouTube Stream URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            InputProps={{
              startAdornment: <YouTube sx={{ mr: 1, opacity: 0.5 }} />
            }}
          />
          <Button
            onClick={handleAddStream}
            variant="contained"
            startIcon={<Add />}
            sx={{
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              backgroundColor: state.lightMode ? '#000' : '#fff',
              color: state.lightMode ? '#fff' : '#000',
              '&:hover': {
                backgroundColor: state.lightMode ? '#333' : '#ccc',
              },
            }}
          >
            Add Stream
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Add an unlisted YouTube stream URL. The system will automatically detect when it goes live and show it to viewers. When the stream ends, it will be converted to a video.
        </Alert>

        {/* Stream Management Table */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif' }}>
            Managed Streams ({streams.length})
          </Typography>
          {streams.length > 0 ? (
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Viewers</TableCell>
                    <TableCell>Added</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {streams.map((stream: LiveStream) => (
                    <TableRow key={stream.id}>
                      <TableCell>{stream.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={stream.status}
                          color={stream.status === 'live' ? 'error' : stream.status === 'upcoming' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{stream.viewers || 0}</TableCell>
                      <TableCell>{new Date(stream.startTime || Date.now()).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleDeleteStream(stream.id)} color="error">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No streams added yet
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h4"
          sx={{
            mb: 4,
            textAlign: 'center',
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          Admin Panel
        </Typography>

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              },
            }}
          >
            <Tab label="Music" icon={<MusicNote />} />
            <Tab label="Videos" icon={<VideoLibrary />} />
            <Tab label="Streams" icon={<LiveTv />} />
          </Tabs>
        </Box>

        {/* Error/Success Messages */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert severity="error" sx={{ mb: 3 }}>
                {uploadError}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert severity="success" sx={{ mb: 3 }}>
                {uploadSuccess}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        <AnimatePresence>
          {state.isUploading && state.uploadProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card sx={{ mb: 3, p: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Uploading: {state.uploadProgress.fileName} ({state.uploadProgress.fileIndex + 1}/{state.uploadProgress.totalFiles})
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={state.uploadProgress.percent}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  {state.uploadProgress.percent}%
                </Typography>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        {currentTab === 0 && <MusicUploadSection />}
        {currentTab === 1 && <VideoUploadSection />}
        {currentTab === 2 && <StreamManagementSection />}
      </Box>
    </motion.div>
  )
}

export default AdminPanel 