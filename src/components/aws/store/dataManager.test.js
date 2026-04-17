import { beforeEach, describe, expect, it } from 'vitest';
import { buildStateUrl, getSessionId } from './dataManager';

describe('aws dataManager', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
    document.cookie = 'user_id=; Max-Age=0; Path=/';
  });

  it('builds api state urls with cookie overrides', () => {
    expect(buildStateUrl()).toBe('/api/state');
    expect(buildStateUrl('aws-user-7')).toBe('/api/state?cookie=aws-user-7');
  });

  it('accepts the cookie query parameter as a session id alias', () => {
    window.history.replaceState({}, '', '/ec2?cookie=aws-user-7');

    expect(getSessionId()).toBe('aws-user-7');
    expect(sessionStorage.getItem('mock_sid')).toBe('aws-user-7');
  });

  it('falls back to the current browser cookie', () => {
    document.cookie = 'user_id=ops-admin; Path=/';

    expect(getSessionId()).toBe('ops-admin');
    expect(sessionStorage.getItem('mock_sid')).toBe('ops-admin');
  });

  it('uses session storage when neither query nor cookie is present', () => {
    sessionStorage.setItem('mock_sid', 'persisted-user');

    expect(getSessionId()).toBe('persisted-user');
  });
});
