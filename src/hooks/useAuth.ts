import { useState, useEffect } from 'react';
import { User } from '../types';
import config from '../config';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasTokenInUrl, setHasTokenInUrl] = useState(false);
  
  // Check for URL parameters on load (for Microsoft auth redirect)
  useEffect(() => {
    let isMounted = true; // flag למניעת race conditions
    
    const checkUrlParams = async () => {
      if (!isMounted) return; // אל תמשיך אם הקומפוננט לא mounted
      
      // Check for token in URL after Microsoft login redirect
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      
      if (tokenParam) {
        // יש טוקן ב-URL - עדכן את hasTokenInUrl
        setHasTokenInUrl(true);
        
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
            
            // עדכן את המשתמש גם אם הקומפוננט unmounted
            // זה בטוח כי זה רק state update
            setUser(userWithToken);
            
            // עדכן את הדגלים מיד אחרי עדכון המשתמש
            setIsInitializing(false);
            setHasTokenInUrl(false);
          } else {
            console.log('useAuth: Response not ok, status:', response.status);
          }
        } catch (error) {
          console.error('Error fetching user data with token:', error);
        } finally {
          // עדכן דגלים גם ב-finally כ-fallback
          if (isMounted) {
            setIsInitializing(false);
            setHasTokenInUrl(false);
          }
        }
      } else {
        // אם אין טוקן ב-URL, בדוק localStorage
        if (isMounted) {
          await checkStoredUser();
        }
      }
    };
    
    checkUrlParams();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // בדיקת משתמש שמור ב-localStorage ותוקף הטוקן
  const checkStoredUser = async () => {
    const savedUser = localStorage.getItem(config.localStorageKey);
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        
        // בדוק תוקף הטוקן מול השרת
        if (userData.token) {
          try {
            // הוסף timeout של 5 שניות לבדיקת השרת
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${config.apiBaseUrl}/user/`, {
              headers: {
                'Authorization': `Bearer ${userData.token}`
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              // הטוקן תקף, עדכן את נתוני המשתמש
              const freshUserData = await response.json();
              const userWithToken = {
                ...freshUserData,
                token: userData.token
              };
              
              saveUserToLocalStorage(userWithToken);
              setUser(userWithToken);
            } else {
              // הטוקן לא תקף, נקה את ה-localStorage
              localStorage.removeItem(config.localStorageKey);
              setUser(null);
            }
          } catch (error) {
            console.error('Error verifying token:', error);
            // במקרה של שגיאת רשת או timeout, נציג את המשתמש אבל עם אזהרה
            // רק אם זו שגיאת רשת ולא שגיאת אימות
            if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
              // שגיאת רשת - נציג את המשתמש השמור
              setUser(userData);
              console.warn('Could not verify token due to network error, using cached user data');
            } else {
              // שגיאה אחרת - נקה את ה-localStorage
              localStorage.removeItem(config.localStorageKey);
              setUser(null);
            }
          }
        } else {
          // אין טוקן, נקה את ה-localStorage
          localStorage.removeItem(config.localStorageKey);
          setUser(null);
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem(config.localStorageKey);
        setUser(null);
      }
    }
    
    setIsInitializing(false);
  };

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
    isInitializing,
    hasTokenInUrl,
    handleLogin, 
    handleLogout 
  };
}