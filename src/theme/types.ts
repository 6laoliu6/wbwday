export type ThemeKey =
  | 'klein-blue'
  | 'healing-blue'
  | 'honey-yellow'
  | 'mars-green'
  | 'neon-green'
  | 'gentle-pink'
  | 'tiffany-blue'
  | 'hermes-orange'
  | 'burgundy-red';

export type AppTheme = {
  key: ThemeKey;
  name: string;
  primary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};
