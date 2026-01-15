import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import i18n from '@/i18n';

const HIDDEN_NOTES_PASSWORD_KEY = 'npd_hidden_notes_password';
const HIDDEN_NOTES_SALT_KEY = 'npd_hidden_notes_salt';
const HIDDEN_NOTES_USE_BIOMETRIC_KEY = 'npd_hidden_notes_use_biometric';
const SECURITY_QUESTION_KEY = 'npd_security_question';
const SECURITY_ANSWER_KEY = 'npd_security_answer';
const SECURITY_ANSWER_SALT_KEY = 'npd_security_answer_salt';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
}

// Check if biometric authentication is available
export const checkBiometricAvailability = async (): Promise<BiometricStatus> => {
  if (!Capacitor.isNativePlatform()) {
    return { isAvailable: false, biometryType: 'none' };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    let biometryType: 'fingerprint' | 'face' | 'iris' | 'none' = 'none';
    
    if (result.isAvailable) {
      switch (result.biometryType) {
        case BiometryType.FACE_ID:
        case BiometryType.FACE_AUTHENTICATION:
          biometryType = 'face';
          break;
        case BiometryType.FINGERPRINT:
        case BiometryType.TOUCH_ID:
          biometryType = 'fingerprint';
          break;
        case BiometryType.IRIS_AUTHENTICATION:
          biometryType = 'iris';
          break;
        default:
          biometryType = 'fingerprint';
      }
    }

    return { isAvailable: result.isAvailable, biometryType };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { isAvailable: false, biometryType: 'none' };
  }
};

// Authenticate using biometrics
export const authenticateWithBiometric = async (reason?: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const t = i18n.t.bind(i18n);
  const defaultReason = t('biometric.unlockProtectedContent');

  try {
    await NativeBiometric.verifyIdentity({
      reason: reason || defaultReason,
      title: t('biometric.authenticationRequired'),
      subtitle: t('biometric.verifyIdentity'),
      description: reason || defaultReason,
    });
    return true;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
};

// Generate a random salt for password hashing
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Convert ArrayBuffer to hex string
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

// Hash password using Web Crypto API with PBKDF2
// This is a secure, industry-standard key derivation function
const hashPasswordAsync = async (password: string, salt: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive bits using PBKDF2 with SHA-256
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return bufferToHex(derivedBits);
  } catch (error) {
    console.error('Error hashing password:', error);
    // Fallback to a simple hash if Web Crypto is not available (should be rare)
    return fallbackHash(password + salt);
  }
};

// Fallback hash for environments without Web Crypto API
const fallbackHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fallback_' + Math.abs(hash).toString(36);
};

// Synchronous hash for backward compatibility during migration
// Note: This is weaker but needed for immediate verification
export const hashPassword = (password: string): string => {
  // Check if there's an existing salt (new format)
  const existingSalt = localStorage.getItem(HIDDEN_NOTES_SALT_KEY);
  if (existingSalt) {
    // For sync verification, we need to use the async method
    // This function is kept for API compatibility but shouldn't be used for new hashes
    console.warn('hashPassword called with new salt format - use hashPasswordSecure instead');
  }
  
  // Legacy hash for backward compatibility
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + password.length.toString(36);
};

// Async secure password hashing
export const hashPasswordSecure = async (password: string, salt?: string): Promise<{ hash: string; salt: string }> => {
  const useSalt = salt || generateSalt();
  const hash = await hashPasswordAsync(password, useSalt);
  return { hash, salt: useSalt };
};

// Verify password (supports both legacy and new format)
export const verifyPassword = async (password: string, hashedPassword: string, salt?: string): Promise<boolean> => {
  if (salt) {
    // New secure format
    const { hash } = await hashPasswordSecure(password, salt);
    return hash === hashedPassword;
  }
  
  // Legacy format (backward compatibility)
  return hashPassword(password) === hashedPassword;
};

// Get hidden notes password settings
export const getHiddenNotesSettings = (): { hasPassword: boolean; useBiometric: boolean } => {
  const password = localStorage.getItem(HIDDEN_NOTES_PASSWORD_KEY);
  const useBiometric = localStorage.getItem(HIDDEN_NOTES_USE_BIOMETRIC_KEY) === 'true';
  return {
    hasPassword: !!password,
    useBiometric,
  };
};

// Set hidden notes password (async, secure)
export const setHiddenNotesPassword = async (password: string): Promise<void> => {
  const { hash, salt } = await hashPasswordSecure(password);
  localStorage.setItem(HIDDEN_NOTES_PASSWORD_KEY, hash);
  localStorage.setItem(HIDDEN_NOTES_SALT_KEY, salt);
};

// Verify hidden notes password (async, supports both formats)
export const verifyHiddenNotesPassword = async (password: string): Promise<boolean> => {
  const storedHash = localStorage.getItem(HIDDEN_NOTES_PASSWORD_KEY);
  const storedSalt = localStorage.getItem(HIDDEN_NOTES_SALT_KEY);
  
  if (!storedHash) return false;
  
  return verifyPassword(password, storedHash, storedSalt || undefined);
};

// Enable/disable biometric for hidden notes
export const setHiddenNotesBiometric = (enabled: boolean): void => {
  localStorage.setItem(HIDDEN_NOTES_USE_BIOMETRIC_KEY, enabled.toString());
};

