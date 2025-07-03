export interface MusicFile {
  id: string
  name: string
  title?: string
  fileName: string
  streamUrl: string
  coverUrl?: string
  size: number
  uploadDate: string
  dateAdded?: string
  stems?: StemData
}

export interface StemData {
  vocals?: StemFile
  drums?: StemFile
  bass?: StemFile
  other?: StemFile
}

export interface StemFile {
  url?: string
  fileName: string
}

export interface UploadProgress {
  percent: number
  fileName: string
  fileIndex: number
  totalFiles: number
}

export type ViewMode = 'music' | 'streams' | 'videos' | 'admin'

export interface LiveStream {
  id: string
  title: string
  thumbnail: string
  youtubeId: string
  youtubeUrl: string
  isLive: boolean
  viewers?: number
  description?: string
  startTime?: string
  endTime?: string
  status: 'upcoming' | 'live' | 'ended' | 'archived'
  archivedDate?: string
  isStreamVideo?: boolean // Flag for stream-derived videos
  videoId?: string // Link to converted video entry
}

export interface VideoFile {
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
  source: 'upload' | 'stream' // tracks if it came from a converted stream
  originalStreamId?: string // if converted from stream
}

export interface AppState {
  musicFiles: MusicFile[]
  videoFiles: VideoFile[]
  isAdminLoggedIn: boolean
  currentView: ViewMode
  currentTrack: MusicFile | null
  currentTrackIndex: number
  isPlaying: boolean
  isLoading: boolean
  isUploading: boolean
  uploadProgress: UploadProgress | null
  stemPlayers: Record<string, HTMLAudioElement>
  stemProcessingInProgress: boolean
  lightMode: boolean
  liveStreams: LiveStream[]
}

export type AppAction =
  | { type: 'SET_MUSIC_FILES'; payload: MusicFile[] }
  | { type: 'SET_VIDEO_FILES'; payload: VideoFile[] }
  | { type: 'SET_ADMIN_LOGGED_IN'; payload: boolean }
  | { type: 'SET_CURRENT_VIEW'; payload: ViewMode }
  | { type: 'TOGGLE_VIEW' }
  | { type: 'SET_CURRENT_TRACK'; payload: { track: MusicFile | null; index: number } }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: UploadProgress | null }
  | { type: 'SET_STEM_PROCESSING'; payload: boolean }
  | { type: 'TOGGLE_LIGHT_MODE' }
  | { type: 'UPDATE_TRACK_STEMS'; payload: { trackId: string; stems: StemData } }
  | { type: 'SET_LIVE_STREAMS'; payload: LiveStream[] }

export interface AdminLoginData {
  password: string
}

export interface UploadData {
  musicFile: File
  coverFile?: File
  title?: string
}

export interface StemVolume {
  vocals: number
  drums: number
  bass: number
  other: number
} 