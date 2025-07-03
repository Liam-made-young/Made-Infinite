import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import { Close, AdminPanelSettings } from '@mui/icons-material'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { useAppContext } from '../contexts/AppContext'
import { musicApi } from '../services/api'

const AdminLoginModal: React.FC = () => {
  const { state, dispatch } = useAppContext()
  const [password, setPassword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Login mutation
  const loginMutation = useMutation(musicApi.adminLogin, {
    onSuccess: (data) => {
      console.log('✅ Admin access granted:', data)
      dispatch({ type: 'SET_ADMIN_LOGGED_IN', payload: true })
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'admin' })
      toast.success('ACCESS GRANTED')
      setModalOpen(false)
      setPassword('')
    },
    onError: (error: any) => {
      console.error('❌ Access denied:', error)
      toast.error('ACCESS DENIED')
      setPassword('')
    },
  })

  const handleClose = () => {
    setModalOpen(false)
    setPassword('')
  }

  const handleAdminToggle = () => {
    // If not logged in and trying to access admin, show login modal
    if (!state.isAdminLoggedIn && state.currentView !== 'admin') {
      setModalOpen(true)
    } else {
      // Otherwise just toggle the view
      dispatch({ type: 'TOGGLE_VIEW' })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('Enter password')
      return
    }
    loginMutation.mutate({ password })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any)
    }
  }

  return (
    <>
      {/* Admin Toggle Button */}
      <Tooltip title={state.currentView === 'admin' ? 'Back to Music' : 'Admin Panel'} arrow>
        <IconButton
          onClick={handleAdminToggle}
          sx={{
            width: 44,
            height: 44,
            border: 1,
            borderColor: state.currentView === 'admin' ? '#ff6b6b' : (state.lightMode ? '#e0e0e0' : '#333333'),
            color: state.currentView === 'admin' ? '#ff6b6b' : (state.lightMode ? '#000000' : '#ffffff'),
            backgroundColor: state.currentView === 'admin' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              backgroundColor: state.currentView === 'admin' ? 'rgba(255, 107, 107, 0.2)' : (state.lightMode ? '#f5f5f5' : '#222222'),
              borderColor: state.currentView === 'admin' ? '#ff6b6b' : (state.lightMode ? '#000000' : '#ffffff'),
              transform: 'scale(1.05)',
              boxShadow: `0 4px 12px ${state.currentView === 'admin' ? 'rgba(255, 107, 107, 0.3)' : (state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          <AdminPanelSettings sx={{ fontSize: '1.1rem' }} />
        </IconButton>
      </Tooltip>

      {/* Login Modal */}
      <Dialog 
        open={modalOpen} 
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: state.lightMode ? '#f8f8f8' : '#111111',
            border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
            borderRadius: '8px',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            textAlign: 'center',
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: '0.1em',
            color: state.lightMode ? '#000000' : '#ffffff',
            position: 'relative',
          }}
        >
          ACCESS
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: state.lightMode ? '#666666' : '#888888',
              '&:hover': {
                color: state.lightMode ? '#000000' : '#ffffff',
              },
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box 
            component="form" 
            onSubmit={handleSubmit}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 3,
              pt: 1,
            }}
          >
            <TextField
              type="password"
              placeholder="•••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              fullWidth
              disabled={loginMutation.isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: state.lightMode ? '#ffffff' : '#000000',
                  color: state.lightMode ? '#000000' : '#ffffff',
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  borderRadius: '4px',
                  '& fieldset': {
                    borderColor: state.lightMode ? '#e0e0e0' : '#333333',
                  },
                  '&:hover fieldset': {
                    borderColor: state.lightMode ? '#000000' : '#ffffff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: state.lightMode ? '#000000' : '#ffffff',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: state.lightMode ? '#666666' : '#888888',
                  opacity: 1,
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              disabled={loginMutation.isLoading || !password.trim()}
              sx={{
                backgroundColor: 'transparent',
                border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                color: state.lightMode ? '#000000' : '#ffffff',
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                borderRadius: '4px',
                py: 1.5,
                '&:hover': {
                  backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                  color: state.lightMode ? '#ffffff' : '#000000',
                  borderColor: state.lightMode ? '#000000' : '#ffffff',
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              {loginMutation.isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} color="inherit" />
                  AUTHENTICATING...
                </Box>
              ) : (
                'ENTER'
              )}
            </Button>

            {/* Status Message */}
            {loginMutation.isError && (
              <Typography
                variant="body2"
                sx={{
                  color: '#ff4444',
                  textAlign: 'center',
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '0.8rem',
                  letterSpacing: '0.05em',
                }}
              >
                ACCESS DENIED
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AdminLoginModal 