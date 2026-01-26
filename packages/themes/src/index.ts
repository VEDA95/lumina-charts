/**
 * Lumina Charts Themes
 *
 * Pre-built themes for Lumina Charts
 */

// Classic Light Theme
export {
  CLASSIC_LIGHT_COLORS_HEX,
  CLASSIC_LIGHT_COLORS_RGBA,
  CLASSIC_LIGHT_THEME_COLORS,
  CLASSIC_LIGHT_THEME_STYLES,
  CLASSIC_LIGHT_THEME,
} from './themes/classic-light.js';

// Classic Dark Theme
export {
  CLASSIC_DARK_COLORS_HEX,
  CLASSIC_DARK_COLORS_RGBA,
  CLASSIC_DARK_THEME_COLORS,
  CLASSIC_DARK_THEME_STYLES,
  CLASSIC_DARK_THEME,
} from './themes/classic-dark.js';

// Vibrant Theme
export {
  VIBRANT_COLORS_HEX,
  VIBRANT_COLORS_RGBA,
  VIBRANT_THEME_COLORS,
  VIBRANT_THEME_STYLES,
  VIBRANT_THEME,
} from './themes/vibrant.js';

// High Contrast Theme
export {
  HIGH_CONTRAST_COLORS_HEX,
  HIGH_CONTRAST_COLORS_RGBA,
  HIGH_CONTRAST_THEME_COLORS,
  HIGH_CONTRAST_THEME_STYLES,
  HIGH_CONTRAST_THEME,
} from './themes/high-contrast.js';

// Utilities
export { hexToRGBA, rgbaToHex, hexArrayToRGBA } from './utils.js';
export type { RGBAColor } from './utils.js';

// Types
export type { Theme, ThemeColors, ThemeStyles } from './types.js';

// Re-import for themes map
import { CLASSIC_LIGHT_THEME } from './themes/classic-light.js';
import { CLASSIC_DARK_THEME } from './themes/classic-dark.js';
import { VIBRANT_THEME } from './themes/vibrant.js';
import { HIGH_CONTRAST_THEME } from './themes/high-contrast.js';

/**
 * All available themes as a convenient map
 */
export const themes = {
  classicLight: CLASSIC_LIGHT_THEME,
  classicDark: CLASSIC_DARK_THEME,
  vibrant: VIBRANT_THEME,
  highContrast: HIGH_CONTRAST_THEME,
} as const;
