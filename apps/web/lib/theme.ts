// Aplica un color principal personalizado sobre el tema (variable CSS --primary)
// y calcula un color de texto contrastante para --primary-foreground, de modo
// que los botones sigan siendo legibles con cualquier color elegido.
// El color se guarda aparte del seed del gimnasio para que el tema lima por
// defecto se mantenga hasta que un admin lo personalice explícitamente.

export const THEME_COLOR_KEY = 'theme_primary_color';

function contrastForeground(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#141311';
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // Luminancia relativa aproximada (sRGB).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#141311' : '#f3f1ea';
}

export function applyPrimaryColor(hex: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--primary', hex);
  root.style.setProperty('--primary-foreground', contrastForeground(hex));
}

export function persistPrimaryColor(hex: string): void {
  try {
    window.localStorage.setItem(THEME_COLOR_KEY, hex);
  } catch {
    // no-op
  }
}

export function loadPrimaryColor(): string | null {
  try {
    return window.localStorage.getItem(THEME_COLOR_KEY);
  } catch {
    return null;
  }
}
