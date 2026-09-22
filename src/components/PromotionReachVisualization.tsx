import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

const APath = Animated.createAnimatedComponent(Path as any) as any;

const SIZE = 300;
const CENTER = SIZE / 2;
const CENTER_DOT_R = 10;
const AREA_R = 26;
const ORBIT_R = 108;

const DASH = '10 18';

interface ReachArea {
  city: string;
  count: number;
}

interface Props {
  centerLabel: string;
  areas: ReachArea[];
}

function ReachLine({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(offset, {
        toValue: 1,
        duration: 1400,
        delay,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const dashOffset = offset.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });

  // Slight outward curve — control point offset perpendicular to the line
  const midX = (CENTER + x) / 2;
  const midY = (CENTER + y) / 2;
  const dx = x - CENTER;
  const dy = y - CENTER;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const curveAmount = 18;
  const ctrlX = midX + (-dy / len) * curveAmount;
  const ctrlY = midY + (dx / len) * curveAmount;

  const d = `M ${CENTER} ${CENTER} Q ${ctrlX} ${ctrlY} ${x} ${y}`;

  return (
    <>
      <Path d={d} stroke={color} strokeWidth={1.5} fill="none" opacity={0.25} />
      <APath
        d={d}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeDasharray={DASH}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </>
  );
}

export default function PromotionReachVisualization({ centerLabel, areas }: Props) {
  const { theme } = useTheme();

  if (areas.length === 0) {
    return (
      <View style={[styles.emptyWrap, { borderColor: theme.colors.border }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No promotion reach data yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
          Numbers will appear here once notifications have gone out for this event.
        </Text>
      </View>
    );
  }

  const count = areas.length;
  const positions = areas.map((_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: CENTER + ORBIT_R * Math.cos(angle),
      y: CENTER + ORBIT_R * Math.sin(angle),
    };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {positions.map((p, i) => (
          <ReachLine key={areas[i].city + i} x={p.x} y={p.y} delay={i * 180} color={theme.colors.primary} />
        ))}

        {/* Organiser's location — central point */}
        <Circle cx={CENTER} cy={CENTER} r={CENTER_DOT_R + 6} fill={theme.colors.primary} opacity={0.18} />
        <Circle cx={CENTER} cy={CENTER} r={CENTER_DOT_R} fill={theme.colors.primary} />

        {areas.map((area, i) => {
          const p = positions[i];
          return (
            <React.Fragment key={area.city + '-circle' + i}>
              <Circle cx={p.x} cy={p.y} r={AREA_R} fill={theme.colors.card} stroke={theme.colors.primary} strokeWidth={2} />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Center label */}
      <View style={[styles.centerLabelWrap, { top: CENTER + CENTER_DOT_R + 8 }]} pointerEvents="none">
        <Text style={[styles.centerLabel, { color: theme.colors.text }]} numberOfLines={1}>
          {centerLabel}
        </Text>
      </View>

      {/* Count, centered inside each circle */}
      {areas.map((area, i) => {
        const p = positions[i];
        return (
          <View
            key={area.city + '-count' + i}
            style={[styles.areaCountWrap, { left: p.x - AREA_R, top: p.y - AREA_R, width: AREA_R * 2, height: AREA_R * 2 }]}
            pointerEvents="none"
          >
            <Text style={[styles.areaCount, { color: theme.colors.text }]}>{area.count.toLocaleString()}</Text>
          </View>
        );
      })}

      {/* Location name, displayed beneath each circle */}
      {areas.map((area, i) => {
        const p = positions[i];
        return (
          <View
            key={area.city + '-city' + i}
            style={[styles.areaCityWrap, { left: p.x - AREA_R - 6, top: p.y + AREA_R + 4, width: AREA_R * 2 + 12 }]}
            pointerEvents="none"
          >
            <Text style={[styles.areaCity, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {area.city}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE + 28,
    alignSelf: 'center',
  },
  centerLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  areaCountWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaCityWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  areaCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  areaCity: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyWrap: {
    marginHorizontal: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
