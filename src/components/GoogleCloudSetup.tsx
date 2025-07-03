import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Chip,
  LinearProgress,
  Switch,
  FormControlLabel,
  Link,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  CloudUpload,
  Settings,
  Check,
  Error,
  Info,
  Launch,
  Storage,
  Security,
  Speed,
  AttachMoney,
  FileCopy,
  Refresh,
  Close,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../contexts/AppContext'

interface GoogleCloudSetupProps {
  open: boolean
  onClose: () => void
}

const GoogleCloudSetup: React.FC<GoogleCloudSetupProps> = ({ open, onClose }) => {
  const { state } = useAppContext()
  const [activeStep, setActiveStep] = useState(0)
  const [config, setConfig] = useState({
    projectId: '',
    bucketName: '',
    keyFile: '',
    credentials: '',
    storageMode: 'gcs',
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [enableGCS, setEnableGCS] = useState(false)

  const steps = [
    {
      label: 'Benefits Overview',
      description: 'Why use Google Cloud Storage?',
    },
    {
      label: 'Create Project',
      description: 'Set up your Google Cloud project',
    },
    {
      label: 'Service Account',
      description: 'Create authentication credentials',
    },
    {
      label: 'Configuration',
      description: 'Configure your application',
    },
    {
      label: 'Test & Activate',
      description: 'Verify and enable GCS',
    },
  ]

  const benefits = [
    {
      icon: <Storage sx={{ color: '#4285f4' }} />,
      title: 'Unlimited Storage',
      description: 'Store files up to 5TB each vs 100MB limit on free tiers',
    },
    {
      icon: <AttachMoney sx={{ color: '#34a853' }} />,
      title: 'Cost Effective',
      description: 'Pay only $0.02/GB/month for what you use',
    },
    {
      icon: <Speed sx={{ color: '#fbbc04' }} />,
      title: 'Global Performance',
      description: 'CDN delivery worldwide for fast streaming',
    },
    {
      icon: <Security sx={{ color: '#ea4335' }} />,
      title: 'Enterprise Security',
      description: '99.999999999% durability and enterprise-grade security',
    },
  ]

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      // Mock test for now - in real implementation, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestResult('success')
    } catch (error) {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    // In real implementation, this would save to backend
    console.log('Saving GCS configuration:', config)
    onClose()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                color: state.lightMode ? '#000000' : '#ffffff',
                mb: 3,
              }}
            >
              WHY GOOGLE CLOUD STORAGE?
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      backgroundColor: state.lightMode ? '#f8f8f8' : '#1a1a1a',
                      border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                      borderRadius: 0,
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                      {benefit.icon}
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                            fontWeight: 600,
                            color: state.lightMode ? '#000000' : '#ffffff',
                          }}
                        >
                          {benefit.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                            color: state.lightMode ? '#666666' : '#888888',
                            fontSize: '0.8rem',
                          }}
                        >
                          {benefit.description}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </Box>

            <Alert
              severity="info"
              sx={{
                mt: 3,
                backgroundColor: state.lightMode ? '#e3f2fd' : '#0d47a1',
                color: state.lightMode ? '#0d47a1' : '#ffffff',
                borderRadius: 0,
                '& .MuiAlert-icon': {
                  color: state.lightMode ? '#0d47a1' : '#ffffff',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '0.8rem',
                }}
              >
                Current local storage is demo-only. Files are lost on server restart.
                Enable GCS for permanent, scalable storage.
              </Typography>
            </Alert>
          </Box>
        )

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                color: state.lightMode ? '#000000' : '#ffffff',
                mb: 2,
              }}
            >
              CREATE GOOGLE CLOUD PROJECT
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>1.</span>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Link
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                        color: '#4285f4',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Go to Google Cloud Console <Launch sx={{ fontSize: '0.8rem', ml: 0.5 }} />
                    </Link>
                  }
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>2.</span>
                </ListItemIcon>
                <ListItemText
                  primary="Click 'Create Project'"
                  secondary="Enter project name: made-infinite-music"
                  primaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  }}
                  secondaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>3.</span>
                </ListItemIcon>
                <ListItemText
                  primary="Enable Cloud Storage API"
                  secondary="Go to APIs & Services > Library > Search 'Cloud Storage'"
                  primaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  }}
                  secondaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>4.</span>
                </ListItemIcon>
                <ListItemText
                  primary="Create Storage Bucket"
                  secondary="Cloud Storage > Buckets > Create Bucket"
                  primaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  }}
                  secondaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItem>
            </List>

            <TextField
              label="Project ID"
              fullWidth
              value={config.projectId}
              onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
              placeholder="made-infinite-music"
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  backgroundColor: state.lightMode ? '#ffffff' : '#000000',
                  color: state.lightMode ? '#000000' : '#ffffff',
                  borderRadius: 0,
                },
                '& .MuiInputLabel-root': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: state.lightMode ? '#666666' : '#888888',
                },
              }}
            />

            <TextField
              label="Bucket Name"
              fullWidth
              value={config.bucketName}
              onChange={(e) => setConfig({ ...config, bucketName: e.target.value })}
              placeholder="made-infinite-music-bucket"
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  backgroundColor: state.lightMode ? '#ffffff' : '#000000',
                  color: state.lightMode ? '#000000' : '#ffffff',
                  borderRadius: 0,
                },
                '& .MuiInputLabel-root': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: state.lightMode ? '#666666' : '#888888',
                },
              }}
            />
          </Box>
        )

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                color: state.lightMode ? '#000000' : '#ffffff',
                mb: 2,
              }}
            >
              SERVICE ACCOUNT SETUP
            </Typography>

            <Alert
              severity="warning"
              sx={{
                mb: 2,
                backgroundColor: state.lightMode ? '#fff3e0' : '#e65100',
                color: state.lightMode ? '#e65100' : '#ffffff',
                borderRadius: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '0.8rem',
                }}
              >
                Keep your service account key secure! Never share it publicly.
              </Typography>
            </Alert>

            <List>
              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>1.</span>
                </ListItemIcon>
                <ListItemText
                  primary="Go to IAM & Admin > Service Accounts"
                  secondary="Create Service Account"
                  primaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  }}
                  secondaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>2.</span>
                </ListItemIcon>
                <ListItemText
                  primary="Add Role: Storage Admin"
                  secondary="This allows the app to read/write to your bucket"
                  primaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  }}
                  secondaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <span style={{ fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 'bold' }}>3.</span>
                </ListItemIcon>
                <ListItemText
                  primary="Generate JSON Key"
                  secondary="Keys tab > Add Key > Create New Key > JSON"
                  primaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  }}
                  secondaryTypographyProps={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItem>
            </List>

            <TextField
              label="Service Account Key (JSON)"
              multiline
              rows={4}
              fullWidth
              value={config.credentials}
              onChange={(e) => setConfig({ ...config, credentials: e.target.value })}
              placeholder='{"type": "service_account", "project_id": "..."}'
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  backgroundColor: state.lightMode ? '#ffffff' : '#000000',
                  color: state.lightMode ? '#000000' : '#ffffff',
                  borderRadius: 0,
                  fontSize: '0.8rem',
                },
                '& .MuiInputLabel-root': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: state.lightMode ? '#666666' : '#888888',
                },
              }}
            />
          </Box>
        )

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                color: state.lightMode ? '#000000' : '#ffffff',
                mb: 2,
              }}
            >
              ENVIRONMENT CONFIGURATION
            </Typography>

            <Card
              sx={{
                backgroundColor: state.lightMode ? '#f8f8f8' : '#1a1a1a',
                border: `1px solid ${state.lightMode ? '#e0e0e0' : '#333333'}`,
                borderRadius: 0,
                mb: 2,
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                    mb: 1,
                  }}
                >
                  Add to your .env file:
                </Typography>
                <Box
                  sx={{
                    backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                    color: state.lightMode ? '#00ff00' : '#000000',
                    p: 2,
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: '0.8rem',
                    position: 'relative',
                    overflow: 'auto',
                  }}
                >
                  <IconButton
                    onClick={() => copyToClipboard(`STORAGE_MODE=gcs
GOOGLE_CLOUD_PROJECT_ID=${config.projectId}
GCS_BUCKET_NAME=${config.bucketName}
GOOGLE_CLOUD_CREDENTIALS=${config.credentials}`)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: state.lightMode ? '#00ff00' : '#000000',
                    }}
                  >
                    <FileCopy sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                  <div>STORAGE_MODE=gcs</div>
                  <div>GOOGLE_CLOUD_PROJECT_ID={config.projectId || 'your-project-id'}</div>
                  <div>GCS_BUCKET_NAME={config.bucketName || 'your-bucket-name'}</div>
                  <div>GOOGLE_CLOUD_CREDENTIALS={config.credentials ? '{"type":"service_account",...}' : 'your-credentials-json'}</div>
                </Box>
              </CardContent>
            </Card>

            <FormControlLabel
              control={
                <Switch
                  checked={enableGCS}
                  onChange={(e) => setEnableGCS(e.target.checked)}
                />
              }
              label="Enable Google Cloud Storage"
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: state.lightMode ? '#000000' : '#ffffff',
                },
              }}
            />
          </Box>
        )

      case 4:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.1em',
                color: state.lightMode ? '#000000' : '#ffffff',
                mb: 2,
              }}
            >
              TEST CONNECTION
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={handleTest}
                disabled={testing || !config.projectId || !config.bucketName || !config.credentials}
                startIcon={testing ? <CircularProgress size={16} /> : <Refresh />}
                sx={{
                  fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                  letterSpacing: '0.1em',
                  borderColor: state.lightMode ? '#000000' : '#ffffff',
                  color: state.lightMode ? '#000000' : '#ffffff',
                  borderRadius: 0,
                  '&:hover': {
                    backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                    color: state.lightMode ? '#ffffff' : '#000000',
                  },
                }}
              >
                {testing ? 'TESTING...' : 'TEST CONNECTION'}
              </Button>

              {testResult && (
                <Chip
                  icon={testResult === 'success' ? <Check /> : <Error />}
                  label={testResult === 'success' ? 'CONNECTION SUCCESS' : 'CONNECTION FAILED'}
                  sx={{
                    backgroundColor: testResult === 'success' ? '#4caf50' : '#f44336',
                    color: '#ffffff',
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Box>

            {testing && (
              <LinearProgress
                sx={{
                  mb: 2,
                  backgroundColor: state.lightMode ? '#e0e0e0' : '#333333',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                  },
                }}
              />
            )}

            {testResult === 'success' && (
              <Alert
                severity="success"
                sx={{
                  backgroundColor: state.lightMode ? '#e8f5e8' : '#2e7d32',
                  color: state.lightMode ? '#2e7d32' : '#ffffff',
                  borderRadius: 0,
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: '0.8rem',
                  }}
                >
                  ✅ Google Cloud Storage configured successfully!
                  <br />
                  Your app can now store unlimited files up to 5TB each.
                </Typography>
              </Alert>
            )}

            {testResult === 'error' && (
              <Alert
                severity="error"
                sx={{
                  backgroundColor: state.lightMode ? '#ffebee' : '#d32f2f',
                  color: state.lightMode ? '#d32f2f' : '#ffffff',
                  borderRadius: 0,
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: '0.8rem',
                  }}
                >
                  ❌ Connection failed. Check your credentials and try again.
                </Typography>
              </Alert>
            )}
          </Box>
        )

      default:
        return null
    }
  }

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
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
          letterSpacing: '0.1em',
          color: state.lightMode ? '#000000' : '#ffffff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudUpload />
          GOOGLE CLOUD STORAGE SETUP
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: state.lightMode ? '#666666' : '#888888' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#000000' : '#ffffff',
                  },
                }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: state.lightMode ? '#666666' : '#888888',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  {step.description}
                </Typography>
                {getStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSave : handleNext}
                    disabled={
                      (index === 3 && (!config.projectId || !config.bucketName || !config.credentials)) ||
                      (index === 4 && testResult !== 'success')
                    }
                    sx={{
                      mr: 1,
                      backgroundColor: state.lightMode ? '#000000' : '#ffffff',
                      color: state.lightMode ? '#ffffff' : '#000000',
                      fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                      letterSpacing: '0.1em',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: state.lightMode ? '#333333' : '#cccccc',
                      },
                    }}
                  >
                    {index === steps.length - 1 ? 'SAVE & ACTIVATE' : 'NEXT'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{
                      fontFamily: 'Futura, -apple-system, BlinkMacSystemFont, sans-serif',
                      letterSpacing: '0.1em',
                      color: state.lightMode ? '#666666' : '#888888',
                    }}
                  >
                    BACK
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
    </Dialog>
  )
}

export default GoogleCloudSetup 