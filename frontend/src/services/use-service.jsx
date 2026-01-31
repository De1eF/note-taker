import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import axios from 'axios';
import Cookies from 'js-cookie'; // Import cookie library

const API_URL = 'http://localhost:8000';

export function useService() {
  const [sheets, setSheets] = useState([]);
  
  // --- Theme State with Cookie Persistence ---
  const [mode, setMode] = useState(() => {
    // Check cookie on initial load. Default to 'light' if missing.
    return Cookies.get('app_theme') || 'light';
  });

  // Save to cookie whenever mode changes (expires in 365 days)
  useEffect(() => {
    Cookies.set('app_theme', mode, { expires: 365 });
  }, [mode]);

  // --- Undo / Snackbar State ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastDeletedId, setLastDeletedId] = useState(null);

  // --- Theme Logic ---
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                background: { default: '#eef2f5', paper: '#ffffff' },
                primary: { main: '#1976d2' },
              }
            : {
                background: { default: '#121212', paper: '#1e1e1e' },
                primary: { main: '#90caf9' },
              }),
        },
      }),
    [mode]
  );

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // --- API Logic ---
  const fetchSheets = async () => {
    try {
      const res = await axios.get(`${API_URL}/sheets/`);
      setSheets(res.data);
    } catch (err) {
      console.error("Error fetching sheets:", err);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const handleCreate = async () => {
    const startX = 50 + Math.random() * 50;
    const startY = 50 + Math.random() * 50;

    const newSheet = {
      title: "Untitled Sheet",
      content: "Type ~idea to connect...",
      positionInSpace: { x: startX, y: startY },
      connections: []
    };
    
    await axios.post(`${API_URL}/sheets/`, newSheet);
    fetchSheets();
  };

  const handleUpdate = async (id, data) => {
    setSheets(prev => prev.map(s => s._id === id ? { ...s, ...data } : s));
    await axios.patch(`${API_URL}/sheets/${id}`, data);
    if (data.content) {
       setTimeout(fetchSheets, 100); 
    }
  };

  const handleDrag = async (id, pos) => {
    setSheets(prev => prev.map(s => s._id === id ? { ...s, positionInSpace: pos } : s));
    await axios.patch(`${API_URL}/sheets/${id}`, { positionInSpace: pos });
  };

  const handleDuplicate = async (id) => {
    await axios.post(`${API_URL}/sheets/${id}/duplicate`);
    fetchSheets(); 
  };

  const handleDelete = async (id) => {
    setSheets(prev => prev.filter(s => s._id !== id));
    await axios.delete(`${API_URL}/sheets/${id}`);
    setLastDeletedId(id);
    setSnackbarOpen(true);
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedId) return;
    await axios.patch(`${API_URL}/sheets/${lastDeletedId}`, { is_deleted: false });
    await fetchSheets();
    setSnackbarOpen(false);
    setLastDeletedId(null);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  return {
    sheets,
    mode,
    theme,
    snackbarOpen,
    handleUndoDelete,
    handleSnackbarClose,
    toggleColorMode,
    handleCreate,
    handleUpdate,
    handleDrag,
    handleDuplicate,
    handleDelete
  };
}
