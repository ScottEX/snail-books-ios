import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function DropdownArrow({ color, expanded }: { color: string; expanded: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 1024 1024" accessible={false}
      style={{ marginLeft: 2, transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
      <Path d="M836.899 399.237l-218.01 335.037c-47.506 73.007-166.272 73.007-213.778 0l-218.01-335.037C139.595 326.23 198.977 234.97 293.99 234.97h436.02c95.013 0 154.395 91.26 106.889 164.267z" fill={color} />
    </Svg>
  );
}
