/**
 * Bookmark Dial - Utility Functions
 *
 * Pure utility functions that don't depend on component state.
 */

/**
 * Normalize a URL, adding https:// if no protocol is provided.
 * Returns null if the input is not a valid URL.
 */
export function normalizeUrl(input) {
  try {
    const url = new URL(input);
    return url.href;
  } catch {
    try {
      const url = new URL(`https://${input}`);
      return url.href;
    } catch {
      return null;
    }
  }
}

/**
 * Extract hostname from a URL string, removing www. prefix.
 * Returns the original string if parsing fails.
 */
export function tryExtractHostname(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return urlString;
  }
}

/**
 * Derive initials from text (first 2 characters of first word, uppercased).
 */
export function deriveInitials(text) {
  if (!text) {
    return "•";
  }
  const firstWord = text.trim().split(/\s+/)[0];
  return firstWord.slice(0, 2).toUpperCase();
}

/**
 * Create a debounced version of a function.
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate a deterministic color palette based on input text.
 * Used for bookmark tile backgrounds when no favicon is available.
 */
export function generateDialPalette(input) {
  const text = (input || "").trim().toLowerCase();
  if (!text) {
    return {
      background: "linear-gradient(145deg, #fde68a, #fbbf24)",
      text: "rgba(15, 23, 42, 0.85)",
    };
  }

  let hueSeed = 0;
  let satSeed = 0;
  let lightSeed = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const weight = i + 1;
    hueSeed += code * weight;
    satSeed += code * (weight + 1.5);
    lightSeed += code * (weight + 2.5);
  }

  const baseHue = positiveModulo(hueSeed, 360);
  const hueSpread = positiveModulo(satSeed, 36) - 18;
  const accentHue = positiveModulo(baseHue + 24 + hueSpread, 360);

  const baseSaturation = 52 + (Math.abs(satSeed) % 30);
  const baseLightness = 42 + (Math.abs(lightSeed) % 20);
  const accentSaturation = Math.min(96, baseSaturation + 8);
  const accentLightness = Math.min(78, baseLightness + 12);

  const primary = `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`;
  const secondary = `hsl(${accentHue}, ${accentSaturation}%, ${accentLightness}%)`;
  const textColor = baseLightness > 54 ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.88)";

  return {
    background: `linear-gradient(140deg, ${primary}, ${secondary})`,
    text: textColor,
  };
}

/**
 * Positive modulo operation (handles negative numbers correctly).
 */
export function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

/**
 * Check if a file is a supported image type and within size limits.
 */
export function isSupportedImage(file, maxBytes = 10 * 1024 * 1024) {
  const validTypes = ["image/jpeg", "image/png"];
  return validTypes.includes(file.type) && file.size <= maxBytes;
}

/**
 * Convert a file to a data URL.
 */
export function fileToDataUrl(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error("File exceeds size limit"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if two arrays are equal (shallow comparison).
 */
export function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

/**
 * Check if two sets are equal.
 */
export function setsEqual(a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

/**
 * Convert a Blob to an object URL for efficient display.
 * Object URLs are much more memory-efficient than data URLs.
 */
export function blobToObjectUrl(blob) {
  if (!blob) return "";
  return URL.createObjectURL(blob);
}
