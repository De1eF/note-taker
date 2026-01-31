import React from 'react';
import { Box, Fab, CssBaseline, IconButton } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

// Components
import Sheet from './components/Sheet';
import ConnectionLayer from './components/ConnectionLayer';

// Logic Hook
import { useService } from './services/use-service';

function App() {
  // Extract logic from the custom hook
  const {
    sheets,
    mode,
    theme,
    toggleColorMode,
    handleCreate,
    handleUpdate,
    handleDrag,
    handleDuplicate,
    handleDelete
  } = useService();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          width: '100vw', 
          height: '100vh', 
          bgcolor: 'background.default', 
          overflow: 'auto',   
          position: 'relative',
          color: 'text.primary'
        }}
      >
        {/* Create Button */}
        <Fab 
          color="primary" 
          aria-label="add"
          sx={{ position: 'fixed', top: 20, left: 20, zIndex: 1000 }}
          onClick={handleCreate}
        >
          <AddIcon />
        </Fab>

        {/* Theme Toggle */}
        <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: '50%', boxShadow: 3 }}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
        </Box>

        {/* Infinite Canvas */}
        <Box 
          sx={{ 
            width: '3000px', 
            height: '3000px', 
            position: 'relative',
            backgroundImage: mode === 'light' 
              ? 'radial-gradient(#ccc 1px, transparent 1px)' 
              : 'radial-gradient(#444 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transition: 'background-image 0.3s ease'
          }}
        >
          <ConnectionLayer sheets={sheets} />
          
          {sheets.map(sheet => (
            <Sheet
              key={sheet._id}
              data={sheet}
              onUpdate={handleUpdate}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onDrag={handleDrag}
            />
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
