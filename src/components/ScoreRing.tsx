import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, scoreColor, scoreLabel } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 148;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({
  score,
  size = SIZE,
  showLabel = true,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const color = scoreColor(score);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: score / 100,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [score, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke={colors.surfaceAlt}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color }]}>{score}</Text>
        <Text style={styles.of}>/ 100</Text>
        {showLabel ? <Text style={styles.label}>{scoreLabel(score)}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  of: { fontSize: 13, color: colors.textFaint, marginTop: -4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
});
