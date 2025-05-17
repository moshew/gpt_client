// Configuration priority:
// 1. Runtime config (window.RUNTIME_CONFIG) - can be changed after build
// 2. Environment variables (VITE_*) - set during build time
// 3. Default fallback values

// Define the window interface with RUNTIME_CONFIG
declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
    };
  }
}

const getConfigValue = (key: string, defaultValue: string): string => {
  // Check runtime config first (for post-build configuration)
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG[key]) {
    return window.RUNTIME_CONFIG[key] as string;
  }
  
  // Then check environment variables (for build-time configuration)
  // For Vite, environment variables are prefixed with VITE_
  const envKey = `VITE_${key}`;
  if (import.meta.env && (import.meta.env as any)[envKey]) {
    return (import.meta.env as any)[envKey] as string;
  }
  
  // Finally, use default value
  return defaultValue;
};

// Configuration object
const config = {
  apiBaseUrl: getConfigValue('API_BASE_URL', 'https://hvr-card.co.il'),
  cookieName: 'user_data',
  cookieExpirationDays: 30,
  // Storage keys
  localStorageKey: 'code_analyzer_user',
  // Authentication endpoints
  msLoginEndpoint: '/auth/microsoft/login',
  msLogoutEndpoint: '/auth/logout',
  authStatusEndpoint: '/auth/status'
};

export default config;