import { Platform } from 'react-native';

const COOKIE_NAME = 'malla_mata_session_v1';
const COOKIE_MAX_AGE_DAYS = 365; // 1 year session retention

/**
 * Read cookie value by name on Web
 */
export const getCookie = (name = COOKIE_NAME) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return null;
  }
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch (e) {
    console.warn('Error reading cookie:', e);
  }
  return null;
};

/**
 * Set persistent cookie on Web
 */
export const setCookie = (name = COOKIE_NAME, value, days = COOKIE_MAX_AGE_DAYS) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  try {
    const maxAge = days * 24 * 60 * 60;
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
  } catch (e) {
    console.warn('Error setting cookie:', e);
  }
};

/**
 * Remove cookie by name on Web
 */
export const deleteCookie = (name = COOKIE_NAME) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  try {
    document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  } catch (e) {
    console.warn('Error deleting cookie:', e);
  }
};

export const SESSION_COOKIE_KEY = COOKIE_NAME;