// Clear hidden notes protection
export const clearHiddenNotesProtection = (): void => {
  localStorage.removeItem(HIDDEN_NOTES_PASSWORD_KEY);
  localStorage.removeItem(HIDDEN_NOTES_SALT_KEY);
  localStorage.removeItem(HIDDEN_NOTES_USE_BIOMETRIC_KEY);
};

// Security Question functions for password recovery
// Set security question and answer (async, secure)
export const setSecurityQuestion = async (question: string, answer: string): Promise<void> => {
  const normalized = answer.toLowerCase().trim();
  const { hash, salt } = await hashPasswordSecure(normalized);
  localStorage.setItem(SECURITY_QUESTION_KEY, question);
  localStorage.setItem(SECURITY_ANSWER_KEY, hash);
  localStorage.setItem(SECURITY_ANSWER_SALT_KEY, salt);
};

// Get security question
export const getSecurityQuestion = (): string | null => {
  return localStorage.getItem(SECURITY_QUESTION_KEY);
};

// Verify security answer (async)
export const verifySecurityAnswer = async (answer: string): Promise<boolean> => {
  const storedHash = localStorage.getItem(SECURITY_ANSWER_KEY);
  const storedSalt = localStorage.getItem(SECURITY_ANSWER_SALT_KEY);
  
  if (!storedHash) return false;
  
  const normalized = answer.toLowerCase().trim();
  return verifyPassword(normalized, storedHash, storedSalt || undefined);
};

// Check if security question is set up
export const hasSecurityQuestion = (): boolean => {
  return !!localStorage.getItem(SECURITY_QUESTION_KEY) && !!localStorage.getItem(SECURITY_ANSWER_KEY);
};

// Clear security question
export const clearSecurityQuestion = (): void => {
  localStorage.removeItem(SECURITY_QUESTION_KEY);
  localStorage.removeItem(SECURITY_ANSWER_KEY);
  localStorage.removeItem(SECURITY_ANSWER_SALT_KEY);
};

// Authenticate for hidden notes access
export const authenticateForHiddenNotes = async (password?: string): Promise<boolean> => {
  const settings = getHiddenNotesSettings();
  const t = i18n.t.bind(i18n);
  
  // If no protection is set, allow access
  if (!settings.hasPassword && !settings.useBiometric) {
    return true;
  }

  // Try biometric first if enabled
  if (settings.useBiometric) {
    const biometricResult = await authenticateWithBiometric(t('biometric.accessHiddenNotes'));
    if (biometricResult) return true;
  }

  // Fall back to password
  if (password && settings.hasPassword) {
    return verifyHiddenNotesPassword(password);
  }

  return false;
};

// Per-note protection
export interface NoteProtection {
  hasPassword: boolean;
  useBiometric: boolean;
}

const getNoteProtectionKey = (noteId: string) => `npd_note_protection_${noteId}`;
const getNotePasswordKey = (noteId: string) => `npd_note_password_${noteId}`;
const getNoteSaltKey = (noteId: string) => `npd_note_salt_${noteId}`;

export const getNoteProtection = (noteId: string): NoteProtection => {
  const data = localStorage.getItem(getNoteProtectionKey(noteId));
  if (!data) return { hasPassword: false, useBiometric: false };
  try {
    return JSON.parse(data);
  } catch {
    return { hasPassword: false, useBiometric: false };
  }
};

export const setNoteProtection = async (noteId: string, protection: NoteProtection, password?: string): Promise<void> => {
  localStorage.setItem(getNoteProtectionKey(noteId), JSON.stringify(protection));
  if (password) {
    const { hash, salt } = await hashPasswordSecure(password);
    localStorage.setItem(getNotePasswordKey(noteId), hash);
    localStorage.setItem(getNoteSaltKey(noteId), salt);
  } else if (!protection.hasPassword) {
    localStorage.removeItem(getNotePasswordKey(noteId));
    localStorage.removeItem(getNoteSaltKey(noteId));
  }
};

export const verifyNotePassword = async (noteId: string, password: string): Promise<boolean> => {
  const storedHash = localStorage.getItem(getNotePasswordKey(noteId));
  const storedSalt = localStorage.getItem(getNoteSaltKey(noteId));
  
  if (!storedHash) return false;
  
  return verifyPassword(password, storedHash, storedSalt || undefined);
};

export const authenticateForNote = async (noteId: string, password?: string): Promise<boolean> => {
  const protection = getNoteProtection(noteId);
  const t = i18n.t.bind(i18n);
  
  if (!protection.hasPassword && !protection.useBiometric) {
    return true;
  }

  if (protection.useBiometric) {
    const biometricResult = await authenticateWithBiometric(t('biometric.unlockProtectedNote'));
    if (biometricResult) return true;
  }

  if (password && protection.hasPassword) {
    return verifyNotePassword(noteId, password);
  }

  return false;
};

export const removeNoteProtection = (noteId: string): void => {
  localStorage.removeItem(getNoteProtectionKey(noteId));
  localStorage.removeItem(getNotePasswordKey(noteId));
  localStorage.removeItem(getNoteSaltKey(noteId));
};
