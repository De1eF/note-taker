import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { jwtDecode } from 'jwt-decode'; // fixed import

const API_URL = import.meta.env.VITE_API_URL;

export const useService = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null); // { name, picture, sub }
  const [token, setToken] = useState(localStorage.getItem('session_token'));
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // --- AXIOS INSTANCE ---
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      withCredentials: true, // optional if you use cookies
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return instance;
  }, [token]);

  // --- LOGIN HANDLER ---
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const googleToken = credentialResponse.credential;

      // Decode locally for UI
      const decodedUser = jwtDecode(googleToken);
      setUser({
        name: decodedUser.name,
        picture: decodedUser.picture,
        id: decodedUser.sub,
      });

      // Send to backend for session token
      const res = await api.post('/auth/login', { token: googleToken });

      // Store Session Token
      if (!token)
      {
        setToken(res.data.access_token);
         localStorage.setItem('session_token', res.data.access_token);
      }
    } catch (error) {
      console.error('Login Failed', error);
      alert('Authentication failed. Please try again.');
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
  const getSavedThemeMode = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)theme-mode=([^;]+)/);
    if (!match) return null;
    const value = decodeURIComponent(match[1]);
    return value === 'dark' || value === 'light' ? value : null;
  };

  const [mode, setMode] = useState(() => {
    const saved = getSavedThemeMode();
    return saved ?? (prefersDarkMode ? 'dark' : 'light');
  });

  useEffect(() => {
    const saved = getSavedThemeMode();
    if (!saved) {
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, [prefersDarkMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `theme-mode=${encodeURIComponent(mode)}; expires=${expires}; path=/`;
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#1976d2' },
          secondary: { main: '#dc004e' },
          background: {
            default: mode === 'dark' ? '#121212' : '#f4f6f8',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [mode]
  );
  const toggleColorMode = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  // --- SPACE & SHEET STATE ---
  const [spaces, setSpaces] = useState([]);
  const [currentSpace, setCurrentSpace] = useState(null);
  const [sheets, setSheets] = useState([]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (token) {
      fetchSpaces();
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

  // Sync Sheets when active space changes
  const activeSpaceId = currentSpace?._id;
  useEffect(() => {
    if (activeSpaceId && token) fetchSheetsForSpace(activeSpaceId);
    else setSheets([]);
  }, [activeSpaceId, token]);

  // --- API ACTIONS ---
  const fetchSpaces = async () => {
    try {
      const res = await api.get('/spaces');
      const loadedSpaces = res.data;
      setSpaces(loadedSpaces);
      if (loadedSpaces.length > 0 && !currentSpace) setCurrentSpace(loadedSpaces[0]);
    } catch (e) {
      if (e.response?.status === 401) handleLogout();
    }
  };

  const createSpace = async (name) => {
    try {
      const res = await api.post('/spaces', { name, sheet_ids: [], view_state: { x: 0, y: 0, scale: 1 } });
      setSpaces((prev) => [...prev, res.data]);
      setCurrentSpace(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSpace = async (id) => {
    if (!window.confirm('Delete space?')) return;
    try {
      await api.put(`/spaces/${id}`, { is_deleted: true });
      const remaining = spaces.filter((s) => s._id !== id);
      setSpaces(remaining);
      if (currentSpace?._id === id) setCurrentSpace(remaining[0] || null);
    } catch (e) {
      console.error(e);
    }
  };

  const renameSpace = async (id, name) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    setSpaces((prev) => prev.map((s) => (s._id === id ? { ...s, name: trimmed } : s)));
    setCurrentSpace((prev) => (prev && prev._id === id ? { ...prev, name: trimmed } : prev));
    try {
      await api.put(`/spaces/${id}`, { name: trimmed });
    } catch (e) {
      console.error(e);
      fetchSpaces();
    }
  };

  const switchSpace = (space) => setCurrentSpace(space);

  const fetchSheetsForSpace = async (id) => {
    try {
      const res = await api.get(`/spaces/${id}/sheets`);
      setSheets(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    if (!currentSpace) return;
    try {
      const newSheet = {
        title: 'New Sheet',
        content: '',
        positionInSpace: {
          x: -currentSpace.view_state.x + window.innerWidth / 2 / currentSpace.view_state.scale - 160,
          y: -currentSpace.view_state.y + window.innerHeight / 2 / currentSpace.view_state.scale - 100,
        },
        width: 320,
      };
      const res = await api.post('/sheets', newSheet);
      const newIds = [...(currentSpace.sheet_ids || []), res.data._id];
      await api.put(`/spaces/${currentSpace._id}`, { sheet_ids: newIds });

      setSheets((prev) => [...prev, res.data]);
      setCurrentSpace((prev) => ({ ...prev, sheet_ids: newIds }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateHelpSheet = async () => {
    if (!currentSpace) return;
    try {
      const helpContent = [
        '# Styled Lines Help',
        '',
        '## Headers',
        'Use # Header1, ## Header2, ### Header3',
        '',
        '## Tags',
        'Use ~tag or ~tag:value inside any line',
        '',
        '## Links',
        'Type Example[http://example.com]',
        '',
        '## Bullet Lists',
        '- item',
        '-- nested item',
        '',
        'Tip: Use Tab to indent and Shift+Tab to outdent bullets.',
      ].join('\n');

      const newSheet = {
        title: 'Styled Lines Help',
        content: helpContent,
        positionInSpace: {
          x: -currentSpace.view_state.x + window.innerWidth / 2 / currentSpace.view_state.scale - 160,
          y: -currentSpace.view_state.y + window.innerHeight / 2 / currentSpace.view_state.scale - 100,
        },
        width: 360,
      };
      const res = await api.post('/sheets', newSheet);
      const newIds = [...(currentSpace.sheet_ids || []), res.data._id];
      await api.put(`/spaces/${currentSpace._id}`, { sheet_ids: newIds });

      setSheets((prev) => [...prev, res.data]);
      setCurrentSpace((prev) => ({ ...prev, sheet_ids: newIds }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (id, data) => {
    setSheets((prev) => prev.map((s) => (s._id === id ? { ...s, ...data } : s)));
    api.put(`/sheets/${id}`, data).catch(console.error);
  };

  const handleDrag = async (id, pos) => {
    setSheets((prev) => prev.map((s) => (s._id === id ? { ...s, positionInSpace: pos } : s)));
    await api.put(`/sheets/${id}`, { positionInSpace: pos });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete sheet?')) return;
    try {
      await api.put(`/sheets/${id}`, { is_deleted: true });
      const newIds = currentSpace.sheet_ids.filter((sid) => sid !== id);
      await api.put(`/spaces/${currentSpace._id}`, { sheet_ids: newIds });
      setSheets((prev) => prev.filter((s) => s._id !== id));
      setCurrentSpace((prev) => ({ ...prev, sheet_ids: newIds }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (id) => {
    const original = sheets.find((s) => s._id === id);
    if (!original || !currentSpace) return;

    try {
      const duplicateData = {
        title: `${original.title} (Copy)`,
        content: original.content,
        color: original.color,
        width: original.width,
        positionInSpace: { x: original.positionInSpace.x + 40, y: original.positionInSpace.y + 40 },
      };

      const res = await api.post('/sheets', duplicateData);
      const newSheet = res.data;
      const newIds = [...(currentSpace.sheet_ids || []), newSheet._id];
      await api.put(`/spaces/${currentSpace._id}`, { sheet_ids: newIds });

      setSheets((prev) => [...prev, newSheet]);
      setCurrentSpace((prev) => ({ ...prev, sheet_ids: newIds }));
    } catch (e) {
      console.error('Duplication failed:', e);
      alert('Could not duplicate sheet.');
    }
  };

  const debouncedSaveView = useCallback(
    debounce(async (sid, vs) => {
      try {
        await api.put(`/spaces/${sid}`, { view_state: vs });
      } catch (e) {}
    }, 1000),
    [api]
  );

  const handleViewChange = (vs) => {
    if (currentSpace) {
      setCurrentSpace((prev) => ({ ...prev, view_state: vs }));
      debouncedSaveView(currentSpace._id, vs);
    }
  };

  return {
    user,
    isLoggedIn: !!token,
    handleGoogleLoginSuccess,
    handleLogout,
    theme,
    mode,
    toggleColorMode,
    spaces,
    currentSpace,
    createSpace,
    switchSpace,
    deleteSpace,
    renameSpace,
    sheets,
    handleCreate,
    handleCreateHelpSheet,
    handleUpdate,
    handleDelete,
    handleDuplicate,
    handleDrag,
    handleViewChange,
  };
};
