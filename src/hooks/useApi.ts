import { useState } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useApi = <T>() => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const call = async (
    url: string,
    options?: RequestInit,
  ): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options?.headers as Record<string, string>) || {}),
      };

      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Lỗi ${res.status}`);
      }

      const data = await res.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Lỗi không xác định";
      setState((prev) => ({ ...prev, error, loading: false }));
      return null;
    }
  };

  return { ...state, call };
};
