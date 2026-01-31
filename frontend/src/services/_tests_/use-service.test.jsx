import { renderHook, act, waitFor } from '@testing-library/react';
// FIX: Adjusted import path to look one folder up
import { useService } from '../use-service';
import axios from 'axios';

// Mock Axios
jest.mock('axios');

describe('useService Hook', () => {
  
  // Clear mocks before every test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default state', async () => {
    // Mock the initial GET request
    axios.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useService());

    expect(result.current.mode).toBe('light');
    expect(result.current.sheets).toEqual([]);
    
    // Check if theme object exists
    expect(result.current.theme.palette.mode).toBe('light');
  });

  test('should fetch sheets on mount', async () => {
    const mockData = [{ _id: '1', title: 'Test Note', content: 'content' }];
    axios.get.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useService());

    // Wait for the async useEffect to finish
    await waitFor(() => {
      expect(result.current.sheets).toEqual(mockData);
    });

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test('should toggle color mode', () => {
    axios.get.mockResolvedValue({ data: [] });
    
    const { result } = renderHook(() => useService());

    expect(result.current.mode).toBe('light');

    act(() => {
      result.current.toggleColorMode();
    });

    expect(result.current.mode).toBe('dark');
    expect(result.current.theme.palette.mode).toBe('dark');
  });

  test('handleCreate should post data and refresh list', async () => {
    const initialData = [];
    const newData = [{ _id: 'new', title: 'Untitled Note', content: '...' }];
    
    axios.get
      .mockResolvedValueOnce({ data: initialData }) // Initial load
      .mockResolvedValueOnce({ data: newData });    // Refresh after create

    axios.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useService());

    // Trigger Create
    await act(async () => {
      await result.current.handleCreate();
    });

    expect(axios.post).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledTimes(2); 
    
    await waitFor(() => {
       expect(result.current.sheets).toEqual(newData);
    });
  });

  test('handleUpdate should call patch and update local state optimistically', async () => {
    const initialData = [{ _id: '1', title: 'Old Title', content: 'Old Content' }];
    axios.get.mockResolvedValue({ data: initialData });
    axios.patch.mockResolvedValue({});

    const { result } = renderHook(() => useService());

    await waitFor(() => expect(result.current.sheets).toHaveLength(1));

    // Trigger Update
    await act(async () => {
      await result.current.handleUpdate('1', { title: 'New Title' });
    });

    // Check Optimistic Update
    expect(result.current.sheets[0].title).toBe('New Title');
    
    // Check API call
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/sheets/1'), 
      { title: 'New Title' }
    );
  });

  test('handleDelete should call delete and remove from local state', async () => {
    const initialData = [
      { _id: '1', title: 'Keep Me' }, 
      { _id: '2', title: 'Delete Me' }
    ];
    axios.get.mockResolvedValue({ data: initialData });
    axios.delete.mockResolvedValue({});

    const { result } = renderHook(() => useService());

    await waitFor(() => expect(result.current.sheets).toHaveLength(2));

    await act(async () => {
      await result.current.handleDelete('2');
    });

    expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/sheets/2'));
    expect(result.current.sheets).toHaveLength(1);
    expect(result.current.sheets[0]._id).toBe('1');
  });
});