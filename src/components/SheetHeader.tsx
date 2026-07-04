// ═══════════════════════════════════════════════════════════════
// SheetHeader — 底部 sheet 弹窗公共 Header（拖拽条 + 标题 + 关闭）
// ═══════════════════════════════════════════════════════════════

import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { SHEET_HANDLE_COLOR } from '../theme';

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  /** Header 文字颜色，默认白色（用于 primary 色背景） */
  titleColor?: string;
  /** Header 背景色，默认使用 modalHeader 的 primary */
  backgroundColor?: string;
}

export default function SheetHeader({ title, onClose, titleColor = '#FFFFFF', backgroundColor }: SheetHeaderProps) {
  return (
    <View style={{ backgroundColor, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'column', alignItems: 'flex-start' }}>
      {/* Drag handle */}
      <View style={{ width: 36, height: 4, backgroundColor: SHEET_HANDLE_COLOR, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
      {/* Title + Close */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: titleColor }}>{title}</Text>
        <TouchableOpacity style={{ padding: 4 }} onPress={onClose}>
          <Svg width={18} height={18} viewBox="0 0 24 24" stroke={titleColor} strokeWidth={2} fill="none">
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}
