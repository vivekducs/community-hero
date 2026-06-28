export function getFriendlyErrorMessage(err: any): string {
  if (!err) return "An unknown error occurred. Please try again.";

  // Handle string errors
  if (typeof err === 'string') {
    if (err.includes('Failed to fetch') || err.includes('NetworkError') || err.includes('Network request failed')) {
      return `Network connection issue: ${err}`;
    }
    return err;
  }

  // Extract the raw message from all possible error properties
  let rawMessage = "";
  if (err.message) {
    rawMessage = err.message;
  } else if (err.error && typeof err.error === 'string') {
    rawMessage = err.error;
  } else if (err.error?.message) {
    rawMessage = err.error.message;
  } else if (err.reason) {
    rawMessage = err.reason;
  } else if (err.description) {
    rawMessage = err.description;
  } else if (err.statusText) {
    rawMessage = err.statusText;
  } else if (typeof err.toString === 'function') {
    const str = err.toString();
    if (str !== '[object Object]') {
      rawMessage = str;
    }
  }

  const code = err.code || err.statusCode || "";
  let technicalDetail = "";
  if (code && rawMessage) {
    technicalDetail = ` [Code: ${code}] ${rawMessage}`;
  } else if (code) {
    technicalDetail = ` [Code: ${code}]`;
  } else if (rawMessage) {
    technicalDetail = ` ${rawMessage}`;
  }

  // Firebase Authentication & Authorization errors with embedded raw messages
  if (code && typeof code === 'string') {
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
      return `Invalid email address or password.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('auth/email-already-in-use')) {
      return `This email address is already registered.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('auth/weak-password')) {
      return `Your password is too weak.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('auth/invalid-email')) {
      return `Please enter a valid email address.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('auth/too-many-requests')) {
      return `This account has been temporarily disabled due to too many requests.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('auth/network-request-failed') || rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError') || rawMessage.includes('Network request failed')) {
      return `Network connection issue detected. Please check your connection.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('permission-denied') || rawMessage.includes('permission-denied') || rawMessage.includes('Missing or insufficient permissions')) {
      return `Access Denied: You do not have sufficient permissions.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
    if (code.includes('quota-exceeded')) {
      return `Quota exceeded: The server is experiencing high traffic.${technicalDetail ? ' Details:' + technicalDetail : ''}`;
    }
  }

  // Format and strip any Firebase/gRPC code wrappers for other errors but retain original message
  if (rawMessage.includes('FirebaseError:') || rawMessage.includes('gRPC') || rawMessage.includes('Error:')) {
    const cleaned = rawMessage
      .replace(/FirebaseError:\s*/gi, '')
      .replace(/Error:\s*/gi, '')
      .replace(/\[.*?\]/g, '') // remove brackets like [code=permission-denied]
      .trim();
    if (cleaned) return cleaned;
  }

  // Return rawMessage if we have it, otherwise look for code, otherwise standard fallback
  if (rawMessage) {
    return rawMessage;
  }
  if (code) {
    return `Error code: ${code}`;
  }

  try {
    const stringified = JSON.stringify(err);
    if (stringified && stringified !== '{}') {
      return `Error: ${stringified}`;
    }
  } catch (e) {
    // ignore
  }

  return "An unexpected error occurred. Please try again.";
}

import { toast } from 'react-hot-toast';

/**
 * Centrally processes any error, logs it appropriately, and alerts the user with a clean, high-level toast.
 */
export function handleError(err: any, context?: string): string {
  console.error(`[Error Service] Caught in context: ${context || 'Unknown'}`, err);
  const friendlyMessage = getFriendlyErrorMessage(err);
  
  // Show clean, user-friendly toast. Prevent spam by using a unique toast ID based on message content.
  const toastId = `err-${friendlyMessage.slice(0, 30).replace(/\s+/g, '-')}`;
  toast.error(friendlyMessage, { id: toastId });
  
  return friendlyMessage;
}

/**
 * Registers global listeners for unhandled errors and promise rejections
 * to automatically present clean user-facing toasts.
 */
export function registerGlobalErrorHandlers() {
  if (typeof window === 'undefined') return () => {};

  const handleGlobalError = (event: ErrorEvent) => {
    const errorObj = event.error || event.message;
    
    // Ignore benign Vite HMR / websocket errors
    if (typeof errorObj === 'string' && (errorObj.includes('vite') || errorObj.includes('websocket'))) {
      return;
    }
    if (errorObj?.message && (errorObj.message.includes('vite') || errorObj.message.includes('websocket'))) {
      return;
    }

    event.preventDefault();
    handleError(errorObj, 'Global Uncaught Exception');
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Ignore benign websocket or hot-reload connection errors
    const reason = event.reason;
    if (reason && (reason.message?.includes('vite') || reason.message?.includes('websocket'))) {
      return;
    }

    event.preventDefault();
    handleError(event.reason, 'Unhandled Promise Rejection');
  };

  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}
