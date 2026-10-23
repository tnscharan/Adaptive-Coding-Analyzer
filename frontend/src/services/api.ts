import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
