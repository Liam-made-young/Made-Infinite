import React from 'react'
import { Box, Typography, Tabs, Tab, IconButton, Tooltip } from '@mui/material'
import { DarkMode, LightMode } from '@mui/icons-material'
import { useAppContext } from '../contexts/AppContext'
import AdminLoginModal from './AdminLoginModal'

const Header: React.FC = () => {
  const { state, dispatch } = useAppContext()

  const handleViewChange = (newView: string) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: newView as any })
  }

  const handleLightModeToggle = () => {
    dispatch({ type: 'TOGGLE_LIGHT_MODE' })
  }

  return (
    <Box 
      component="header" 
      sx={{ 
        borderBottom: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
        backgroundColor: state.lightMode ? '#ffffff' : '#000000',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        py: 1
      }}
    >
      <Box sx={{ 
        maxWidth: 'lg', 
        mx: 'auto', 
        px: 2,
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'space-between',
        minHeight: '56px'
      }}>
        {/* Center Navigation Tabs */}
        <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
          <Tabs
            value={state.currentView === 'admin' ? false : state.currentView}
            onChange={(_, newValue) => handleViewChange(newValue)}
            sx={{
              minHeight: '40px',
              '& .MuiTab-root': {
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontSize: '0.85rem',
                minHeight: '40px',
                py: 1,
                color: state.lightMode ? '#666666' : '#888888',
                '&.Mui-selected': {
                  color: state.lightMode ? '#000000' : '#ffffff',
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: state.lightMode ? '#000000' : '#ffffff',
              }
            }}
          >
            <Tab 
              value="music" 
              label="Music" 
            />
            <Tab 
              value="videos" 
              label="Videos" 
            />
            <Tab 
              value="streams" 
              label="Streams" 
            />
          </Tabs>
        </Box>

        {/* Right Side Controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Theme Toggle */}
          <Tooltip title={state.lightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'} arrow>
            <IconButton
              onClick={handleLightModeToggle}
              size="small"
              sx={{
                width: 36,
                height: 36,
                border: 1,
                borderColor: state.lightMode ? '#e0e0e0' : '#333333',
                color: state.lightMode ? '#000000' : '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '6px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: state.lightMode ? '#f5f5f5' : '#222222',
                  borderColor: state.lightMode ? '#000000' : '#ffffff',
                  transform: 'scale(1.05)',
                  boxShadow: `0 2px 8px ${state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              {state.lightMode ? <DarkMode sx={{ fontSize: '1rem' }} /> : <LightMode sx={{ fontSize: '1rem' }} />}
            </IconButton>
          </Tooltip>

          {/* Admin Toggle */}
          <AdminLoginModal />
        </Box>
      </Box>
    </Box>
  )
}

export default Header 