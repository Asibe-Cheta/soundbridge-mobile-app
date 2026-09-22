import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import type { EventCheckin, CheckinStatus } from '../services/EventCheckinService';

const ACircle = Animated.createAnimatedComponent(Circle as any) as any;

const SIZE = 280;
const CENTER = SIZE / 2;
const RING_R = CENTER - 12;
const DOT_R = 6;
const REST_MIN_R = 20;
const REST_MAX_R = 56;

/** Deterministic pseudo-random in [0,1) from a string, so a dot's resting spot is stable across renders. */
function hashToUnit(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

interface DotState {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  restX: number;
  restY: number;
  status: CheckinStatus;
}

interface Props {
  checkins: EventCheckin[];
  centerLabel: string;
}

export default function WhosComingVisualization({ checkins, centerLabel }: Props) {
  const { theme } = useTheme();
  const dotsRef = useRef<Map<string, DotState>>(new Map());
  const [, forceRender] = useState(0);

  const closeColor = theme.colors.success;
  const difficultyColor = theme.colors.error;

  useEffect(() => {
    let staggerIndex = 0;
    let addedAny = false;

    checkins.forEach((checkin) => {
      const existing = dotsRef.current.get(checkin.id);
      if (existing) {
        if (existing.status !== checkin.status) {
          existing.status = checkin.status;
          addedAny = true;
        }
        return;
      }

      // New dot — stable resting position near centre, derived from the checkin id.
      const angleUnit = hashToUnit(checkin.id);
      const radiusUnit = hashToUnit(checkin.id.slice().split('').reverse().join(''));
      const restAngle = angleUnit * Math.PI * 2;
      const restRadius = REST_MIN_R + radiusUnit * (REST_MAX_R - REST_MIN_R);
      const restX = CENTER + restRadius * Math.cos(restAngle);
      const restY = CENTER + restRadius * Math.sin(restAngle);

      // Entrance point — random spot on the ring's edge.
      const startAngle = Math.random() * Math.PI * 2;
      const startX = CENTER + RING_R * Math.cos(startAngle);
      const startY = CENTER + RING_R * Math.sin(startAngle);

      const dot: DotState = {
        x: new Animated.Value(startX),
        y: new Animated.Value(startY),
        opacity: new Animated.Value(0.15),
        restX,
        restY,
        status: checkin.status,
      };
      dotsRef.current.set(checkin.id, dot);
      addedAny = true;

      const delay = staggerIndex * 90;
      staggerIndex += 1;

      Animated.parallel([
        Animated.timing(dot.x, { toValue: restX, duration: 900, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(dot.y, { toValue: restY, duration: 900, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(dot.opacity, { toValue: 1, duration: 900, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    });

    if (addedAny) forceRender((n) => n + 1);
  }, [checkins]);

  const closeCount = checkins.filter((c) => c.status === 'close').length;
  const difficultyCount = checkins.filter((c) => c.status === 'difficulty').length;

  return (
    <View>
      <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>
        {checkins.length === 0
          ? 'No one has checked in yet'
          : `${checkins.length} checked in — ${closeCount} close, ${difficultyCount} having difficulty`}
      </Text>

      <View style={styles.wrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_R}
            fill="none"
            stroke={theme.colors.border}
            strokeWidth={1}
            strokeDasharray="4 6"
          />

          {Array.from(dotsRef.current.entries()).map(([id, dot]) => (
            <ACircle
              key={id}
              cx={dot.x}
              cy={dot.y}
              r={DOT_R}
              fill={dot.status === 'difficulty' ? difficultyColor : closeColor}
              opacity={dot.opacity}
            />
          ))}

          <Circle cx={CENTER} cy={CENTER} r={5} fill={theme.colors.text} />
        </Svg>

        <View style={styles.centerLabelWrap} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: theme.colors.text }]} numberOfLines={1}>
            {centerLabel}
          </Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: closeColor }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>I'm close</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: difficultyColor }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Having difficulty</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  wrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  centerLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CENTER + 10,
    alignItems: 'center',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
