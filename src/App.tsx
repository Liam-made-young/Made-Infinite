import React, { useEffect } from 'react'
import { Box, Container, useTheme, Typography } from '@mui/material'
import { useQuery } from 'react-query'
import { useAppContext } from './contexts/AppContext'
import { musicApi } from './services/api'
import Header from './components/Header'
import AdminPanel from './components/AdminPanel'
import MusicPlayer from './components/MusicPlayer'
import MusicLibrary from './components/MusicLibrary'
import StreamsView from './components/StreamsView'
import VideosView from './components/VideosView'
import toast from 'react-hot-toast'

const App: React.FC = () => {
  const { state, dispatch } = useAppContext()
  const theme = useTheme()

  // Load music files on app start
  const { data: musicFiles, isLoading, error, refetch } = useQuery(
    'musicFiles',
    musicApi.getMusicFiles,
    {
      onSuccess: (files) => {
        dispatch({ type: 'SET_MUSIC_FILES', payload: files || [] })
        console.log(`📚 Loaded ${files?.length || 0} tracks`)
      },
      onError: (error: any) => {
        console.error('❌ Failed to load music files:', error)
        dispatch({ type: 'SET_MUSIC_FILES', payload: [] }) // Set empty array on error
        dispatch({ type: 'SET_LOADING', payload: false }) // Ensure loading stops
        toast.error('Failed to load music library')
      },
      retry: 2, // Retry failed requests up to 2 times
      retryDelay: 1000, // Wait 1 second between retries
      refetchInterval: state.isAdminLoggedIn ? false : 30000, // Auto-refresh every 30s for public users
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    }
  )

  // Test server connection on app start
  useQuery('serverHealth', musicApi.checkHealth, {
    onSuccess: (data) => {
      console.log('🌐 Server status:', data.status)
      console.log('📊 Mode:', data.mode)
      console.log('📁 Files:', data.filesCount)
    },
    onError: () => {
      toast.error('Server connection failed')
    },
    retry: 1,
  })

  // Handle theme changes
  useEffect(() => {
    if (state.lightMode) {
      document.body.style.background = '#ffffff'
      document.body.style.color = '#000000'
    } else {
      document.body.style.background = '#000000'
      document.body.style.color = '#ffffff'
    }
  }, [state.lightMode])

  // Set loading state
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: isLoading })
  }, [isLoading, dispatch])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: state.lightMode ? '#ffffff' : '#000000',
        color: state.lightMode ? '#000000' : '#ffffff',
        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Main Header - Always Consistent */}
      <Box 
        sx={{ 
          pt: 4, 
          pb: 3,
          textAlign: 'center',
          borderBottom: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`
        }}
      >
        <Typography 
          variant="h2" 
          sx={{ 
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}
        >
          MADE INFINITE
        </Typography>
      </Box>

      {/* Navigation Menu - Under Header */}
      <Header />
      
      <Container maxWidth="lg" sx={{ pt: 2, pb: state.currentTrack ? 12 : 4 }}>

        {/* Conditional View Based on Current View */}
        {state.currentView === 'admin' ? (
          /* Admin Panel - only shown when in admin view and logged in */
          state.isAdminLoggedIn ? (
            <AdminPanel onRefreshLibrary={() => refetch()} />
          ) : (
            <MusicLibrary />
          )
        ) : state.currentView === 'streams' ? (
          /* Streams View - shows live streams */
          <StreamsView />
        ) : state.currentView === 'videos' ? (
          /* Videos View - shows video content */
          <VideosView />
        ) : (
          /* Music Library - shown in music view */
          <MusicLibrary />
        )}
      </Container>

      {/* Music Player - Fixed at bottom */}
      {state.currentTrack && <MusicPlayer />}

      {/* Global keyboard shortcuts */}
      <GlobalKeyboardShortcuts />
    </Box>
  )
}

// Component for handling global keyboard shortcuts
const GlobalKeyboardShortcuts: React.FC = () => {
  const { state, dispatch } = useAppContext()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when music player is open
      if (!state.currentTrack) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying })
          break
        case 'ArrowLeft':
          e.preventDefault()
          // Handle previous track
          if (state.currentTrackIndex > 0) {
            const prevIndex = state.currentTrackIndex - 1
            const prevTrack = state.musicFiles[prevIndex]
            dispatch({
              type: 'SET_CURRENT_TRACK',
              payload: { track: prevTrack, index: prevIndex }
            })
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          // Handle next track
          if (state.currentTrackIndex < state.musicFiles.length - 1) {
            const nextIndex = state.currentTrackIndex + 1
            const nextTrack = state.musicFiles[nextIndex]
            dispatch({
              type: 'SET_CURRENT_TRACK',
              payload: { track: nextTrack, index: nextIndex }
            })
          }
          break
        case 'Escape':
          e.preventDefault()
          dispatch({ type: 'SET_CURRENT_TRACK', payload: { track: null, index: 0 } })
          dispatch({ type: 'SET_PLAYING', payload: false })
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [state.currentTrack, state.isPlaying, state.currentTrackIndex, state.musicFiles, dispatch])

  return null
}

export default App 