import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';

export function usePredictiveInsights() {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getDashboardInsights();
      setInsights(data);
    } catch (err: any) {
      console.error("Failed to load predictive insights:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerInsights = async () => {
    try {
      setLoading(true);
      const freshInsights = await ApiService.triggerInsights();
      setInsights(freshInsights);
    } catch (err: any) {
      console.error("Failed to trigger predictive insights:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return { insights, loading, triggerInsights, reloadInsights: fetchInsights, error };
}
