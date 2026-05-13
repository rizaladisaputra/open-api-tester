import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export const convertApi = {
  jsonToSwagger: (payload: unknown) => api.post('/api/convert/json-to-swagger', payload),
  swaggerToJson: (payload: unknown) => api.post('/api/convert/swagger-to-json', payload),
};

export const validateApi = {
  validate: (spec: string) => api.post('/api/validate', { spec }),
};

export const formatApi = {
  format: (content: string, type: 'json' | 'yaml') => api.post('/api/format', { content, type }),
};
