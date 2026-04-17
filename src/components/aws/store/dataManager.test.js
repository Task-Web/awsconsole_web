import { beforeEach, describe, expect, it } from 'vitest';
import { buildStateUrl, initialKey, storageKey } from './dataManager';

describe('aws dataManager', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.cookie = 'user_id=; Max-Age=0; Path=/';
  });

  it('builds the cookie-scoped api state url without extra identity params', () => {
    expect(buildStateUrl()).toBe('/api/state');
  });

  it('uses a single local storage key for persisted state', () => {
    expect(storageKey()).toBe('aws_mock_state');
    expect(initialKey()).toBe('aws_mock_initialState');
  });
});
