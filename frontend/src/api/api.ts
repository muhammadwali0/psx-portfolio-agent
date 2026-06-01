/**
 * PSX Portfolio Agent — Axios API Client
 * Environment-aware base URL, error standardization.
 * Backend is LOCKED — no endpoint changes.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/** Standardized error extraction */
export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    if (data?.message) return data.message;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}



export default api;
