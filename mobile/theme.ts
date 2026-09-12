import type { TextStyle } from 'react-native';
export const colors = {
  paper: '#f5f3ee', surface: '#ffffff', surface2: '#f9f8f5', border: '#e5e3dc', border2: '#d4d1c8',
  ink: '#1a1a18', ink2: '#6b6960', ink3: '#9c9990', moss: '#3b6b3b', mossLight: '#e8f0e8',
  green: '#4a7c59', greenLight: '#eef5f0', red: '#c0392b', amber: '#b5720a', amberLight: '#fdf5e6',
  blue: '#2c5f8a', blueLight: '#edf3f8', purple: '#6b4fa0', purpleLight: '#f3eefb',
  teal: '#1e7a6e', coral: '#c0502a', pink: '#b04070',
  errorBackground: '#fdeeeb', errorBorder: '#f2ccc4', errorInk: '#8f2d1e',
  noticeBorder: '#f0e2c4', noticeInk: '#8a5806', transparent: 'transparent', backdrop: 'rgba(26,26,24,0.4)',
};
export const fonts = { regular: 'DMSans_400Regular', medium: 'DMSans_500Medium', semibold: 'DMSans_600SemiBold', bold: 'DMSans_700Bold' };
export const numbers: TextStyle = { fontVariant: ['tabular-nums'] };
export const type = {
  title: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.78, color: colors.ink },
  screenTitle: { fontFamily: fonts.semibold, fontSize: 19, letterSpacing: -0.38, color: colors.ink },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: -0.36, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  label: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.ink3 },
} satisfies Record<string, TextStyle>;
