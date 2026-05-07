import { DEFAULT_THEME_KEY, getThemeByKey } from './presets';

const defaultTheme = getThemeByKey(DEFAULT_THEME_KEY);

export const themeName = DEFAULT_THEME_KEY;

export const colors = {
  background: defaultTheme.background,
  backgroundCool: defaultTheme.surfaceAlt,
  surface: defaultTheme.surface,
  surfaceAlt: defaultTheme.surfaceAlt,
  surfaceSoft: defaultTheme.surfaceAlt,
  surfaceGlass: 'rgba(255, 255, 255, 0.82)',
  surfaceBlue: defaultTheme.surfaceAlt,
  ink: defaultTheme.text,
  inkSoft: defaultTheme.text,
  muted: defaultTheme.textMuted,
  subtle: '#A5AFC0',
  border: defaultTheme.border,
  borderStrong: defaultTheme.border,
  brandBlue: defaultTheme.primary,
  brandBlueDark: defaultTheme.primary,
  brandBlueSoft: defaultTheme.surfaceAlt,
  accentYellow: defaultTheme.accent,
  accentYellowDeep: defaultTheme.accent,
  accent: defaultTheme.primary,
  accentDark: defaultTheme.primary,
  success: defaultTheme.success,
  successSoft: '#E8F7F0',
  warning: defaultTheme.warning,
  warningSoft: '#FFF7C8',
  danger: defaultTheme.danger,
  dangerSoft: '#FCEAE8',
  shadow: '#0A2B58',
} as const;

export const semanticColors = {
  primary: colors.brandBlue,
  accent: colors.accentYellow,
  text: colors.ink,
  textMuted: colors.muted,
  card: colors.surface,
  page: colors.background,
} as const;
