import React, { useContext, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardMedia,
  Grid,
  Chip,
  Slider,
  Divider,
  Tooltip,
  Stack,
} from '@mui/material'
import {
  Close,
  PlayArrow,
  Pause,
  Download,
  VolumeUp,
  MusicNote,
  GraphicEq,
  Stop,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { AppContext } from '../contexts/AppContext'
import { MusicFile, StemData } from '../types'

interface SongDetailModalProps {
  open: boolean
  onClose: () => void
  song: MusicFile | null
}

const SongDetailModal: React.FC<SongDetailModalProps> = ({ open, onClose, song }) => {
  const { state, dispatch } = useContext(AppContext)
  const [stemVolumes, setStemVolumes] = useState({
    vocals: 100,
    drums: 100,
    bass: 100,
    other: 100,
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [mainAudio, setMainAudio] = useState<HTMLAudioElement | null>(null)

  // Initialize audio when song changes
  useEffect(() => {
    if (song && open) {
      const audio = new Audio(song.streamUrl)
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })
      audio.addEventListener('ended', () => {
        setIsPlaying(false)
      })
      setMainAudio(audio)

      return () => {
        audio.pause()
        audio.src = ''
      }
    }
  }, [song, open])

  // Cleanup on close
  useEffect(() => {
    if (!open && mainAudio) {
      mainAudio.pause()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [open, mainAudio])

  const handlePlayPause = () => {
    if (!mainAudio) return

    if (isPlaying) {
      mainAudio.pause()
      setIsPlaying(false)
    } else {
      mainAudio.play()
      setIsPlaying(true)
      
      // Update global state
      if (song) {
        dispatch({
          type: 'SET_CURRENT_TRACK',
          payload: { track: song, index: state.musicFiles.findIndex(f => f.id === song.id) }
        })
        dispatch({ type: 'SET_PLAYING', payload: true })
      }
    }
  }

  const handleStop = () => {
    if (!mainAudio) return
    
    mainAudio.pause()
    mainAudio.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
    dispatch({ type: 'SET_PLAYING', payload: false })
  }

  const handleSeek = (event: Event, newValue: number | number[]) => {
    const seekTime = newValue as number
    if (mainAudio) {
      mainAudio.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const handleDownload = () => {
    if (!song) return
    
    const link = document.createElement('a')
    link.href = song.streamUrl
    link.download = song.title || song.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getStemStatus = (stems: StemData | undefined) => {
    if (!stems) return { label: 'NO STEMS', color: '#9e9e9e' }
    
    const stemCount = Object.keys(stems).length
    if (stemCount >= 4) return { label: 'FULL STEMS', color: '#4caf50' }
    if (stemCount >= 2) return { label: 'PARTIAL STEMS', color: '#ff9800' }
    return { label: 'PROCESSING', color: '#2196f3' }
  }

  const StemControl = ({ stemType, stemData }: { stemType: string; stemData?: { url?: string; fileName: string } }) => {
    const volume = stemVolumes[stemType as keyof typeof stemVolumes]
    const hasUrl = stemData?.url

    return (
      <Card
        sx={{
          backgroundColor: state.lightMode ? '#f5f5f5' : '#2a2a2a',
          border: `1px solid ${state.lightMode ? '#e0e0e0' : '#404040'}`,
          borderRadius: 0,
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '0.05em',
              color: state.lightMode ? '#000000' : '#ffffff',
              textTransform: 'uppercase',
            }}
          >
            {stemType}
          </Typography>
          
          <Chip
            label={hasUrl ? 'READY' : 'N/A'}
            size="small"
            sx={{
              backgroundColor: hasUrl ? '#4caf50' : '#9e9e9e',
              color: '#ffffff',
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '0.6rem',
              height: 16,
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeUp 
            sx={{ 
              color: state.lightMode ? '#666666' : '#888888',
              fontSize: 16,
            }} 
          />
          <Slider
            value={volume}
            onChange={(_, newValue) => setStemVolumes(prev => ({ ...prev, [stemType]: newValue as number }))}
            disabled={!hasUrl}
            size="small"
            sx={{
              color: state.lightMode ? '#000000' : '#ffffff',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
              '& .MuiSlider-track': {
                height: 3,
              },
              '& .MuiSlider-rail': {
                height: 3,
                opacity: 0.3,
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
              color: state.lightMode ? '#666666' : '#888888',
              minWidth: 30,
            }}
          >
            {volume}%
          </Typography>
        </Box>
      </Card>
    )
  }

  if (!song) return null

  const stemStatus = getStemStatus(song.stems)
  const displayName = song.title || song.name

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: state.lightMode ? '#ffffff' : '#1a1a1a',
          border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
          borderRadius: 0,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ position: 'relative' }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            p: 2,
            borderBottom: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
          }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                color: state.lightMode ? '#000000' : '#ffffff',
              }}
            >
              TRACK DETAILS
            </Typography>
            
            <IconButton
              onClick={onClose}
              sx={{ color: state.lightMode ? '#666666' : '#888888' }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Main Content */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Left Column - Track Info */}
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Cover Image */}
                  <Box sx={{ mb: 3 }}>
                    {song.coverUrl ? (
                      <CardMedia
                        component="img"
                        image={song.coverUrl}
                        alt={displayName}
                        sx={{
                          width: '100%',
                          height: 250,
                          objectFit: 'cover',
                          border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: 250,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: state.lightMode ? '#f0f0f0' : '#111111',
                          border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                          color: state.lightMode ? '#666666' : '#888888',
                        }}
                      >
                        <MusicNote sx={{ fontSize: 64 }} />
                      </Box>
                    )}
                  </Box>

                  {/* Track Information */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        letterSpacing: '0.05em',
                        color: state.lightMode ? '#000000' : '#ffffff',
                        mb: 1,
                        wordBreak: 'break-word',
                      }}
                    >
                      {displayName}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip
                        label={stemStatus.label}
                        size="small"
                        sx={{
                          backgroundColor: stemStatus.color,
                          color: '#ffffff',
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.6rem',
                        }}
                      />
                      
                      <Chip
                        label={formatFileSize(song.size)}
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: state.lightMode ? '#e0e0e0' : '#333333',
                          color: state.lightMode ? '#666666' : '#888888',
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.6rem',
                        }}
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        color: state.lightMode ? '#666666' : '#888888',
                        mb: 1,
                      }}
                    >
                      Uploaded: {new Date(song.uploadDate).toLocaleDateString()}
                    </Typography>
                    
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        color: state.lightMode ? '#666666' : '#888888',
                      }}
                    >
                      File: {song.fileName}
                    </Typography>
                  </Box>

                  {/* Playback Controls */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <IconButton
                        onClick={handlePlayPause}
                        sx={{
                          backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                          color: state.lightMode ? '#ffffff' : '#000000',
                          '&:hover': {
                            backgroundColor: state.lightMode ? '#333333' : '#cccccc',
                          },
                        }}
                      >
                        {isPlaying ? <Pause /> : <PlayArrow />}
                      </IconButton>
                      
                      <IconButton
                        onClick={handleStop}
                        sx={{ color: state.lightMode ? '#666666' : '#888888' }}
                      >
                        <Stop />
                      </IconButton>
                      
                      <Box sx={{ flexGrow: 1 }} />
                      
                      <Button
                        onClick={handleDownload}
                        startIcon={<Download />}
                        size="small"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          color: state.lightMode ? '#666666' : '#888888',
                          borderColor: state.lightMode ? '#e0e0e0' : '#333333',
                        }}
                        variant="outlined"
                      >
                        DOWNLOAD
                      </Button>
                    </Box>

                    {/* Progress Bar */}
                    <Box sx={{ mb: 1 }}>
                      <Slider
                        value={currentTime}
                        max={duration}
                        onChange={handleSeek}
                        size="small"
                        sx={{
                          color: state.lightMode ? '#000000' : '#ffffff',
                          '& .MuiSlider-thumb': {
                            width: 16,
                            height: 16,
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
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          color: state.lightMode ? '#666666' : '#888888',
                        }}
                      >
                        {formatTime(currentTime)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          color: state.lightMode ? '#666666' : '#888888',
                        }}
                      >
                        {formatTime(duration)}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              </Grid>

              {/* Right Column - Stem Controls */}
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <GraphicEq sx={{ color: state.lightMode ? '#666666' : '#888888' }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        letterSpacing: '0.1em',
                        color: state.lightMode ? '#000000' : '#ffffff',
                      }}
                    >
                      STEM CONTROLS
                    </Typography>
                  </Box>

                  {song.stems ? (
                    <Stack spacing={2}>
                      <StemControl stemType="vocals" stemData={song.stems.vocals} />
                      <StemControl stemType="drums" stemData={song.stems.drums} />
                      <StemControl stemType="bass" stemData={song.stems.bass} />
                      <StemControl stemType="other" stemData={song.stems.other} />
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        textAlign: 'center',
                        py: 4,
                        color: state.lightMode ? '#666666' : '#888888',
                      }}
                    >
                      <GraphicEq sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                      <Typography
                        variant="body1"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          letterSpacing: '0.1em',
                          mb: 1,
                        }}
                      >
                        NO STEMS AVAILABLE
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '0.8rem',
                        }}
                      >
                        Stems need to be processed first
                      </Typography>
                    </Box>
                  )}
                </motion.div>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SongDetailModal 