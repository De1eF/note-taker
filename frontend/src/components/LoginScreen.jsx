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
          sx={{
            width: 112,
            height: 112,
            borderRadius: '50%',
            backgroundColor: '#2a2a2a',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            mb: 3
          }}
        >
          <Box
            component="img"
            src="/Webington2.png"
            alt="Webington"
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
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
      <Box
        component="img"
        src="/DeleF.png"
        alt="DeleF"
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: 28,
          height: 28,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}
      />
    </Box>
  );
}
