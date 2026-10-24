import { Platform, StyleSheet } from 'react-native';

export const colors = {
  background: '#0d1422', surface: '#182437', elevated: '#203149',
  border: '#33435a', text: '#f1f5f9', muted: '#a7b6c9',
  accent: '#f97316', accentSoft: '#422b22', success: '#45d4a8',
  warning: '#f6c56d', danger: '#ff8791', white: '#ffffff',
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  section: { padding: 20, gap: 16, width: '100%', maxWidth: 1280, alignSelf: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: colors.text },
  subheading: { fontSize: 14, lineHeight: 22, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 18, borderRadius: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { color: colors.muted, fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 13, borderRadius: 10, minHeight: 46, backgroundColor: colors.background },
  action: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.background, fontWeight: '800', fontSize: 14 },
  ghost: { borderColor: colors.border, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
  ghostText: { color: colors.text, fontWeight: '600' },
  pill: { backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { color: '#ffc29a', fontSize: 11, fontWeight: '700' },
  shadow: Platform.select({ web: { boxShadow: '0 8px 35px rgba(0,0,0,.14)' } as any, default: {} }),
});
