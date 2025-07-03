import React, { useState } from 'react'
import { Box, Grid, Card, CardContent, Typography, CardMedia, IconButton } from '@mui/material'
import { PlayArrow, VideoLibrary } from '@mui/icons-material'
import { useQuery } from 'react-query'
import { useAppContext } from '../contexts/AppContext'
import { apiClient } from '../services/api'
import VideoPlayerModal from './VideoPlayerModal'

interface VideoFile {
  id: string
  name: string
  title?: string
  fileName: string
  streamUrl: string
  thumbnailUrl?: string
  size: number
  uploadDate: string
  dateAdded?: string
  duration?: string
  views?: number
  description?: string
  source: 'upload' | 'stream'
  originalStreamId?: string
}

const VideosView: React.FC = () => {
  const { state } = useAppContext()
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Load videos from API
  const { data: videosData, isLoading, error } = useQuery(
    'videos',
    async () => {
      const response = await apiClient.get('/videos')
      return response.data
    },
    {
      onError: (error: any) => {
        console.error('❌ Failed to load videos:', error)
      }
    }
  )

  const videos = videosData?.videos || []

  const handlePlayVideo = (video: VideoFile) => {
    setSelectedVideo(video)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedVideo(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.1em' }}>
          Loading videos...
        </Typography>
      </Box>
    )
  }

  if (error || videos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <VideoLibrary sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
        <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.1em' }}>
          No videos yet
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.7, fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          {state.isAdminLoggedIn 
            ? 'Upload videos in admin mode or add live streams that will convert to videos when ended.'
            : 'Check back later for video content.'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {videos.map((video: VideoFile) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
            <Card
              sx={{
                background: state.lightMode ? '#f8f8f8' : '#1a1a1a',
                border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333'}`,
                borderRadius: '12px',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                  '& .video-overlay': {
                    opacity: 1,
                  },
                },
              }}
              onClick={() => handlePlayVideo(video)}
            >
              {/* Video Thumbnail */}
              <CardMedia
                component="div"
                sx={{
                  height: 180,
                  background: video.thumbnailUrl 
                    ? `url(${video.thumbnailUrl})` 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!video.thumbnailUrl && (
                  <VideoLibrary sx={{ fontSize: 40, opacity: 0.6, color: 'white' }} />
                )}
                
                {/* Video Overlay Controls */}
                <Box
                  className="video-overlay"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <IconButton
                    sx={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.3)',
                        transform: 'scale(1.1)',
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlayVideo(video)
                    }}
                  >
                    <PlayArrow sx={{ fontSize: 30 }} />
                  </IconButton>
                </Box>

                {/* Source Badge */}
                {video.source === 'stream' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(255,0,0,0.8)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    FROM STREAM
                  </Box>
                )}
              </CardMedia>

              {/* Video Info */}
              <CardContent sx={{ p: 2 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {video.title || video.name}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.7,
                    fontSize: '0.75rem',
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    mb: 1,
                  }}
                >
                  {formatDate(video.uploadDate || video.dateAdded || '')}
                </Typography>

                {video.size > 0 && (
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.6,
                      fontSize: '0.7rem',
                      fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                  >
                    {formatFileSize(video.size)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Video Player Modal */}
      <VideoPlayerModal 
        video={selectedVideo}
        open={modalOpen}
        onClose={handleCloseModal}
      />
    </Box>
  )
}

export default VideosView 