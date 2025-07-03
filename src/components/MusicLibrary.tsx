import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  PlayArrow,
  Download,
  MusicNote,
  Pause,
  Info,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAppContext } from '../contexts/AppContext'
import { MusicFile } from '../types'
import SongDetailModal from './SongDetailModal'

const MusicLibrary: React.FC = () => {
  const { state, dispatch } = useAppContext()
  const [selectedSong, setSelectedSong] = useState<MusicFile | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
  }

  const formatUploadDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))

      if (diffMinutes < 60) {
        return `${diffMinutes}m ago`
      } else if (diffHours < 24) {
        return `${diffHours}h ago`
      } else if (diffDays < 7) {
        return `${diffDays}d ago`
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return `${weeks}w ago`
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
      }
    } catch (error) {
      return 'Unknown date'
    }
  }

  const getStemStatus = (file: MusicFile) => {
    const hasStems = file.stems && Object.keys(file.stems).length > 0
    const isProcessing = file.id === state.currentTrack?.id && state.stemProcessingInProgress

    if (hasStems) {
      return { color: '#4caf50', label: 'STEMS READY', tooltip: 'Stems ready! Individual instruments available.' }
    } else if (isProcessing) {
      return { color: '#ff9800', label: 'PROCESSING', tooltip: 'Processing stems... This takes 1-2 minutes.' }
    } else {
      return { color: '#f44336', label: 'NO STEMS', tooltip: 'Play this track to start stem processing.' }
    }
  }

  const handlePlay = (file: MusicFile, index: number) => {
    dispatch({
      type: 'SET_CURRENT_TRACK',
      payload: { track: file, index }
    })
  }

  const handleDownload = (file: MusicFile) => {
    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = file.streamUrl
    link.download = file.title || file.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenSongDetail = (file: MusicFile) => {
    setSelectedSong(file)
    setModalOpen(true)
  }

  const handleCloseSongDetail = () => {
    setModalOpen(false)
    setSelectedSong(null)
  }

  if (state.isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress 
          size={40} 
          sx={{ color: state.lightMode ? '#000000' : '#ffffff' }}
        />
        <Typography 
          sx={{ 
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            color: state.lightMode ? '#666666' : '#888888',
            letterSpacing: '0.1em',
          }}
        >
          LOADING LIBRARY...
        </Typography>
      </Box>
    )
  }

  if (state.musicFiles.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          color: state.lightMode ? '#666666' : '#888888',
        }}
      >
        <MusicNote sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: '0.1em',
            mb: 1,
          }}
        >
          NO TRACKS AVAILABLE
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '0.8rem',
          }}
        >
          {state.isAdminLoggedIn ? 'Upload some music to get started!' : 'Check back later for new music.'}
        </Typography>
      </Box>
    )
  }

  // Sort files by upload date (newest first)
  const sortedFiles = [...state.musicFiles].sort((a, b) => {
    const dateA = new Date(a.uploadDate || a.dateAdded || 0)
    const dateB = new Date(b.uploadDate || b.dateAdded || 0)
    return dateB.getTime() - dateA.getTime()
  })

  return (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        {sortedFiles.map((file, index) => {
          const stemStatus = getStemStatus(file)
          const isCurrentTrack = state.currentTrack?.id === file.id
          const displayName = file.title || file.name

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  onClick={() => handleOpenSongDetail(file)}
                  sx={{
                    backgroundColor: state.lightMode ? '#f8f8f8' : '#1a1a1a',
                    border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                    borderRadius: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: state.lightMode ? '#000000' : '#ffffff',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {/* Cover Image - Golden Ratio (phi:1) */}
                  <Box sx={{ position: 'relative', aspectRatio: '1.618 / 1' }}>
                    {file.coverUrl ? (
                      <CardMedia
                        component="img"
                        image={file.coverUrl}
                        alt={displayName}
                        sx={{ 
                          objectFit: 'cover',
                          width: '100%',
                          height: '100%',
                          aspectRatio: '1.618 / 1'
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          aspectRatio: '1.618 / 1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: state.lightMode ? '#f0f0f0' : '#111111',
                          color: state.lightMode ? '#666666' : '#888888',
                        }}
                      >
                        <MusicNote sx={{ fontSize: 64 }} />
                      </Box>
                    )}

                    {/* Stem Status Badge */}
                    <Chip
                      label={stemStatus.label}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: stemStatus.color,
                        color: '#ffffff',
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '0.6rem',
                        height: 20,
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />

                    {/* Action Buttons Overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      <Tooltip title="Track Details" arrow>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenSongDetail(file)
                          }}
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            color: '#ffffff',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              transform: 'scale(1.05)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            },
                          }}
                        >
                          <Info sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title={isCurrentTrack && state.isPlaying ? 'Playing' : 'Play Track'} arrow>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlay(file, index)
                          }}
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            color: '#ffffff',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              transform: 'scale(1.05)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            },
                          }}
                        >
                          {isCurrentTrack && state.isPlaying ? <Pause sx={{ fontSize: '1rem' }} /> : <PlayArrow sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Card Content */}
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        mb: 1,
                        color: state.lightMode ? '#000000' : '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {displayName}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.7rem',
                          color: state.lightMode ? '#666666' : '#888888',
                        }}
                      >
                        {formatFileSize(file.size)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.7rem',
                          color: state.lightMode ? '#666666' : '#888888',
                        }}
                      >
                        {formatUploadDate(file.uploadDate || file.dateAdded || '')}
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlay(file, index)
                        }}
                        startIcon={isCurrentTrack && state.isPlaying ? <Pause sx={{ fontSize: '0.9rem' }} /> : <PlayArrow sx={{ fontSize: '0.9rem' }} />}
                        sx={{
                          borderColor: state.lightMode ? '#e0e0e0' : '#333333',
                          color: state.lightMode ? '#000000' : '#ffffff',
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.75rem',
                          letterSpacing: '0.15em',
                          fontWeight: 600,
                          borderRadius: 0,
                          py: 1.2,
                          px: 2,
                          minHeight: 40,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            borderColor: state.lightMode ? '#000000' : '#ffffff',
                            backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                            color: state.lightMode ? '#ffffff' : '#000000',
                            transform: 'translateY(-2px)',
                            boxShadow: `0 6px 16px ${state.lightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                          },
                          '&:active': {
                            transform: 'translateY(0px)',
                            transition: 'all 0.1s ease',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: `linear-gradient(90deg, transparent, ${state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}, transparent)`,
                            transition: 'left 0.6s ease',
                          },
                          '&:hover::before': {
                            left: '100%',
                          },
                        }}
                      >
                        {isCurrentTrack && state.isPlaying ? 'PAUSE' : 'PLAY'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(file)
                        }}
                        startIcon={<Download sx={{ fontSize: '0.9rem' }} />}
                        sx={{
                          borderColor: state.lightMode ? '#e0e0e0' : '#333333',
                          color: state.lightMode ? '#000000' : '#ffffff',
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.75rem',
                          letterSpacing: '0.15em',
                          fontWeight: 600,
                          borderRadius: 0,
                          py: 1.2,
                          px: 2,
                          minHeight: 40,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            borderColor: state.lightMode ? '#000000' : '#ffffff',
                            backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                            color: state.lightMode ? '#ffffff' : '#000000',
                            transform: 'translateY(-2px)',
                            boxShadow: `0 6px 16px ${state.lightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                          },
                          '&:active': {
                            transform: 'translateY(0px)',
                            transition: 'all 0.1s ease',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: `linear-gradient(90deg, transparent, ${state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}, transparent)`,
                            transition: 'left 0.6s ease',
                          },
                          '&:hover::before': {
                            left: '100%',
                          },
                        }}
                      >
                        SAVE
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          )
        })}
      </Grid>

      {/* Song Detail Modal */}
      <SongDetailModal
        open={modalOpen}
        onClose={handleCloseSongDetail}
        song={selectedSong}
      />
    </Box>
  )
}

export default MusicLibrary 