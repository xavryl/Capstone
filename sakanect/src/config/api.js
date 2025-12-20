// Check if we are running locally or on a public link
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If local, use localhost. If public (DevTunnel), use your specific Tunnel URL.
export const API_URL = isLocal 
  ? 'http://localhost:5000' 
  : 'https://k3p5770c-5000.asse.devtunnels.ms';