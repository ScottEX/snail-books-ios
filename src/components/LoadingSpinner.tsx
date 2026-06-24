import { Animated, Easing, View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { t } from '../i18n';
import { spinnerAnimation } from '../sharedStyles';
import { useEffect, useRef } from 'react';

interface Props {
  /** Show "加载中..." label beneath the spinner (default: true) */
  label?: boolean;
  /** Spinner diameter in px (default: 48) */
  size?: number;
  /** Override the spinner colour (defaults to colors.primary) */
  color?: string;
}

export default function LoadingSpinner({ label = true, size = 48, color }: Props) {
  const { colors } = useTheme();
  const fill = color || colors.primary;

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={spinnerAnimation.container}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg
          width={size}
          height={size * (1024 / 1077)}
          viewBox="0 0 1077 1024"
        >
          <Path d="M89.824561 178.086175a149.701614 148.40814 0 1 0 299.403228 0 149.701614 148.40814 0 1 0-299.403228 0Z" fill={fill} opacity={0.9} />
          <Path d="M0 504.580491a119.77207 118.730105 0 1 0 239.54414 0 119.77207 118.730105 0 1 0-239.54414 0Z" fill={fill} opacity={0.8} />
          <Path d="M104.789333 793.977263a112.280702 111.310596 0 1 0 224.561404 0 112.280702 111.310596 0 1 0-224.561404 0Z" fill={fill} opacity={0.7} />
          <Path d="M434.158035 920.108912a104.789333 103.891088 0 1 0 209.578667 0 104.789333 103.891088 0 1 0-209.578667 0Z" fill={fill} opacity={0.6} />
          <Path d="M763.508772 808.816281a97.31593 96.471579 0 1 0 194.63186 0 97.31593 96.471579 0 1 0-194.63186 0Z" fill={fill} opacity={0.5} />
          <Path d="M913.228351 482.321965a82.333193 81.614596 0 1 0 164.666386 0 82.333193 81.614596 0 1 0-164.666386 0Z" fill={fill} opacity={0.4} />
          <Path d="M808.421053 185.505684a67.368421 66.775579 0 1 0 134.736842 0 67.368421 66.775579 0 1 0-134.736842 0Z" fill={fill} opacity={0.3} />
          <Path d="M523.964632 51.936561a52.403649 51.936561 0 1 0 104.807298 0 52.403649 51.936561 0 1 0-104.807298 0Z" fill={fill} opacity={0.2} />
        </Svg>
      </Animated.View>
      {label && (
        <Text style={spinnerAnimation.label}>{t('loading')}</Text>
      )}
    </View>
  );
}
