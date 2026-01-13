// Simple XOR-based encryption for note content
// This provides obfuscation for hidden notes

const ENCRYPTION_KEY_PREFIX = 'npd_enc_';

// Generate a random encryption key
const generateKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

// Get or create encryption key for a note
export const getEncryptionKey = (noteId: string): string => {
  const storedKey = localStorage.getItem(`${ENCRYPTION_KEY_PREFIX}${noteId}`);
  if (storedKey) return storedKey;
  
  const newKey = generateKey();
  localStorage.setItem(`${ENCRYPTION_KEY_PREFIX}${noteId}`, newKey);
  return newKey;
};

// XOR encrypt/decrypt (same operation for both)
const xorCrypt = (text: string, key: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

// Encrypt note content
export const encryptContent = (content: string, noteId: string): string => {
  const key = getEncryptionKey(noteId);
  const encrypted = xorCrypt(content, key);
  // Base64 encode for safe storage
  return btoa(unescape(encodeURIComponent(encrypted)));
};

// Decrypt note content
export const decryptContent = (encryptedContent: string, noteId: string): string => {
  try {
    const key = getEncryptionKey(noteId);
    const decoded = decodeURIComponent(escape(atob(encryptedContent)));
    return xorCrypt(decoded, key);
  } catch {
    // If decryption fails, return original (might be unencrypted)
    return encryptedContent;
  }
};

// Check if content appears to be encrypted (base64)
export const isEncrypted = (content: string): boolean => {
  try {
    atob(content);
    return content.length > 0 && /^[A-Za-z0-9+/=]+$/.test(content);
  } catch {
    return false;
  }
};

// Remove encryption key when note is unhidden
export const removeEncryptionKey = (noteId: string): void => {
  localStorage.removeItem(`${ENCRYPTION_KEY_PREFIX}${noteId}`);
};
