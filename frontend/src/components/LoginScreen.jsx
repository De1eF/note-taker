import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Box, Paper, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function LoginScreen({ onSuccess }) {
  return (
    <Box 
      sx={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
    >
      <Paper 
        elevation={6}
        sx={{ 
          p: 6, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          borderRadius: 4,
          textAlign: 'center',
          maxWidth: 400
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Webington
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sign in to access your personal spaces and sheets.
        </Typography>

        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => {
            console.log('Login Failed');
          }}
          useOneTap
          theme="filled_blue"
          size="large"
          shape="pill"
        />
      </Paper>
    </Box>
  );
}
