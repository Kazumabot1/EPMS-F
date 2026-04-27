import { useCallback, useState } from 'react';

export const useAsyncState = <T,>(initialValue: T) => {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <R,>(request: () => Promise<R>): Promise<R> => {
    setLoading(true);
    setError(null);
    try {
      return await request();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error occurred.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    setData,
    loading,
    error,
    setError,
    execute,
  };
};
