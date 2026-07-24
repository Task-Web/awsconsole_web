import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { reduceAwsState } from '../../../lib/aws-domain';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
export const StoreProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);
  const syncQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    fetch('/api/aws-console', { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error('Failed to load AWS console');
        return response.json();
      })
      .then(payload => setState(payload.console))
      .catch(error => console.error('Failed to load AWS console:', error))
      .finally(() => setLoading(false));
  }, []);

  const dispatch = useCallback((action) => {
    setState(previous => reduceAwsState(previous, action));
    syncQueue.current = syncQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch('/api/aws-console/actions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        if (!response.ok) throw new Error('Failed to save AWS console action');
      })
      .catch(error => console.error('Failed to sync AWS console:', error));
  }, []);

  const addFlash = useCallback((type, message) => {
    dispatch({ type: 'ADD_FLASH', payload: { type, message } });
  }, [dispatch]);

  if (loading || !state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: '"Amazon Ember", "Helvetica Neue", -apple-system, sans-serif', color: '#545B64' }}>
        Loading AWS Console...
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ state, dispatch, addFlash }}>
      {children}
    </StoreContext.Provider>
  );
};
