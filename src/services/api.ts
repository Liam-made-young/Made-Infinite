import axios from 'axios'
import { MusicFile, AdminLoginData, UploadData, StemData } from '../types'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

export const musicApi = {
  // Health check
  checkHealth: async () => {
    const response = await api.get('/health')
    return response.data
  },

  // Music files
  getMusicFiles: async (): Promise<MusicFile[]> => {
    const response = await api.get('/files')
    const files = response.data.files || []
    
    // Map backend response to frontend MusicFile interface
    return files.map((file: any) => ({
      id: file.id,
      name: file.name,
      fileName: file.name, // Backend uses 'name', frontend expects 'fileName'
      title: file.title,
      streamUrl: file.streamUrl,
      coverUrl: file.coverUrl,
      size: file.size,
      uploadDate: file.uploadDate,
      dateAdded: file.createdTime || file.uploadDate,
      stems: file.stems,
    }))
  },

  deleteFile: async (fileId: string) => {
    const response = await api.delete(`/files/${encodeURIComponent(fileId)}`)
    return response.data
  },

  // Admin authentication
  adminLogin: async (data: AdminLoginData) => {
    const response = await api.post('/admin/login', data)
    return response.data
  },

  adminLogout: async () => {
    const response = await api.post('/admin/logout')
    return response.data
  },

  // File upload
  uploadFiles: async (
    files: File[],
    coverFile?: File,
    title?: string,
    onProgress?: (progress: number, fileName: string, index: number, total: number) => void
  ) => {
    const results = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('musicFile', file)
      
      if (title) {
        formData.append('title', title)
      }
      
      if (coverFile) {
        formData.append('coverImage', coverFile)
      }
      
      formData.append('uploadDate', new Date().toISOString())
      
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = ((i) / files.length) * 100 + 
                           (progressEvent.loaded / progressEvent.total) * (100 / files.length)
            onProgress(progress, file.name, i + 1, files.length)
          }
        },
      })
      
      results.push(response.data)
    }
    
    return results
  },

  // Stem processing
  processStems: async (fileId: string, fileName: string) => {
    const response = await api.post('/process-stems', {
      fileId,
      fileName,
    })
    return response.data
  },

  // Generate signed URL
  generateSignedUrl: async (fileName: string) => {
    const response = await api.post('/generate-url', { fileName })
    return response.data
  },
}

export const apiClient = api
export default api 