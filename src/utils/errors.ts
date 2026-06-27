export function getFriendlyErrorMessage(err: any): string {
  if (!err) return "An unknown error occurred. Please try again.";

  const message = err.message || "";
  const code = err.code || "";

  // Firebase Authentication & Authorization errors
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return "Invalid email address or password. Please verify your credentials and try again.";
  }
  if (code.includes('auth/email-already-in-use')) {
    return "This email address is already registered. Please sign in instead.";
  }
  if (code.includes('auth/weak-password')) {
    return "Your password is too weak. Please use a minimum of 6 characters containing letters and numbers.";
  }
  if (code.includes('auth/invalid-email')) {
    return "Please enter a valid email address.";
  }
  if (code.includes('auth/too-many-requests')) {
    return "This account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.";
  }
  if (code.includes('auth/network-request-failed') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return "Network connection issue detected. Please check your internet connectivity and try again.";
  }
  if (code.includes('permission-denied') || message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return "Access Denied: You do not have sufficient permissions to perform this action.";
  }
  if (code.includes('quota-exceeded')) {
    return "The server is currently experiencing high traffic and has hit resource limits. Please retry in a few minutes.";
  }

  // Format and strip any Firebase code wrappers for other errors
  if (message.includes('FirebaseError:') || message.includes('gRPC') || message.includes('Error:')) {
    return message
      .replace(/FirebaseError:\s*/gi, '')
      .replace(/Error:\s*/gi, '')
      .replace(/\[.*?\]/g, '') // remove brackets like [code=permission-denied]
      .trim();
  }

  return message || "An unexpected error occurred. Please try again.";
}
