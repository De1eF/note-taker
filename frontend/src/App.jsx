import React, { useState, useRef, useEffect } from 'react';
import { Box, Fab, CssBaseline, IconButton } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import Sheet from './components/Sheet';
import ConnectionLayer from './components/ConnectionLayer';
import SpaceManager from './components/SpaceManager';
import LoginScreen from './components/LoginScreen';
import UserProfile from './components/UserProfile';
import { useService } from './services/use-service';
import { extractTags } from './components/sheet-parts/sheet-utils';


// --- SUB-COMPONENT: The Main Authenticated Interface ---
// This component is only rendered when logged in, so its hooks run safely.
function MainCanvas({ service }) {
  const {
    // Data & Actions from service
    theme, toggleColorMode, mode,
    spaces, currentSpace, createSpace, switchSpace, deleteSpace,
    sheets, handleCreate, handleUpdate, handleDelete, handleDuplicate, handleDrag,
    handleViewChange, user, handleLogout
  } = service;

  // --- CANVAS LOCAL STATE ---
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const loadedSpaceId = useRef(null);
  const [hoveredTag, setHoveredTag] = useState(null);
    const [isHoveringSheet, setIsHoveringSheet] = useState(false);

  const tagConnections = React.useMemo(() => {

  if (!sheets?.length) return {};

  const map = {};

  sheets.forEach(sheet => {
    extractTags(sheet.content).forEach(tag => {
      if (!map[tag]) map[tag] = new Set();
    });
  });

  sheets.forEach(sheet => {
    const tags = extractTags(sheet.content);
    tags.forEach(tag => {
      sheets.forEach(other => {
        if (other._id !== sheet._id) {
          const otherTags = extractTags(other.content);
          if (otherTags.includes(tag)) {
            map[tag].add(other.title || 'Untitled');
          }
        }
      });
    });
  });

  Object.keys(map).forEach(k => map[k] = [...map[k]]);

  return map;
}, [sheets]);


useEffect(() => {
    // If no space or same space as before, do nothing
    if (!currentSpace || currentSpace._id === loadedSpaceId.current) return;

    // New space detected! Update local view
    loadedSpaceId.current = currentSpace._id;
    
    if (currentSpace.view_state) {
        setView(currentSpace.view_state);
    }
  }, [currentSpace?._id]);

  // Sync View to Backend (Debounced Save)
    useEffect(() => {
    if (currentSpace) {
        // Send updates to backend, but this won't trigger the LOAD effect
        // because the ID hasn't changed.
        handleViewChange(view);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // --- MOUSE HANDLERS ---
  const handleWheel = (e) => {
    if (e.ctrlKey) e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(view.scale * (1 + scaleAmount), 0.1), 5);
    
    // Zoom towards mouse pointer
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleRatio = newScale / view.scale;
    const newX = mouseX - (mouseX - view.x) * scaleRatio;
    const newY = mouseY - (mouseY - view.y) * scaleRatio;
    
    setView({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setView(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e) => {
    if (isHoveringSheet) return;

    if (
      e.target.closest('button') ||
      e.target.closest('.MuiInputBase-root')
    ) return;

  setIsPanning(true);
  lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
            width: '100vw', height: '100vh', bgcolor: 'background.default', 
            overflow: 'hidden', position: 'relative', cursor: isPanning ? 'grabbing' : 'grab',
            backgroundImage: mode === 'light' ? 'radial-gradient(#ccc 1px, transparent 1px)' : 'radial-gradient(#444 1px, transparent 1px)',
            backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        ref={containerRef}
      >
        <Fab color="primary" sx={{ position: 'fixed', top: 20, left: 20, zIndex: 1000 }} onClick={handleCreate}>
          <AddIcon />
        </Fab>

        <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: '50%', boxShadow: 3 }}>
             <IconButton onClick={toggleColorMode} color="inherit">
               {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
             </IconButton>
          </Box>
        </Box>

        <SpaceManager 
            spaces={spaces}
            currentSpace={currentSpace}
            onSwitch={switchSpace}
            onCreate={createSpace}
            onDelete={deleteSpace}
        />

        <UserProfile user={user} onLogout={handleLogout} />

        <Box sx={{ width: '100%', height: '100%', transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', position: 'absolute' }}>
          <ConnectionLayer
          sheets={sheets}
          hoveredTag={hoveredTag}
        />

        {sheets.map(sheet => (
          <Sheet
            key={sheet._id}
            data={sheet}
            scale={view.scale}
            tagConnections={tagConnections}
            setHoveredTag={setHoveredTag}
            onUpdate={handleUpdate}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onDrag={handleDrag}

            onMouseEnter={() => setIsHoveringSheet(true)}
            onMouseLeave={() => setIsHoveringSheet(false)}
          />
        ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

// ... imports

// --- MAIN APP COMPONENT ---
function App() {
  const serviceHook = useService();

  // Memoize the service object to prevent MainCanvas from re-rendering
  // on every minor hook update.
  const service = React.useMemo(() => serviceHook, [
    serviceHook.user, 
    serviceHook.currentSpace, 
    serviceHook.sheets,
    serviceHook.mode,
    serviceHook.isLoggedIn,
    // Add stable functions if needed, but excluding unstable ones helps performance
  ]);

  if (!serviceHook.isLoggedIn) {
    return (
        <ThemeProvider theme={serviceHook.theme}>
            <CssBaseline />
            <LoginScreen onSuccess={serviceHook.handleGoogleLoginSuccess} />
        </ThemeProvider>
    );
  }

  // FIX: Pass the 'service' variable, not 'serviceHook'
  return <MainCanvas service={service} />;
}

export default App;
