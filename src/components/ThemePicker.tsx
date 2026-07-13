import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, withAlpha } from '../theme';
import { FONTS } from '../theme';
import { getLang } from '../i18n';

interface ThemePickerProps {
  onSelect?: () => void;  // called after theme selection (e.g. close modal)
}

export default function ThemePicker({ onSelect }: ThemePickerProps) {
  const { colors, setTheme, allThemes } = useTheme();
  const lang = getLang();
  const tn = (t: any) => lang === 'zh-TW' ? (t.nameTw || t.nameZh) : lang === 'en' ? (t.nameEn || t.nameZh) : t.nameZh;
  const td = (t: any) => lang === 'zh-TW' ? (t.descTw || t.descZh) : lang === 'en' ? (t.descEn || t.descZh) : t.descZh;

  return (
    <>
      {allThemes.map((theme: any) => {
        const isActive = theme.colors.primary === colors.primary;
        return (
          <TouchableOpacity
            key={theme.id}
            onPress={() => { setTheme(theme.id); onSelect?.(); }}
            style={{
              flexDirection: 'row', alignItems: 'center',
              padding: 12, borderRadius: 12, marginBottom: 8,
              backgroundColor: isActive ? withAlpha(colors.primary, 0.06) : colors.surface,
              borderWidth: 1.5,
              borderColor: isActive ? colors.primary : colors.secondary || '#e0e0e0',
            }}
          >
            {/* Three color preview dots */}
            <View style={{ flexDirection: 'row', gap: 4, marginRight: 12 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.primary }} />
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: colors.secondary || '#e0e0e0' }} />
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.accent }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONTS.micro.size, fontWeight: isActive ? '700' : '500', color: colors.textSub }}>
                {tn(theme)}
              </Text>
              <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 1 }}>
                {td(theme)}
              </Text>
            </View>
            {isActive && (
              <Text style={{ fontSize: FONTS.sub.size, color: colors.primary }}>✓</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );
}
