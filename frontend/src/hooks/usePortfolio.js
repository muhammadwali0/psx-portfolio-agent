import { useState, useCallback, useRef, useEffect } from 'react';
import { startPortfolioRun, getPortfolioStatus, getSSEStreamUrl } from '../api/portfolio';
import toast from 'react-hot-toast';

const SSE_TIMEOUT_MS = 180_000; // 3 minute hard timeout

export function usePortfolio() {
  const [status, setStatus] = useState('idle');        // idle | loading | streaming | completed | error
  const [runId, setRunId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progressMessages, setProgressMessages] = useState([]);   // live SSE messages
  const eventSourceRef = useRef(null);
  const abortRef = useRef(false);
  const timeoutRef = useRef(null);

  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Opens an EventSource to the SSE endpoint and listens for live progress.
   * When "COMPLETE" is received, fetches the final result via GET.
   */
  const connectSSE = useCallback((id) => {
    if (abortRef.current) return;

    const url = getSSEStreamUrl(id);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    // Hard timeout — if SSE stream never completes
    timeoutRef.current = setTimeout(() => {
      closeSSE();
      setError('Request timed out. Please try again.');
      setStatus('error');
      toast.error('Request timed out.');
    }, SSE_TIMEOUT_MS);

    es.onmessage = async (event) => {
      const msg = event.data;

      if (msg === 'COMPLETE') {
        closeSSE();
        try {
          const data = await getPortfolioStatus(id);
          setResult(data);
          setStatus('completed');
          toast.success('Portfolio constructed successfully!');
        } catch (err) {
          setError('Failed to fetch results.');
          setStatus('error');
          toast.error('Failed to fetch final results.');
        }
        return;
      }

      if (msg.startsWith('FAILED:')) {
        closeSSE();
        const failMsg = msg.replace(/^FAILED:\s*/, '');
        setError(failMsg || 'Portfolio construction failed.');
        setStatus('error');
        toast.error('Portfolio construction failed.');
        return;
      }

      // Regular progress message
      setProgressMessages((prev) => [...prev, msg]);
    };

    es.onerror = () => {
      // EventSource reconnects automatically on transient errors.
      // If the connection is truly dead, the timeout will catch it.
    };
  }, [closeSSE]);

  const runAgent = useCallback(async (params) => {
    abortRef.current = false;
    setStatus('loading');
    setError(null);
    setResult(null);
    setProgressMessages([]);
    closeSSE();

    try {
      const data = await startPortfolioRun(params);
      if (!data.run_id) throw new Error('No run_id received from API.');

      setRunId(data.run_id);
      setStatus('streaming');
      toast('AI Agent initiated...', { icon: '🤖' });

      connectSSE(data.run_id);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to start agent.';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
      setStatus('error');
      toast.error('Failed to start agent.');
    }
  }, [closeSSE, connectSSE]);

  const reset = useCallback(() => {
    abortRef.current = true;
    closeSSE();
    setStatus('idle');
    setRunId(null);
    setResult(null);
    setError(null);
    setProgressMessages([]);
  }, [closeSSE]);

  useEffect(() => {
    return () => { abortRef.current = true; closeSSE(); };
  }, [closeSSE]);

  return { status, runId, result, error, progressMessages, runAgent, reset };
}
