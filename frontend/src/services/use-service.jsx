import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export function useService() {
  const [sheets, setSheets] = useState([]);
  const [mode, setMode] = useState('light'); // 'light' | 'dark'

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

  // --- API / Data Logic ---
  
  const fetchSheets = async () => {
    try {
      const res = await axios.get(`${API_URL}/sheets/`);
      setSheets(res.data);
    } catch (err) {
      console.error("Error fetching sheets:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSheets();
  }, []);

  const handleCreate = async () => {
    const startX = 50 + Math.random() * 50;
    const startY = 50 + Math.random() * 50;

    const newSheet = {
      title: "Untitled Note",
      content: "Type #idea to connect...",
      positionInSpace: { x: startX, y: startY },
      connections: []
    };
    
    // Create then refresh
    await axios.post(`${API_URL}/sheets/`, newSheet);
    fetchSheets();
  };

  const handleUpdate = async (id, data) => {
    // Optimistic Update
    setSheets(prev => prev.map(s => s._id === id ? { ...s, ...data } : s));
    
    // API Call
    await axios.patch(`${API_URL}/sheets/${id}`, data);
    
    // Conditional Refresh for connections
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
  };

  // Return everything the UI needs
  return {
    sheets,
    mode,
    theme,
    toggleColorMode,
    handleCreate,
    handleUpdate,
    handleDrag,
    handleDuplicate,
    handleDelete
  };
}
