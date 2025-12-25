/**
 * Error handling utility for sanitizing error messages
 * In production, detailed errors are logged server-side only
 * Generic messages are returned to clients to prevent information disclosure
 */

/**
 * Sanitizes error messages for client display
 * In production, returns generic messages to prevent information disclosure
 * In development, returns detailed error messages for debugging
 */
export function sanitizeError(error: unknown): Error {
  const isProduction = import.meta.env.PROD;
  
  // Log detailed error server-side (console in production, but not exposed to user)
  if (error instanceof Error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  } else {
    console.error('Error details:', error);
  }
  
  // In production, return generic error messages
  if (isProduction) {
    // Check for common error types and return appropriate generic messages
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Authentication errors
      if (message.includes('auth') || message.includes('login') || message.includes('password')) {
        return new Error('Authentication failed. Please check your credentials.');
      }
      
      // Network errors
      if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
        return new Error('Network error. Please check your connection and try again.');
      }
      
      // Validation errors (safe to show)
      if (message.includes('invalid') || message.includes('required') || message.includes('must be')) {
        return error; // Validation errors are safe to show
      }
      
      // Rate limiting errors (safe to show)
      if (message.includes('too many') || message.includes('rate limit')) {
        return error; // Rate limit messages are safe to show
      }
      
      // Generic error
      return new Error('An error occurred. Please try again.');
    }
    
    // Unknown error type
    return new Error('An error occurred. Please try again.');
  }
  
  // In development, return detailed errors
  if (error instanceof Error) {
    return error;
  }
  
  return new Error(String(error));
}

/**
 * Creates a safe error message for API responses
 */
export function createSafeErrorMessage(error: unknown): string {
  const sanitized = sanitizeError(error);
  return sanitized.message;
}

