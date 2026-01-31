import React, { useState } from 'react';
import { Box, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

export default function UserProfile({ user, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  if (!user) return null;

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1100 }}>
      <Tooltip title={user.name || "User"}>
        <Avatar 
          src={user.picture} 
          alt={user.name}
          onClick={handleClick}
          // --- THE FIX ---
          // Google images require this policy to load correctly on localhost
          imgProps={{ referrerPolicy: "no-referrer" }} 
          // ----------------
          sx={{ 
            width: 48, height: 48, cursor: 'pointer', 
            border: '2px solid white', boxShadow: 3,
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.1)' },
            bgcolor: 'secondary.main' // Fallback color if image fails
          }} 
        >
          {/* Fallback Initials if image fails */}
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </Avatar>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 150, mb: 1 } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle2" noWrap>{user.name}</Typography>
        </Box>
        <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
