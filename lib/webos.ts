/**
 * webOS Browser Keep-Awake Utilities
 * 
 * This module provides webOS-specific functionality to keep the display awake
 * on LG TVs and other webOS devices running the webOS browser.
 * 
 * Features:
 * - Detects webOS browser environment
 * - Initiates webOS activity to prevent screensaver
 * - Manages power state for continuous display
 */

/**
 * Check if running on webOS browser
 */
export const isWebOSBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /webOS|hpwOS/.test(navigator.userAgent);
};

/**
 * Request webOS activity to keep display awake
 * Uses Luna Service to communicate with webOS system services
 */
export const requestWebOSActivity = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const webOS = (window as any).webOS;
      
      if (!webOS || !webOS.service) {
        console.log('⚠️ webOS service API not available');
        resolve(false);
        return;
      }

      // Request activity to prevent screensaver
      webOS.service.request('luna://com.palm.powermanager/', {
        method: 'activityStart',
        parameters: {
          id: 'slideshow-display-app',
          reason: 'Displaying slideshow content on TV',
        },
        onSuccess: (response: any) => {
          console.log('✅ webOS activity started successfully');
          resolve(true);
        },
        onFailure: (error: any) => {
          console.log('⚠️ webOS activity start failed:', error);
          resolve(false);
        },
      });
    } catch (error) {
      console.log('⚠️ Error requesting webOS activity:', error);
      resolve(false);
    }
  });
};

/**
 * Stop webOS activity (should be called on cleanup)
 */
export const stopWebOSActivity = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const webOS = (window as any).webOS;
      
      if (!webOS || !webOS.service) {
        resolve(false);
        return;
      }

      webOS.service.request('luna://com.palm.powermanager/', {
        method: 'activityEnd',
        parameters: {
          id: 'slideshow-display-app',
        },
        onSuccess: () => {
          console.log('✅ webOS activity stopped');
          resolve(true);
        },
        onFailure: (error: any) => {
          console.log('⚠️ webOS activity stop failed:', error);
          resolve(false);
        },
      });
    } catch (error) {
      console.log('⚠️ Error stopping webOS activity:', error);
      resolve(false);
    }
  });
};

/**
 * Periodic webOS keep-alive trigger
 * Call this at intervals to maintain activity status
 */
export const triggerWebOSKeepAlive = (): void => {
  if (!isWebOSBrowser()) return;

  try {
    const webOS = (window as any).webOS;
    
    if (webOS && webOS.service) {
      // This triggers activity events on the system
      webOS.service.request('luna://com.palm.applicationmanager/', {
        method: 'getAppBasePath',
        parameters: {
          id: 'com.webos.app.browser',
        },
        onSuccess: () => {
          console.log('🔄 webOS keep-alive triggered');
        },
        onFailure: () => {
          // Silently fail
        },
      });
    }
  } catch (error) {
    // Silently ignore errors
  }
};

/**
 * Initialize webOS keep-awake system
 * Should be called once on app startup
 */
export const initializeWebOSKeepAwake = async (): Promise<void> => {
  if (!isWebOSBrowser()) {
    console.log('ℹ️ Not running on webOS browser');
    return;
  }

  console.log('📺 webOS browser detected - initializing keep-awake system');

  try {
    // Request initial activity
    const success = await requestWebOSActivity();
    
    if (success) {
      console.log('✅ webOS keep-awake initialized successfully');
    } else {
      console.log('⚠️ webOS keep-awake initialization partially failed, will retry');
    }

    // Set up periodic refresh
    const keepAliveInterval = setInterval(() => {
      triggerWebOSKeepAlive();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Store interval ID for cleanup if needed
    (window as any).__slideshowWebOSKeepAliveInterval = keepAliveInterval;
  } catch (error) {
    console.log('⚠️ Error initializing webOS keep-awake:', error);
  }
};

/**
 * Cleanup webOS resources
 * Should be called on app unmount or exit
 */
export const cleanupWebOS = async (): Promise<void> => {
  if (!isWebOSBrowser()) return;

  try {
    // Clear interval
    const interval = (window as any).__slideshowWebOSKeepAliveInterval;
    if (interval) {
      clearInterval(interval);
      delete (window as any).__slideshowWebOSKeepAliveInterval;
    }

    // Stop activity
    await stopWebOSActivity();
  } catch (error) {
    console.log('⚠️ Error during webOS cleanup:', error);
  }
};
