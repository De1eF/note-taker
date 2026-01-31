import React, { useState, useRef, useEffect } from 'react';
import { Box, Fab, CssBaseline, IconButton, Snackbar, Button, Alert } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Cookies from 'js-cookie'; // Import Cookies

// Components
import Sheet from './components/Sheet';
import ConnectionLayer from './components/ConnectionLayer';

// Logic Hook
import { useService } from './services/use-service';

function App() {
  const {
    sheets, mode, theme, snackbarOpen,
    handleUndoDelete, handleSnackbarClose, toggleColorMode,
    handleCreate, handleUpdate, handleDrag, handleDuplicate, handleDelete
  } = useService();

  // --- Zoom & Pan State (with Cookie Persistence) ---
  const [view, setView] = useState(() => {
    // Try to load saved view from cookies
    const savedView = Cookies.get('canvas_view');
    if (savedView) {
      try {
        return JSON.parse(savedView);
      } catch (e) {
        console.error("Failed to parse view cookie", e);
      }
    }
    // Default fallback
    return { x: 0, y: 0, scale: 1 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // --- Save View to Cookie ---
  useEffect(() => {
    // Save current view state to cookie (expires in 7 days)
    // We use a slight timeout or just direct set since cookies are fast enough for this freq
    // Ideally, debounce this if it causes lag, but for now direct set is okay for pan/zoom end.
    // Let's just save it.
    Cookies.set('canvas_view', JSON.stringify(view), { expires: 7 });
  }, [view]);

  // --- Zoom Handler (Mouse Wheel) ---
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

  // --- Pan Handlers ---
  const handleMouseDown = (e) => {
    // 1. Check if we clicked on a Sheet
    if (e.target.closest('.sheet-wrapper')) return;

    // 2. Check if we clicked a native UI element
    if (e.target.closest('button') || e.target.closest('.MuiInputBase-root')) return;

    // 3. Start Panning
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

  const handleMouseUp = () => {
    setIsPanning(false);
  };

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
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
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

        {/* Infinite Canvas Layer */}
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%', 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            backgroundImage: mode === 'light' 
              ? 'radial-gradient(#ccc 1px, transparent 1px)' 
              : 'radial-gradient(#444 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transition: isPanning ? 'none' : 'background-image 0.3s ease'
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

        {/* Undo Notification */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity="info" 
            sx={{ width: '100%' }}
            action={
              <Button color="inherit" size="small" onClick={handleUndoDelete}>
                UNDO
              </Button>
            }
          >
            Sheet deleted
          </Alert>
        </Snackbar>

      </Box>
    </ThemeProvider>
  );
}

export default App;
