import { auth } from './firebaseConfig';

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Safe wrapper around native fetch
  try {
    const updatedInit = { ...(init || {}) };
    const headers = new Headers(updatedInit.headers || {});

    // 1. Try to get Firebase auth token if user is signed in
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${idToken}`);
      } catch (err) {
        console.warn('Could not retrieve Firebase ID token:', err);
      }
    } else {
      // 2. Fallback to localStorage token (for custom sessions/mock setups)
      const storedUser = localStorage.getItem('user_profile_active') || localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.token) {
            headers.set('Authorization', `Bearer ${parsed.token}`);
          }
        } catch (_) {}
      }
    }

    updatedInit.headers = headers;
    const response = await fetch(input, updatedInit);
    return response;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};
