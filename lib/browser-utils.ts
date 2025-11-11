/**
 * Browser identification utilities
 */

/**
 * Generate a browser-specific ID based on user agent and screen properties
 * This ID should remain consistent for the same browser on the same device
 */
export function getBrowserId(): string {
  if (typeof window === "undefined") {
    return "server-side";
  }

  // Check if we already have a browser ID stored
  const storedId = localStorage.getItem("browser-id");
  if (storedId) {
    return storedId;
  }

  // Generate a new browser ID based on browser characteristics
  const userAgent = navigator.userAgent || "";
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const colorDepth = window.screen.colorDepth || 0;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const language = navigator.language || "";
  
  // Create a fingerprint string
  const fingerprint = `${userAgent}-${screenResolution}-${colorDepth}-${timezone}-${language}`;
  
  // Generate a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create a unique ID with timestamp for extra uniqueness
  const browserId = `browser-${Math.abs(hash)}-${Date.now()}`;
  
  // Store it for consistent use
  localStorage.setItem("browser-id", browserId);
  
  return browserId;
}
