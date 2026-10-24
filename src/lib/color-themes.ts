export const COLOR_THEMES = [
  "griddo",
  "neumorphism",
  "claymorphism",
  "retro-mac",
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number];

export const DEFAULT_COLOR_THEME: ColorThemeId = "griddo";

export const COLOR_THEME_PERSISTENCE_KEY = "griddo-color-theme";

export function isValidColorTheme(value: unknown): value is ColorThemeId {
  return (COLOR_THEMES as ReadonlyArray<unknown>).includes(value);
}

export function validateColorTheme(value: unknown): ColorThemeId {
  return isValidColorTheme(value) ? value : DEFAULT_COLOR_THEME;
}

// Inline script for the document head: sets data-color-theme from the persisted
// plain theme-id string before React hydrates, preventing a flash of the default theme.
export function buildNoFlashScript(): string {
  return `(function(){var V=${JSON.stringify(COLOR_THEMES)};var d=${JSON.stringify(DEFAULT_COLOR_THEME)};try{var t=localStorage.getItem(${JSON.stringify(COLOR_THEME_PERSISTENCE_KEY)});if(t&&V.indexOf(t)!==-1){document.documentElement.dataset.colorTheme=t;return;}}catch(e){}document.documentElement.dataset.colorTheme=d;})();`;
}
