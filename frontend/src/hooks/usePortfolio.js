import { useState, useCallback, useRef, useEffect } from 'react';
import { startPortfolioRun, getPortfolioStatus } from '../api/portfolio';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 2000;
const MAX_POLLS = 90;

export function usePortfolio() {
  const [status, setStatus] = useState('idle');
  const [runId, setRunId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);
  const abortRef = useRef(false);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (id) => {
    if (abortRef.current) return;

    try {
      const data = await getPortfolioStatus(id);
      pollCountRef.current += 1;
      setPollCount(pollCountRef.current);

      if (data.status === 'completed') {
        setResult(data);
        setStatus('completed');
        stopPolling();
        toast.success('Portfolio constructed successfully!');
        return;
      }

      if (data.status === 'failed' || data.status === 'error') {
        setError(data.error || data.message || 'Portfolio construction failed.');
        setStatus('error');
        stopPolling();
        toast.error('Portfolio construction failed.');
        return;
      }

      if (pollCountRef.current >= MAX_POLLS) {
        setError('Request timed out. Please try again.');
        setStatus('error');
        stopPolling();
        toast.error('Request timed out.');
        return;
      }

      pollRef.current = setTimeout(() => pollStatus(id), POLL_INTERVAL);
    } catch (err) {
      if (pollCountRef.current < MAX_POLLS) {
        pollRef.current = setTimeout(() => pollStatus(id), POLL_INTERVAL);
      } else {
        setError(err.response?.data?.detail || err.message || 'Polling failed.');
        setStatus('error');
        stopPolling();
      }
    }
  }, [stopPolling]);

  const runAgent = useCallback(async (params) => {
    abortRef.current = false;
    pollCountRef.current = 0;
    setStatus('loading');
    setError(null);
    setResult(null);
    setPollCount(0);
    stopPolling();

    try {
      const data = await startPortfolioRun(params);
      if (!data.run_id) throw new Error('No run_id received from API.');

      setRunId(data.run_id);
      setStatus('polling');
      toast('AI Agent initiated...', { icon: '🤖' });

      pollRef.current = setTimeout(() => pollStatus(data.run_id), POLL_INTERVAL);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to start agent.';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
      setStatus('error');
      toast.error('Failed to start agent.');
    }
  }, [stopPolling, pollStatus]);

  const reset = useCallback(() => {
    abortRef.current = true;
    stopPolling();
    setStatus('idle');
    setRunId(null);
    setResult(null);
    setError(null);
    setPollCount(0);
    pollCountRef.current = 0;
  }, [stopPolling]);

  useEffect(() => {
    return () => { abortRef.current = true; stopPolling(); };
  }, [stopPolling]);

  return { status, runId, result, error, pollCount, runAgent, reset };
}
