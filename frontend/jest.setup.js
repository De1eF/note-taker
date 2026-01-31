import '@testing-library/jest-dom';

// Polyfills for Node 18+ / JSDOM environment
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;