// apps/web/lib/analytics.ts

/**
 * Simple analytics wrapper. 
 * Can be extended to use Google Analytics, Mixpanel, etc.
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${eventName}`, params);
  }
  
  // Example: window.gtag?.('event', eventName, params);
}
