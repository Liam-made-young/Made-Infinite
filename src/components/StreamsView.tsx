import React, { useState } from 'react'
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Badge,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  FiberManualRecord as LiveIcon,
  Visibility as ViewersIcon,
  LiveTv as NoStreamIcon,
  Schedule as ScheduleIcon,
  Stop as OfflineIcon
} from '@mui/icons-material'
import { useQuery } from 'react-query'
import { useAppContext } from '../contexts/AppContext'
import { LiveStream } from '../types'
import { apiClient } from '../services/api'
import StreamPlayerModal from './StreamPlayerModal'

const StreamsView: React.FC = () => {
  const { state } = useAppContext()
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Load streams from API with frequent updates to track live status
  const { data: streamsData, isLoading, error } = useQuery(
    'streams',
    async () => {
      const response = await apiClient.get('/streams')
      return response.data
    },
    {
      onError: (error: any) => {
        console.error('❌ Failed to load streams:', error)
      },
      refetchInterval: 15000, // Refresh every 15 seconds for more responsive live status
    }
  )

  const streams = streamsData?.streams || []
  const hasLiveStream = streams.some((stream: LiveStream) => stream.isLive)

  const handleStreamClick = (stream: LiveStream) => {
    // Allow playback for live, upcoming, and archived streams
    if (stream.isLive || stream.status === 'upcoming' || stream.status === 'archived') {
      setSelectedStream(stream)
      setModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedStream(null)
  }

  const formatViewers = (viewers?: number) => {
    if (!viewers) return '0'
    if (viewers >= 1000000) return `${(viewers / 1000000).toFixed(1)}M`
    if (viewers >= 1000) return `${(viewers / 1000).toFixed(1)}K`
    return viewers.toString()
  }

  const getStreamStatusInfo = (stream: LiveStream) => {
    if (stream.isLive && stream.status === 'live') {
      return {
        badge: { 
          label: 'LIVE', 
          color: 'error' as const, 
          icon: <LiveIcon />,
          animate: true
        },
        clickable: true,
        overlay: 'rgba(0,0,0,0.5)'
      }
    } else if (stream.status === 'upcoming') {
      return {
        badge: { 
          label: 'UPCOMING', 
          color: 'warning' as const, 
          icon: <ScheduleIcon />,
          animate: false
        },
        clickable: true,
        overlay: 'rgba(255,193,7,0.3)'
      }
    } else if (stream.status === 'archived' || stream.status === 'ended' || stream.isStreamVideo) {
      return {
        badge: { 
          label: 'ARCHIVED', 
          color: 'info' as const, 
          icon: <ScheduleIcon />,
          animate: false
        },
        clickable: true, // Archived/ended streams can still be viewed
        overlay: 'rgba(33,150,243,0.3)'
      }
    } else {
      return {
        badge: { 
          label: 'OFFLINE', 
          color: 'default' as const, 
          icon: <OfflineIcon />,
          animate: false
        },
        clickable: false,
        overlay: 'rgba(0,0,0,0.7)'
      }
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.1em' }}>
          Checking stream status...
        </Typography>
      </Box>
    )
  }

  if (streams.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <NoStreamIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
        <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.1em' }}>
          No Streams Available
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          No streams have been added yet. Check back later!
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          textAlign: 'center',
          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}
      >
        {hasLiveStream ? '🔴 Live Streams' : 'Streams'}
      </Typography>

      <Grid container spacing={3}>
        {streams.map((stream: LiveStream) => {
          const statusInfo = getStreamStatusInfo(stream)
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={stream.id}>
              <Card 
                sx={{ 
                  position: 'relative',
                  cursor: statusInfo.clickable ? 'pointer' : 'default',
                  background: state.lightMode ? '#f8f8f8' : '#1a1a1a',
                  border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333'}`,
                  borderRadius: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: statusInfo.clickable ? 1 : 0.7,
                  '&:hover': statusInfo.clickable ? {
                    transform: 'scale(1.02)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                    '& .play-overlay': {
                      opacity: 1,
                    }
                  } : {}
                }}
                onClick={() => statusInfo.clickable && handleStreamClick(stream)}
              >
                {/* Status Badge */}
                <Chip 
                  icon={statusInfo.badge.icon}
                  label={statusInfo.badge.label}
                  color={statusInfo.badge.color}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 2,
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: 'bold',
                    ...(statusInfo.badge.animate && {
                      animation: 'pulse 2s infinite',
                      '& .MuiChip-icon': {
                        animation: 'blink 1s infinite',
                      }
                    })
                  }}
                />

                {/* Viewers Badge - Only show for live streams */}
                {stream.isLive && stream.viewers && (
                  <Chip 
                    icon={<ViewersIcon />}
                    label={formatViewers(stream.viewers)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 2,
                      backgroundColor: 'rgba(255,0,0,0.8)',
                      color: 'white',
                      fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontSize: '0.7rem'
                    }}
                  />
                )}

                {/* Thumbnail */}
                <CardMedia
                  component="img"
                  height="200"
                  image={stream.thumbnail}
                  alt={stream.title}
                  sx={{
                    objectFit: 'cover',
                    filter: statusInfo.clickable ? 'brightness(0.9)' : 'brightness(0.6) grayscale(50%)'
                  }}
                />

                {/* Play Overlay - Only for clickable streams */}
                {statusInfo.clickable && (
                  <Box
                    className="play-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: statusInfo.overlay,
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                      backdropFilter: 'blur(2px)'
                    }}
                  >
                    <IconButton 
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'white',
                          transform: 'scale(1.1)'
                        },
                        width: 64,
                        height: 64
                      }}
                    >
                      <PlayIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  </Box>
                )}

                {/* Offline Overlay */}
                {!statusInfo.clickable && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: statusInfo.overlay,
                      backdropFilter: 'blur(2px)'
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'white',
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        letterSpacing: '0.1em',
                        textAlign: 'center'
                      }}
                    >
                      Stream Ended
                    </Typography>
                  </Box>
                )}

                <CardContent sx={{ p: 2 }}>
                  <Typography 
                    variant="h6" 
                    component="h3"
                    sx={{ 
                      fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      mb: 1,
                      lineHeight: 1.2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {stream.title}
                  </Typography>
                  
                  {stream.description && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.7,
                        fontSize: '0.75rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {stream.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Stream Player Modal */}
      <StreamPlayerModal
        open={modalOpen}
        onClose={handleCloseModal}
        stream={selectedStream}
      />

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  )
}

export default StreamsView 