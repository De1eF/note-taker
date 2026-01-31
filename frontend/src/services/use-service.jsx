import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { jwtDecode } from "jwt-decode"; // Fix import

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useService = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null); // { name, picture, sub }
  const [token, setToken] = useState(localStorage.getItem('session_token'));
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // --- AXIOS CONFIGURATION ---
  // Apply token to every request
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('session_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('session_token');
    }
  }, [token]);

  // --- LOGIN HANDLER ---
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const googleToken = credentialResponse.credential;
      
      // 1. Decode locally for UI (Name, Picture)
      const decodedUser = jwtDecode(googleToken);
      setUser({
        name: decodedUser.name,
        picture: decodedUser.picture,
        id: decodedUser.sub
      });

      // 2. Send to Backend to get Session Token
      const res = await axios.post(`${API_URL}/auth/login`, { token: googleToken });
      
      // 3. Store Session Token
      setToken(res.data.access_token);
      
    } catch (error) {
      console.error("Login Failed", error);
      alert("Authentication failed. Please try again.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSpaces([]);
    setCurrentSpace(null);
    setSheets([]);
  };

  // --- THEME STATE ---
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light');
  useEffect(() => { setMode(prefersDarkMode ? 'dark' : 'light'); }, [prefersDarkMode]);

  const theme = useMemo(() => createTheme({
        palette: {
          mode,
          primary: { main: '#1976d2' },
          secondary: { main: '#dc004e' },
          background: {
            default: mode === 'dark' ? '#121212' : '#f4f6f8',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      }), [mode]);
  const toggleColorMode = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  // --- SPACE & SHEET STATE ---
  const [spaces, setSpaces] = useState([]);
  const [currentSpace, setCurrentSpace] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // --- INITIAL LOAD (Only if Token Exists) ---
  useEffect(() => {
    if (token) {
      fetchSpaces();
      // If we have a token but no user info (e.g. refresh), we might want to decode token or fetch profile
      // For now, we assume re-login is fine or we persist user info in localStorage too
      const storedUser = localStorage.getItem('user_info');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
    setIsAuthChecking(false);
  }, [token]);

  // Persist User Info
  useEffect(() => {
    if (user) localStorage.setItem('user_info', JSON.stringify(user));
    else localStorage.removeItem('user_info');
  }, [user]);

  // Sync Sheets
    const activeSpaceId = currentSpace ? currentSpace._id : null;

  useEffect(() => {
    if (activeSpaceId && token) {
      fetchSheetsForSpace(activeSpaceId);
    } else {
      setSheets([]);
    }
  }, [activeSpaceId, token]);

  // --- API ACTIONS (Wrapped in try/catch for 401 handling) ---
  const fetchSpaces = async () => {
    try {
      const res = await axios.get(`${API_URL}/spaces`);
      const loadedSpaces = res.data;
      setSpaces(loadedSpaces);
      if (loadedSpaces.length > 0 && !currentSpace) setCurrentSpace(loadedSpaces[0]);
    } catch (e) {
      if (e.response && e.response.status === 401) handleLogout();
    }
  };

  // ... (Keep existing createSpace, deleteSpace, switchSpace, fetchSheetsForSpace logic) ...
  // ... (Ensure error handling calls handleLogout() on 401) ...
  
  const createSpace = async (name) => {
      try {
          const res = await axios.post(`${API_URL}/spaces`, { name, sheet_ids: [], view_state: {x:0,y:0,scale:1} });
          setSpaces(prev => [...prev, res.data]);
          setCurrentSpace(res.data);
      } catch (e) { console.error(e); }
  };
  
  const deleteSpace = async (id) => {
      if(!window.confirm("Delete space?")) return;
      try {
          await axios.put(`${API_URL}/spaces/${id}`, {is_deleted:true});
          const remaining = spaces.filter(s => s._id !== id);
          setSpaces(remaining);
          if(currentSpace?._id === id) setCurrentSpace(remaining[0] || null);
      } catch(e) { console.error(e); }
  };

  const switchSpace = (space) => setCurrentSpace(space);
  
  const fetchSheetsForSpace = async (id) => {
      try {
          const res = await axios.get(`${API_URL}/spaces/${id}/sheets`);
          setSheets(res.data);
      } catch(e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!currentSpace) return;
    try {
      const newSheet = {
        title: "New Sheet",
        content: "Sample Content",
        positionInSpace: { 
            x: -currentSpace.view_state.x + (window.innerWidth / 2 / currentSpace.view_state.scale) - 160, 
            y: -currentSpace.view_state.y + (window.innerHeight / 2 / currentSpace.view_state.scale) - 100
        },
        width: 320
      };
      const res = await axios.post(`${API_URL}/sheets`, newSheet);
      // Update Space
      const newIds = [...(currentSpace.sheet_ids || []), res.data._id];
      await axios.put(`${API_URL}/spaces/${currentSpace._id}`, { sheet_ids: newIds });
      
      setSheets(prev => [...prev, res.data]);
      setCurrentSpace(prev => ({...prev, sheet_ids: newIds}));
    } catch (e) { console.error(e); }
  };

  // ... (Keep handleUpdate, handleDelete, handleDuplicate, handleDrag, handleViewChange) ...
  const handleUpdate = async (id, data) => {
      setSheets(prev => prev.map(s => s._id===id ? {...s, ...data} : s));
      axios.put(`${API_URL}/sheets/${id}`, data).catch(console.error);
  };
  
  const handleDrag = async (id, pos) => {
      setSheets(prev => prev.map(s => s._id===id ? {...s, positionInSpace: pos} : s));
      await axios.put(`${API_URL}/sheets/${id}`, {positionInSpace: pos});
  };
  
  const handleDelete = async (id) => {
      if(!window.confirm("Delete sheet?")) return;
      try {
          await axios.put(`${API_URL}/sheets/${id}`, {is_deleted:true});
          const newIds = currentSpace.sheet_ids.filter(sid => sid !== id);
          await axios.put(`${API_URL}/spaces/${currentSpace._id}`, {sheet_ids: newIds});
          setSheets(prev => prev.filter(s => s._id !== id));
          setCurrentSpace(prev => ({...prev, sheet_ids: newIds}));
      } catch(e) { console.error(e); }
  };
  
  const handleDuplicate = async (id) => {
  };

  const debouncedSaveView = useCallback(debounce(async (sid, vs) => {
      try { await axios.put(`${API_URL}/spaces/${sid}`, {view_state: vs}); } catch(e){}
  }, 1000), []);

  const handleViewChange = (vs) => {
      if(currentSpace) {
          setCurrentSpace(prev => ({...prev, view_state: vs}));
          debouncedSaveView(currentSpace._id, vs);
      }
  };

  return {
    user, // Auth User
    isLoggedIn: !!token,
    handleGoogleLoginSuccess,
    handleLogout,
    theme, mode, toggleColorMode,
    spaces, currentSpace, createSpace, switchSpace, deleteSpace,
    sheets, handleCreate, handleUpdate, handleDelete, handleDuplicate, handleDrag, handleViewChange
  };
};