import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme, withAlpha } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';

interface Props {
  selected: string;
  onSelect: (method: string) => void;
  label?: string;
}

const METHODS = ['payCash', 'payWechat', 'payAlipay'] as const;

const activeBg: Record<string, string> = {
  payCash: '',   // filled dynamically with c.primary
  payWechat: '#07C160',
  payAlipay: '#1677FF',
};

const iconColor: Record<string, string> = {
  payCash: '#FE6B5B',
  payWechat: '#00BB9C',
  payAlipay: '#02A9F1',
};

function payIcon(method: string, color: string) {
  switch (method) {
    case 'payCash':
      return (
        <Svg width={18} height={18} viewBox="0 0 1024 1024">
          <Circle cx="512" cy="512" r="512" fill="#FE6B5B" />
          <Path d="M288 320h448a64 64 0 0 1 64 64v256a64 64 0 0 1-64 64H288a64 64 0 0 1-64-64v-256a64 64 0 0 1 64-64z" fill="#FFFFFF" />
          <Path d="M224 416h576v64H224z" fill="#FCE456" />
        </Svg>
      );
    case 'payWechat':
      return (
        <Svg width={18} height={18} viewBox="0 0 1024 1024">
          <Path d="M390.21952 631.09248c-61.26464 34.01984-70.35136-19.09888-70.35136-19.09888l-76.78208-178.46656c-29.54368-84.80512 25.56928-38.23744 25.56928-38.23744s47.2896 35.63392 83.17952 57.34784c35.87072 21.71392 76.75776 6.3744 76.75776 6.3744l501.9648-230.7776C837.94688 113.4528 684.96256 38.4 511.76576 38.4 229.11104 38.4 0 238.13248 0 484.52864c0 141.72544 75.8656 267.8656 194.0352 349.62176l-21.31072 122.01856c0 0-10.38848 35.6224 25.61536 19.10016 24.53376-11.26528 87.0784-51.63392 124.30976-76.20224 58.53056 20.31616 122.2976 31.5968 189.14432 31.5968 282.63168 0 511.79008-199.73248 511.79008-446.13376 0-71.36896-19.31008-138.76864-53.51552-198.59456C810.14144 381.7792 438.15808 604.51712 390.21952 631.09248z" fill={color} />
        </Svg>
      );
    case 'payAlipay':
      return (
        <Svg width={18} height={18} viewBox="0 0 1024 1024">
          <Path d="M975.238095 679.375238l-297.374476-100.132571a575.683048 575.683048 0 0 0 47.835429-101.61981 544.889905 544.889905 0 0 0 28.379428-104.594286l-192.78019-1.487238v-65.755428l233.130666-1.487238v-46.32381H559.786667V151.868952h-115.053715v106.105905H226.57219v46.32381l218.185143-1.487238v70.217142h-174.835809v37.351619h360.131047a392.996571 392.996571 0 0 1-17.944381 67.242667c-13.433905 37.351619-28.379429 70.241524-28.379428 70.241524s-168.862476-59.782095-258.511238-59.782095-195.754667 35.888762-206.214095 140.483047c-10.48381 103.107048 49.298286 159.890286 135.972571 179.321905a340.041143 340.041143 0 0 0 234.617905-34.377143 553.74019 553.74019 0 0 0 135.972571-110.592l346.453334 168.740572a0.365714 0.365714 0 0 1 0.195047 0.390095A170.276571 170.276571 0 0 1 803.401143 975.238095H200.874667A152.112762 152.112762 0 0 1 48.761905 823.125333V200.899048A152.112762 152.112762 0 0 1 200.874667 48.761905H823.100952A152.112762 152.112762 0 0 1 975.238095 200.874667z" fill={color} />
        </Svg>
      );
    default:
      return null;
  }
}

export default function PaymentMethodChips({ selected, onSelect, label }: Props) {
  const { colors: c } = useTheme();

  return (
    <View>
      <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub, marginBottom: 6 }}>
        {label || t('paymentMethod')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {METHODS.map(m => {
          const active = selected === m;
          const bg = active ? (activeBg[m] || c.primary) : withAlpha(c.textMain, 0.06);
          const clr = active ? c.surface : iconColor[m];
          return (
            <TouchableOpacity
              key={m}
              style={[st.chip, { backgroundColor: bg }]}
              onPress={() => onSelect(m)}
              activeOpacity={0.7}
            >
              <View style={[st.iconCircle, active && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                {payIcon(m, clr)}
              </View>
              <Text
                style={[st.label, { color: c.textSub }, active && { color: c.surface }]}
                numberOfLines={1}
              >
                {t(m as any)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  chip: {
    flex: 1, flexDirection: 'row', paddingVertical: 8, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  label: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
});
