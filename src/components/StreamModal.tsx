import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Chip
} from '@mui/material'
import {
  Close as CloseIcon,
  FiberManualRecord as LiveIcon,
  Visibility as ViewersIcon
} from '@mui/icons-material'
import { LiveStream } from '../types'

interface StreamModalProps {
  stream: LiveStream | null
  open: boolean
  onClose: () => void
}

const StreamModal: React.FC<StreamModalProps> = ({ stream, open, onClose }) => {
  if (!stream) return null

  const formatViewers = (viewers?: number) => {
    if (!viewers) return '0'
    if (viewers >= 1000000) return `${(viewers / 1000000).toFixed(1)}M`
    if (viewers >= 1000) return `${(viewers / 1000).toFixed(1)}K`
    return viewers.toString()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 'bold',
              flex: 1
            }}
          >
            {stream.title}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {stream.isLive && (
              <Chip 
                icon={<LiveIcon />}
                label="LIVE"
                color="error"
                size="small"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 'bold',
                  animation: 'pulse 2s infinite'
                }}
              />
            )}
            
            {stream.viewers && (
              <Chip 
                icon={<ViewersIcon />}
                label={`${formatViewers(stream.viewers)} watching`}
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '0.7rem'
                }}
              />
            )}
          </Box>
        </Box>
        
        <IconButton 
          onClick={onClose}
          sx={{ 
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, pb: 2 }}>
        {/* YouTube Embed */}
        <Box
          sx={{
            position: 'relative',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            height: 0,
            overflow: 'hidden',
            maxWidth: '100%',
            background: '#000'
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${stream.youtubeId}?autoplay=1&mute=0`}
            title={stream.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
          />
        </Box>

        {/* Stream Description */}
        {stream.description && (
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                lineHeight: 1.5
              }}
            >
              {stream.description}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Dialog>
  )
}

export default StreamModal 