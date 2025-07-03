import React, { useContext, useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Card,
  Collapse,
  Chip,
  Grid,
  Tooltip,
  LinearProgress,
} from '@mui/material'
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeDown,
  VolumeOff,
  VolumeMute,
  Repeat,
  RepeatOne,
  Shuffle,
  ExpandLess,
  ExpandMore,
  GraphicEq,
  MusicNote,
  Stop,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { AppContext } from '../contexts/AppContext'
import { MusicFile, StemData } from '../types'

const MusicPlayer: React.FC = () => {
  const { state, dispatch } = useContext(AppContext)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [shuffleMode, setShuffle] = useState(false)
  const [stemPanelExpanded, setStemPanelExpanded] = useState(false)
  const [stemVolumes, setStemVolumes] = useState({
    vocals: 100,
    drums: 100,
    bass: 100,
    other: 100,
  })
  const [stemAudios, setStemAudios] = useState<Record<string, HTMLAudioElement>>({})

  const mainAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio when current track changes
  useEffect(() => {
    if (state.currentTrack) {
      // Initialize main audio
      if (mainAudioRef.current) {
        mainAudioRef.current.pause()
      }

      const audio = new Audio(state.currentTrack.streamUrl)
      audio.volume = (volume / 100) * (isMuted ? 0 : 1)
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })

      audio.addEventListener('ended', () => {
        handleTrackEnd()
      })

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e)
        dispatch({ type: 'SET_PLAYING', payload: false })
      })

      mainAudioRef.current = audio

      // Initialize stem audios if available
      if (state.currentTrack.stems) {
        const newStemAudios: Record<string, HTMLAudioElement> = {}
        
        Object.entries(state.currentTrack.stems).forEach(([stemType, stemData]) => {
          if (stemData?.url) {
            const stemAudio = new Audio(stemData.url)
            stemAudio.volume = (stemVolumes[stemType as keyof typeof stemVolumes] / 100) * (volume / 100)
            stemAudio.currentTime = currentTime
            newStemAudios[stemType] = stemAudio
          }
        })

        setStemAudios(newStemAudios)
      } else {
        setStemAudios({})
      }

      return () => {
        audio.pause()
        audio.src = ''
        Object.values(stemAudios).forEach(stemAudio => {
          stemAudio.pause()
          stemAudio.src = ''
        })
      }
    }
  }, [state.currentTrack])

  // Sync playback state
  useEffect(() => {
    if (mainAudioRef.current) {
      if (state.isPlaying) {
        mainAudioRef.current.play().catch(console.error)
        // Sync stem audios
        Object.values(stemAudios).forEach(stemAudio => {
          stemAudio.currentTime = mainAudioRef.current?.currentTime || 0
          stemAudio.play().catch(console.error)
        })
      } else {
        mainAudioRef.current.pause()
        Object.values(stemAudios).forEach(stemAudio => stemAudio.pause())
      }
    }
  }, [state.isPlaying, stemAudios])

  // Update volume
  useEffect(() => {
    if (mainAudioRef.current) {
      mainAudioRef.current.volume = (volume / 100) * (isMuted ? 0 : 1)
    }
    
    Object.entries(stemAudios).forEach(([stemType, stemAudio]) => {
      const stemVolume = stemVolumes[stemType as keyof typeof stemVolumes]
      stemAudio.volume = (stemVolume / 100) * (volume / 100) * (isMuted ? 0 : 1)
    })
  }, [volume, isMuted, stemVolumes, stemAudios])

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      setCurrentTime(0)
      if (mainAudioRef.current) {
        mainAudioRef.current.currentTime = 0
        mainAudioRef.current.play()
      }
    } else if (repeatMode === 'all' || state.currentTrackIndex < state.musicFiles.length - 1) {
      handleNext()
    } else {
      dispatch({ type: 'SET_PLAYING', payload: false })
    }
  }

  const handlePlayPause = () => {
    dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying })
  }

  const handleStop = () => {
    dispatch({ type: 'SET_PLAYING', payload: false })
    setCurrentTime(0)
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = 0
    }
    Object.values(stemAudios).forEach(stemAudio => {
      stemAudio.currentTime = 0
    })
  }

  const handleNext = () => {
    let nextIndex = state.currentTrackIndex + 1
    
    if (shuffleMode) {
      nextIndex = Math.floor(Math.random() * state.musicFiles.length)
    } else if (nextIndex >= state.musicFiles.length) {
      nextIndex = repeatMode === 'all' ? 0 : state.currentTrackIndex
    }

    if (nextIndex < state.musicFiles.length) {
      dispatch({
        type: 'SET_CURRENT_TRACK',
        payload: { track: state.musicFiles[nextIndex], index: nextIndex }
      })
    }
  }

  const handlePrevious = () => {
    let prevIndex = state.currentTrackIndex - 1
    
    if (shuffleMode) {
      prevIndex = Math.floor(Math.random() * state.musicFiles.length)
    } else if (prevIndex < 0) {
      prevIndex = repeatMode === 'all' ? state.musicFiles.length - 1 : 0
    }

    dispatch({
      type: 'SET_CURRENT_TRACK',
      payload: { track: state.musicFiles[prevIndex], index: prevIndex }
    })
  }

  const handleSeek = (event: Event, newValue: number | number[]) => {
    const seekTime = newValue as number
    setCurrentTime(seekTime)
    
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = seekTime
    }
    
    Object.values(stemAudios).forEach(stemAudio => {
      stemAudio.currentTime = seekTime
    })
  }

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const newVolume = newValue as number
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      switch (prev) {
        case 'off': return 'all'
        case 'all': return 'one'
        case 'one': return 'off'
        default: return 'off'
      }
    })
  }

  const toggleShuffle = () => {
    setShuffle(!shuffleMode)
  }

  const handleStemVolumeChange = (stemType: string, newValue: number | number[]) => {
    const newVolume = newValue as number
    setStemVolumes(prev => ({ ...prev, [stemType]: newVolume }))
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeOff />
    if (volume < 30) return <VolumeMute />
    if (volume < 70) return <VolumeDown />
    return <VolumeUp />
  }

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one': return <RepeatOne />
      default: return <Repeat />
    }
  }

  if (!state.currentTrack) {
    return null
  }

  const hasStems = state.currentTrack.stems && Object.keys(state.currentTrack.stems).length > 0
  const displayName = state.currentTrack.title || state.currentTrack.name

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: state.lightMode ? '#ffffff' : '#1a1a1a',
            border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
            borderRadius: 0,
            zIndex: 1000,
            borderBottom: 'none',
          }}
        >
          {/* Main Player */}
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Track Info */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {state.currentTrack.coverUrl ? (
                    <Box
                      component="img"
                      src={state.currentTrack.coverUrl}
                      alt={displayName}
                      sx={{
                        width: 50,
                        height: 50,
                        objectFit: 'cover',
                        border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: state.lightMode ? '#f0f0f0' : '#111111',
                        border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                        color: state.lightMode ? '#666666' : '#888888',
                      }}
                    >
                      <MusicNote sx={{ fontSize: 24 }} />
                    </Box>
                  )}
                  
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        color: state.lightMode ? '#000000' : '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.9rem',
                      }}
                    >
                      {displayName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        color: state.lightMode ? '#666666' : '#888888',
                        fontSize: '0.7rem',
                      }}
                    >
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Playback Controls */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Control Buttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Tooltip title={shuffleMode ? 'Shuffle On' : 'Shuffle Off'}>
                      <IconButton
                        onClick={toggleShuffle}
                        size="small"
                        sx={{
                          color: shuffleMode
                            ? (state.lightMode ? '#000000' : '#ffffff')
                            : (state.lightMode ? '#cccccc' : '#666666'),
                        }}
                      >
                        <Shuffle />
                      </IconButton>
                    </Tooltip>
                    
                    <IconButton
                      onClick={handlePrevious}
                      size="small"
                      sx={{ color: state.lightMode ? '#666666' : '#888888' }}
                    >
                      <SkipPrevious />
                    </IconButton>
                    
                    <IconButton
                      onClick={handleStop}
                      size="small"
                      sx={{ color: state.lightMode ? '#666666' : '#888888' }}
                    >
                      <Stop />
                    </IconButton>
                    
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
                      {state.isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    
                    <IconButton
                      onClick={handleNext}
                      size="small"
                      sx={{ color: state.lightMode ? '#666666' : '#888888' }}
                    >
                      <SkipNext />
                    </IconButton>
                    
                    <Tooltip title={`Repeat ${repeatMode}`}>
                      <IconButton
                        onClick={toggleRepeat}
                        size="small"
                        sx={{
                          color: repeatMode !== 'off'
                            ? (state.lightMode ? '#000000' : '#ffffff')
                            : (state.lightMode ? '#cccccc' : '#666666'),
                        }}
                      >
                        {getRepeatIcon()}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ width: '100%', maxWidth: 400 }}>
                    <Slider
                      value={currentTime}
                      max={duration}
                      onChange={handleSeek}
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
                  </Box>
                </Box>
              </Grid>

              {/* Volume & Stem Controls */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                  {hasStems && (
                    <Tooltip title="Stem Controls">
                      <IconButton
                        onClick={() => setStemPanelExpanded(!stemPanelExpanded)}
                        size="small"
                        sx={{
                          color: stemPanelExpanded
                            ? (state.lightMode ? '#000000' : '#ffffff')
                            : (state.lightMode ? '#666666' : '#888888'),
                        }}
                      >
                        <GraphicEq />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <IconButton
                    onClick={toggleMute}
                    size="small"
                    sx={{ color: state.lightMode ? '#666666' : '#888888' }}
                  >
                    {getVolumeIcon()}
                  </IconButton>
                  
                  <Box sx={{ width: 100 }}>
                    <Slider
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
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
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Stem Controls Panel */}
          <Collapse in={stemPanelExpanded && hasStems}>
            <Box
              sx={{
                borderTop: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                p: 2,
                backgroundColor: state.lightMode ? '#f8f8f8' : '#111111',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  letterSpacing: '0.1em',
                  color: state.lightMode ? '#000000' : '#ffffff',
                  mb: 2,
                  textAlign: 'center',
                }}
              >
                STEM MIXER
              </Typography>
              
              <Grid container spacing={2}>
                {state.currentTrack.stems && Object.entries(state.currentTrack.stems).map(([stemType, stemData]) => {
                  if (!stemData?.url) return null
                  
                  return (
                    <Grid item xs={12} sm={6} md={3} key={stemType}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Chip
                          label={stemType.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                            color: state.lightMode ? '#ffffff' : '#000000',
                            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                            fontSize: '0.6rem',
                            mb: 1,
                          }}
                        />
                        <Slider
                          orientation="vertical"
                          value={stemVolumes[stemType as keyof typeof stemVolumes]}
                          onChange={(_, newValue) => handleStemVolumeChange(stemType, newValue)}
                          min={0}
                          max={100}
                          sx={{
                            height: 80,
                            color: state.lightMode ? '#000000' : '#ffffff',
                            '& .MuiSlider-thumb': {
                              width: 16,
                              height: 16,
                            },
                            '& .MuiSlider-track': {
                              width: 4,
                            },
                            '& .MuiSlider-rail': {
                              width: 4,
                              opacity: 0.3,
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                            color: state.lightMode ? '#666666' : '#888888',
                            fontSize: '0.7rem',
                          }}
                        >
                          {stemVolumes[stemType as keyof typeof stemVolumes]}%
                        </Typography>
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          </Collapse>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

export default MusicPlayer 