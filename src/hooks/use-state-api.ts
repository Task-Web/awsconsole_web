"use client";

import { useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { StateResponse, InfoResponse, FileMetadata, StateMeta } from "@/lib/types";

export interface UseStateApiOptions {
  onError?: (error: Error) => void;
}

export interface UseStateApiReturn {
  // State
  state: StateResponse | null;
  info: InfoResponse | null;
  loading: boolean;
  error: Error | null;

  // Computed
  userId: string;

  // Actions
  refreshState: () => Promise<void>;
  refreshInfo: () => Promise<void>;
  replaceState: (
    data: Record<string, unknown>,
    note?: string,
    meta?: Partial<StateMeta>
  ) => Promise<StateResponse | null>;
  patchState: (
    data: Record<string, unknown>,
    note?: string
  ) => Promise<StateResponse | null>;
  resetState: () => Promise<StateResponse | null>;
  uploadFiles: (files: File[]) => Promise<FileMetadata[] | null>;
  clearError: () => void;
}

export function useStateApi(options: UseStateApiOptions = {}): UseStateApiReturn {
  const { onError } = options;
  const [state, setState] = useState<StateResponse | null>(null);
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback(
    (err: Error) => {
      console.error(err);
      setError(err);
      onError?.(err);
    },
    [onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await api.getState();
      setState(next);
    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const refreshInfo = useCallback(async () => {
    try {
      const details = await api.getInfo();
      setInfo(details);
    } catch (err) {
      handleError(err as Error);
    }
  }, [handleError]);

  const replaceState = useCallback(
    async (
      data: Record<string, unknown>,
      note?: string,
      meta?: Partial<StateMeta>
    ): Promise<StateResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        const next = await api.replaceState({ data, note, meta });
        setState(next);
        return next;
      } catch (err) {
        handleError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const patchState = useCallback(
    async (
      data: Record<string, unknown>,
      note?: string
    ): Promise<StateResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        const next = await api.patchState({ data, note });
        setState(next);
        return next;
      } catch (err) {
        handleError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const resetState = useCallback(async (): Promise<StateResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      const next = await api.resetState();
      setState(next);
      return next;
    } catch (err) {
      handleError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<FileMetadata[] | null> => {
      try {
        setLoading(true);
        setError(null);
        const uploaded = await api.uploadFiles(files);
        return uploaded;
      } catch (err) {
        handleError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  return {
    state,
    info,
    loading,
    error,
    userId: state?.user_id || "pending cookie",
    refreshState,
    refreshInfo,
    replaceState,
    patchState,
    resetState,
    uploadFiles,
    clearError,
  };
}

export { ApiError };
