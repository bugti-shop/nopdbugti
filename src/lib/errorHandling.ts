import { z } from 'zod';

export const getUserFriendlyError = (error: any): string => {
  const message = error?.message || error?.toString() || 'An unknown error occurred';
  
  // Common Supabase auth errors
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('Password should be')) {
    return 'Password must be at least 8 characters with uppercase, lowercase, and a number.';
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  
  return message;
};

export const getValidationError = (error: z.ZodError): string => {
  const firstError = error.errors[0];
  return firstError?.message || 'Please check your input and try again.';
};
