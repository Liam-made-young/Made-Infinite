import React, { useRef, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Slider,
  Chip
} from '@mui/material'
import {
  Close,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material'
import { useAppContext } from '../contexts/AppContext'

interface VideoFile {
  id: string
  name: string
  title?: string
  streamUrl: string
  thumbnailUrl?: string
  size: number
  uploadDate: string
  source: 'upload' | 'stream'
  description?: string
}

interface VideoPlayerModalProps {
  video: VideoFile | null
  open: boolean
  onClose: () => void
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, open, onClose }) => {
  const { state } = useAppContext()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimer, setControlsTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open && video && videoRef.current) {
      console.log('Loading video:', video.streamUrl)
      videoRef.current.load()
    }
  }, [open, video])

  // Set up event listeners when video element is ready
  useEffect(() => {
    if (!open || !video) return
    
    // Wait for video element to be available
    const setupListeners = () => {
      const videoElement = videoRef.current
      console.log('Setting up event listeners, videoElement:', !!videoElement)
      
      if (!videoElement) {
        console.log('Video element not ready, trying again in 50ms')
        setTimeout(setupListeners, 50)
        return
      }

      console.log('Video element ready, adding event listeners')

      const updateTime = () => setCurrentTime(videoElement.currentTime)
      const updateDuration = () => setDuration(videoElement.duration || 0)
      const handlePlay = () => {
        console.log('🎵 PLAY EVENT FIRED!')
        setIsPlaying(true)
      }
      const handlePause = () => {
        console.log('⏸️ PAUSE EVENT FIRED!')
        setIsPlaying(false)
      }
      const handleEnded = () => {
        console.log('Video ended')
        setIsPlaying(false)
      }

      videoElement.addEventListener('timeupdate', updateTime)
      videoElement.addEventListener('loadedmetadata', updateDuration)
      videoElement.addEventListener('play', handlePlay)
      videoElement.addEventListener('pause', handlePause)
      videoElement.addEventListener('ended', handleEnded)

      console.log('✅ Event listeners added successfully')
    }

    setupListeners()
  }, [open, video])

  const togglePlay = async () => {
    console.log('togglePlay called, videoRef.current:', !!videoRef.current)
    console.log('Current isPlaying state:', isPlaying)
    if (videoRef.current) {
      if (isPlaying) {
        console.log('Attempting to pause video')
        videoRef.current.pause()
      } else {
        console.log('Attempting to play video')
        try {
          await videoRef.current.play()
          console.log('Video play() succeeded')
        } catch (error) {
          console.error('Error playing video:', error)
          console.error('Video readyState:', videoRef.current.readyState)
          console.error('Video networkState:', videoRef.current.networkState)
          console.error('Video error:', videoRef.current.error)
        }
      }
    } else {
      console.error('videoRef.current is null!')
    }
  }

  const handleSeek = (value: number) => {
    console.log('handleSeek called with value:', value, 'duration:', duration)
    if (videoRef.current) {
      const newTime = (value / 100) * duration
      console.log('Setting currentTime to:', newTime)
      videoRef.current.currentTime = newTime
    } else {
      console.error('videoRef.current is null in handleSeek!')
    }
  }

  const handleVolumeChange = (value: number) => {
    const newVolume = value / 100
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimer) {
      clearTimeout(controlsTimer)
    }
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
    setControlsTimer(timer)
  }

  if (!video) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': {
              background: 'rgba(0,0,0,0.7)',
            }
          }}
        >
          <Close />
        </IconButton>

        {/* Video Container */}
        <Box 
          sx={{ 
            position: 'relative',
            width: '100%',
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000'
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setShowControls(isPlaying ? false : true)}
        >
          <video
            ref={videoRef}
            src={video.streamUrl}
            preload="metadata"
            controls={false}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              cursor: 'pointer'
            }}
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
            onError={(e) => {
              console.error('Video error:', e.currentTarget.error)
              console.error('Error details:', {
                code: e.currentTarget.error?.code,
                message: e.currentTarget.error?.message
              })
            }}
            onLoadStart={() => {
              console.log('Video load started')
            }}
            onCanPlay={() => {
              console.log('Video can play')
            }}
            onLoadedData={() => {
              console.log('Video data loaded')
            }}
            onLoadedMetadata={() => {
              console.log('Video metadata loaded, duration:', videoRef.current?.duration)
            }}
            onWaiting={() => {
              console.log('Video waiting for data')
            }}
            onSeeking={() => {
              console.log('Video seeking')
            }}
            onSeeked={() => {
              console.log('Video seeked')
            }}
          />

          {/* Video Controls Overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              p: 2,
              opacity: showControls ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            {/* Progress Bar */}
            <Slider
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={(_, value) => {
                console.log('Slider onChange triggered with value:', value)
                handleSeek(value as number)
              }}
              sx={{
                color: 'white',
                mb: 1,
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                },
                '& .MuiSlider-track': {
                  height: 4,
                },
                '& .MuiSlider-rail': {
                  height: 4,
                  opacity: 0.3,
                },
              }}
            />

            {/* Controls Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Play/Pause */}
              <IconButton 
                onClick={() => {
                  console.log('Play/Pause button clicked')
                  togglePlay()
                }} 
                sx={{ color: 'white' }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>

              {/* Time Display */}
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'white', 
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  minWidth: '80px'
                }}
              >
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>

              {/* Spacer */}
              <Box sx={{ flexGrow: 1 }} />

              {/* Volume Controls */}
              <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>

              <Slider
                value={isMuted ? 0 : volume * 100}
                onChange={(_, value) => handleVolumeChange(value as number)}
                sx={{
                  color: 'white',
                  width: 100,
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                  },
                }}
              />

              {/* Fullscreen */}
              <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Video Info */}
        <Box sx={{ p: 3, background: state.lightMode ? '#f8f8f8' : '#1a1a1a' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 'bold',
              mb: 1
            }}
          >
            {video.title || video.name}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip
              label={video.source === 'upload' ? 'Uploaded' : 'From Stream'}
              size="small"
              color={video.source === 'upload' ? 'primary' : 'secondary'}
            />
            <Chip
              label={new Date(video.uploadDate).toLocaleDateString()}
              size="small"
              variant="outlined"
            />
          </Box>

          {video.description && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                opacity: 0.8
              }}
            >
              {video.description}
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default VideoPlayerModal 