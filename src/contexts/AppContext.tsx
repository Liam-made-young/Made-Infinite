import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { AppState, AppAction, MusicFile } from '../types'

// Sample livestream data
const sampleLiveStreams = [
  {
    id: '1',
    title: 'Lo-Fi Hip Hop Radio - beats to relax/study to',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault_live.jpg',
    youtubeId: 'jfKfPfyJRdk',
    youtubeUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    isLive: true,
    viewers: 45231,
    description: 'Relaxing beats for focus and study',
    status: 'live' as const
  },
  {
    id: '2',
    title: 'Jazz Music Radio - smooth jazz instrumental',
    thumbnail: 'https://i.ytimg.com/vi/neV3EPgvZ-g/maxresdefault_live.jpg',
    youtubeId: 'neV3EPgvZ-g',
    youtubeUrl: 'https://www.youtube.com/watch?v=neV3EPgvZ-g',
    isLive: true,
    viewers: 12843,
    description: 'Smooth jazz for relaxation and work',
    status: 'live' as const
  }
]

const initialState: AppState = {
  musicFiles: [],
  videoFiles: [],
  isAdminLoggedIn: false,
  currentView: 'music',
  currentTrack: null,
  currentTrackIndex: 0,
  isPlaying: false,
  isLoading: false,
  isUploading: false,
  uploadProgress: null,
  stemPlayers: {},
  stemProcessingInProgress: false,
  lightMode: localStorage.getItem('lightMode') === 'true',
  liveStreams: sampleLiveStreams,
}

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_MUSIC_FILES':
      return { ...state, musicFiles: action.payload }
    case 'SET_VIDEO_FILES':
      return { ...state, videoFiles: action.payload }
    
    case 'SET_ADMIN_LOGGED_IN':
      return { ...state, isAdminLoggedIn: action.payload }
    
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload }
    
    case 'TOGGLE_VIEW':
      // Toggle between music/streams and admin (admin toggle works separately)
      if (state.currentView === 'admin') {
        return { ...state, currentView: 'music' }
      } else {
        return { ...state, currentView: 'admin' }
      }
    
    case 'SET_CURRENT_TRACK':
      return {
        ...state,
        currentTrack: action.payload.track,
        currentTrackIndex: action.payload.index,
      }
    
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload }
    
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload }
    
    case 'SET_STEM_PROCESSING':
      return { ...state, stemProcessingInProgress: action.payload }
    
    case 'TOGGLE_LIGHT_MODE':
      const newLightMode = !state.lightMode
      localStorage.setItem('lightMode', newLightMode.toString())
      return { ...state, lightMode: newLightMode }
    
    case 'UPDATE_TRACK_STEMS':
      return {
        ...state,
        musicFiles: state.musicFiles.map((file) =>
          file.id === action.payload.trackId
            ? { ...file, stems: action.payload.stems }
            : file
        ),
        currentTrack: state.currentTrack?.id === action.payload.trackId
          ? { ...state.currentTrack, stems: action.payload.stems }
          : state.currentTrack,
      }
    
    case 'SET_LIVE_STREAMS':
      return { ...state, liveStreams: action.payload }
    
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export { AppContext }

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
} 