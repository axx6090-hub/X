import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
Object.defineProperty(window, 'crypto', { value: { randomUUID: () => '12345678-1234-4123-8123-123456789abc' }, configurable: true });
window.scrollTo = () => {};
