/** Read iOS safe-area insets (set via CSS custom properties in style.css). */
export function getSafeInsets(): { top: number; bottom: number; left: number; right: number } {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const style = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
  return {
    top: px('--sat'),
    right: px('--sar'),
    bottom: px('--sab'),
    left: px('--sal'),
  };
}
