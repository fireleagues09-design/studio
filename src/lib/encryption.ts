
/**
 * Simple demonstration of end-to-end encryption concepts.
 * In a real production app, use the Web Crypto API or a library like 'crypto-js' 
 * with proper key management.
 */

const SECRET_KEY = "FIRELEAGUES_CHAT_SECURE_KEY_2026";

export function encryptMessage(text: string): string {
  if (!text) return "";
  const chars = text.split("");
  const keyChars = SECRET_KEY.split("");
  
  const encrypted = chars.map((char, i) => {
    const charCode = char.charCodeAt(0);
    const keyIndex = i % keyChars.length;
    const keyChar = keyChars[keyIndex].charCodeAt(0);
    return String.fromCharCode(charCode ^ keyChar);
  });

  return btoa(encrypted.join("")); // Base64 for storage
}

export function decryptMessage(encoded: string): string {
  if (!encoded) return "";
  try {
    const decoded = atob(encoded);
    const chars = decoded.split("");
    const keyChars = SECRET_KEY.split("");

    const decrypted = chars.map((char, i) => {
      const charCode = char.charCodeAt(0);
      const keyIndex = i % keyChars.length;
      const keyChar = keyChars[keyIndex].charCodeAt(0);
      return String.fromCharCode(charCode ^ keyChar);
    });

    return decrypted.join("");
  } catch (e) {
    console.error("Decryption failed", e);
    return "[Encrypted Message]";
  }
}
