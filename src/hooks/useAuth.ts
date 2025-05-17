import { useState, useEffect } from 'react';
import { User } from '../types';
import config from '../config';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check for URL parameters on load (for Microsoft auth redirect)
  useEffect(() => {
    const checkUrlParams = async () => {
      // Check for token in URL after Microsoft login redirect
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      
      if (tokenParam) {
        // Remove the token parameter from URL (clean up)
        const newUrl = window.location.pathname + 
          (urlParams.toString() ? '?' + urlParams.toString().replace(/token=[^&]*(&|$)/, '') : '');
        window.history.replaceState({}, document.title, newUrl);
        try {
          // Use the token to get user info
          const response = await fetch(`${config.apiBaseUrl}/user/`, {
            headers: {
              'Authorization': `Bearer ${tokenParam}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();

            const userWithToken = {
              ...userData,
              token: tokenParam
            };
            
            saveUserToLocalStorage(userWithToken);
            setUser(userWithToken);
          }
        } catch (error) {
          console.error('Error fetching user data with token:', error);
        }
      }
    };
    
    checkUrlParams();
  }, []);

  // Check localstorage for saved user on load
  useEffect(() => {
    const savedUser = localStorage.getItem(config.localStorageKey);
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem(config.localStorageKey);
      }
    }
  }, []);


  const saveUserToLocalStorage = (userData: User) => {
    localStorage.setItem(config.localStorageKey, JSON.stringify(userData));
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    
    try {
      // Redirect to Microsoft login
      window.location.href = `${config.apiBaseUrl}${config.msLoginEndpoint}`;
      
      // The function doesn't actually return as the page navigates away
      // but we include this for proper typing
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setIsAuthenticating(false);
      throw error;
    }
  };

  const handleLogout = async (onLogoutCallback?: () => void) => {
    // Clear local storage
    localStorage.removeItem(config.localStorageKey);
    setUser(null);
    
    if (onLogoutCallback) {
      onLogoutCallback();
    }
  };

  return { 
    user, 
    isAuthenticating,
    handleLogin, 
    handleLogout 
  };
}