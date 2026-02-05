import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Box, Paper, Typography } from '@mui/material';

export default function LoginScreen({ onSuccess }) {
  return (
    <Box 
      sx={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'text.primary',
        backgroundImage: 'radial-gradient(1200px 800px at 10% 10%, rgba(14, 74, 124, 0.55), transparent 60%), linear-gradient(135deg, #08192B 0%, #0B3B4F 45%, #0B5E58 100%)',
        backgroundAttachment: 'fixed',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(600px 300px at 80% 20%, rgba(59, 247, 191, 0.15), transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <Paper 
        elevation={6}
        sx={{ 
          p: 6, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          borderRadius: 4,
          textAlign: 'center',
          maxWidth: 460,
          width: '90vw',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255, 255, 255, 0.92)'
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, rgba(8, 25, 43, 0.9), rgba(11, 94, 88, 0.9))',
            boxShadow: '0 8px 22px rgba(0, 0, 0, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1,
            mb: 3
          }}
        >
          W
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#0b0b0b' }}>
          Webington
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: '#0b0b0b' }}>
          Welcome to Webington, your interconnected notes platform. Organize your ideas, link them with tags, and enjoy the feel of paper notes—simpler, faster, and securely synced in the cloud.
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
