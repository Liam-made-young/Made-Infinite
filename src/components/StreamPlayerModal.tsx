import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Chip,
  Button,
  Alert
} from '@mui/material'
import {
  Close,
  LiveTv,
  OpenInNew
} from '@mui/icons-material'
import { useAppContext } from '../contexts/AppContext'
import { LiveStream } from '../types'

interface StreamPlayerModalProps {
  stream: LiveStream | null
  open: boolean
  onClose: () => void
}

const StreamPlayerModal: React.FC<StreamPlayerModalProps> = ({ stream, open, onClose }) => {
  const { state } = useAppContext()
  const [embedError, setEmbedError] = useState(false)

  if (!stream) return null

  // Convert YouTube URL to embed URL with better parameters
  const getEmbedUrl = (youtubeId: string) => {
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&fs=1&enablejsapi=1`
    console.log('🎥 YouTube embed URL:', embedUrl)
    console.log('🎥 YouTube ID:', youtubeId)
    console.log('🎥 Stream status:', stream.status)
    return embedUrl
  }

  // Get direct YouTube watch URL for fallback
  const getWatchUrl = (youtubeId: string) => {
    return `https://www.youtube.com/watch?v=${youtubeId}`
  }

  // Handle iframe load errors
  const handleIframeError = () => {
    console.error('❌ YouTube embed failed to load')
    setEmbedError(true)
  }

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

        {/* YouTube Embed Container */}
        <Box 
          sx={{ 
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            height: 0,
            background: '#000'
          }}
        >
          {!embedError ? (
            <iframe
              src={getEmbedUrl(stream.youtubeId)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={handleIframeError}
              onLoad={() => console.log('✅ YouTube embed loaded successfully')}
            />
          ) : (
            // Fallback when embed fails
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a1a',
                color: 'white',
                p: 4
              }}
            >
              <Alert severity="warning" sx={{ mb: 3, maxWidth: '80%' }}>
                <Typography variant="body2">
                  This video cannot be embedded. It may be private, deleted, or have embedding disabled.
                </Typography>
              </Alert>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<OpenInNew />}
                onClick={() => window.open(getWatchUrl(stream.youtubeId), '_blank')}
                sx={{ 
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                Watch on YouTube
              </Button>
              
              <Typography variant="body2" sx={{ mt: 2, opacity: 0.7, textAlign: 'center' }}>
                YouTube ID: {stream.youtubeId}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Stream Info */}
        <Box sx={{ p: 3, background: state.lightMode ? '#f8f8f8' : '#1a1a1a' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 'bold',
                flexGrow: 1
              }}
            >
              {stream.title}
            </Typography>

            {/* Status Badge */}
            {stream.status === 'live' && (
              <Chip
                icon={<LiveTv />}
                label="LIVE"
                color="error"
                size="small"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 'bold',
                  animation: 'pulse 2s infinite',
                }}
              />
            )}
            {stream.status === 'archived' && (
              <Chip
                label="ARCHIVED"
                color="info"
                size="small"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 'bold',
                }}
              />
            )}
            {stream.status === 'upcoming' && (
              <Chip
                label="UPCOMING"
                color="warning"
                size="small"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {stream.viewers && (
              <Chip
                label={`${formatViewers(stream.viewers)} viewers`}
                size="small"
                variant="outlined"
              />
            )}
            <Chip
              label={stream.status.toUpperCase()}
              size="small"
              color={
                stream.status === 'live' ? 'success' : 
                stream.status === 'archived' ? 'info' :
                stream.status === 'upcoming' ? 'warning' : 'default'
              }
            />
          </Box>

          {stream.description && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                opacity: 0.8,
                mb: 2
              }}
            >
              {stream.description}
            </Typography>
          )}
          
          {/* Debug info and fallback link */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNew />}
              onClick={() => window.open(getWatchUrl(stream.youtubeId), '_blank')}
              sx={{ 
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '0.7rem'
              }}
            >
              Open in YouTube
            </Button>
            
            <Chip
              label={`ID: ${stream.youtubeId}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem' }}
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to format viewer count
const formatViewers = (viewers: number) => {
  if (viewers >= 1000000) return `${(viewers / 1000000).toFixed(1)}M`
  if (viewers >= 1000) return `${(viewers / 1000).toFixed(1)}K`
  return viewers.toString()
}

export default StreamPlayerModal 