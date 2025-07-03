import React from 'react'
import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { useAppContext } from '../contexts/AppContext'

const MadeInfiniteTitle: React.FC = () => {
  const { state } = useAppContext()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 4,
        mt: 8, // Account for fixed header
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 100,
            letterSpacing: '0.1em',
            mb: 1,
            background: state.lightMode
              ? 'linear-gradient(90deg, #000000, #333333)'
              : 'linear-gradient(90deg, #ffffff, #cccccc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          MADE INFINITE
        </Typography>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <Typography
          variant="h2"
          sx={{
            fontSize: '1.2rem',
            color: state.lightMode ? '#666666' : '#888888',
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
            mb: 2,
          }}
        >
          ∞
        </Typography>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        <Typography
          variant="body2"
          sx={{
            color: state.lightMode ? '#999999' : '#666666',
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {state.musicFiles.length} TRACKS AVAILABLE
        </Typography>
      </motion.div>
    </Box>
  )
}

export default MadeInfiniteTitle 