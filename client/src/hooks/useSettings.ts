import { useCallback, useState } from 'react';
import type { Settings, ConfirmationPolicy } from '../lib/types';
import {
  fetchSettings,
  updateSettings as apiUpdateSettings,
  fetchConfirmationPolicies,
  updateConfirmationPolicy as apiUpdateConfirmationPolicy,
} from '../lib/api';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [policies, setPolicies] = useState<ConfirmationPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, policiesData] = await Promise.all([
        fetchSettings(),
        fetchConfirmationPolicies(),
      ]);
      setSettings(settingsData);
      setPolicies(policiesData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    try {
      const updated = await apiUpdateSettings(newSettings);
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }, []);

  const updateConfirmationPolicy = useCallback(async (policy: ConfirmationPolicy) => {
    try {
      const updated = await apiUpdateConfirmationPolicy(policy);
      setPolicies((prev) =>
        prev.some((p) => p.tool_name === updated.tool_name)
          ? prev.map((p) => (p.tool_name === updated.tool_name ? updated : p))
          : [...prev, updated],
      );
    } catch (err) {
      console.error('Failed to update confirmation policy:', err);
    }
  }, []);

  return {
    settings,
    policies,
    loading,
    loadSettings,
    updateSettings,
    updateConfirmationPolicy,
  };
}
