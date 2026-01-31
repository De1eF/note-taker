import React, { useState, useRef, useEffect } from 'react';
import { Box, Fab, CssBaseline, IconButton, Snackbar, Button, Alert } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Cookies from 'js-cookie';

import Sheet from './components/Sheet';
import ConnectionLayer from './components/ConnectionLayer';
import { useService } from './services/use-service';

function App() {
  const {
    sheets, mode, theme, snackbarOpen,
    handleUndoDelete, handleSnackbarClose, toggleColorMode,
    handleCreate, handleUpdate, handleDrag, handleDuplicate, handleDelete
  } = useService();

  const [view, setView] = useState(() => {
    const savedView = Cookies.get('canvas_view');
    if (savedView) {
      try { return JSON.parse(savedView); } catch (e) { console.error(e); }
    }
    return { x: 0, y: 0, scale: 1 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    Cookies.set('canvas_view', JSON.stringify(view), { expires: 7 });
  }, [view]);

  const handleWheel = (e) => {
    if (e.ctrlKey) e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(view.scale * (1 + scaleAmount), 0.1), 5);
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleRatio = newScale / view.scale;
    const newX = mouseX - (mouseX - view.x) * scaleRatio;
    const newY = mouseY - (mouseY - view.y) * scaleRatio;

    setView({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.sheet-wrapper') || e.target.closest('button') || e.target.closest('.MuiInputBase-root')) return;
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setView(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          width: '100vw', 
          height: '100vh', 
          bgcolor: 'background.default', 
          overflow: 'hidden', 
          position: 'relative',
          color: 'text.primary',
          cursor: isPanning ? 'grabbing' : 'grab',
          
          // --- INFINITE GRID BACKGROUND ---
          // We apply the background to the static container, but move it using backgroundPosition
          backgroundImage: mode === 'light' 
            ? 'radial-gradient(#ccc 1px, transparent 1px)' 
            : 'radial-gradient(#444 1px, transparent 1px)',
          // Scale the dots with the zoom level
          backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
          // Move the grid with the pan x/y
          backgroundPosition: `${view.x}px ${view.y}px`,
          transition: isPanning ? 'none' : 'background-size 0.2s', 
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
      >
        <Fab 
          color="primary" aria-label="add"
          sx={{ position: 'fixed', top: 20, left: 20, zIndex: 1000 }}
          onClick={handleCreate}
        >
          <AddIcon />
        </Fab>

        <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: '50%', boxShadow: 3 }}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
        </Box>

        {/* --- Content Layer --- */}
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%', 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
          }}
        >
          <ConnectionLayer sheets={sheets} />
          
          {sheets.map(sheet => (
            <Sheet
              key={sheet._id}
              data={sheet}
              scale={view.scale}
              onUpdate={handleUpdate}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onDrag={handleDrag}
            />
          ))}
        </Box>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={handleSnackbarClose} severity="info" sx={{ width: '100%' }}
            action={<Button color="inherit" size="small" onClick={handleUndoDelete}>UNDO</Button>}
          >
            Sheet deleted
          </Alert>
        </Snackbar>

      </Box>
    </ThemeProvider>
  );
}

export default App;
