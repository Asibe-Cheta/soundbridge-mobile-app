import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

// Wrap SVG elements so Animated values can drive their props
const APath = Animated.createAnimatedComponent(Path as any) as any;
const ALine = Animated.createAnimatedComponent(Line as any) as any;

// Approximate path lengths (SVG user units)
const TRAY_LEN  = 30; // M5,13 L5,20 corner L18,21 corner L19,13
const SHAFT_LEN = 10; // (12,15)→(19,8)  ≈ 7√2
const HEAD_LEN  = 10; // (14,8)→(19,8)→(19,13)

const SEG = 13;   // length of the travelling glow segment
const GAP = 140;  // gap (>> any single path length → only one segment visible)

const DA = `${SEG} ${GAP}`; // strokeDasharray for all animated paths

// Neon palette — red → pink → purple → white (outer to inner)
const OUTER_RED  = '#dc2626'; // deep red outermost halo
const OUTER_PINK = '#f472b6'; // hot pink outer glow
const MID        = '#c084fc'; // medium purple mid glow
const CORE       = '#ffffff'; // white hot core
const FLASH      = '#fda4af'; // rose flash

// Tray SVG path
const TRAY_D  = 'M5 13 L5 20 Q5 21 6 21 L18 21 Q19 21 19 20 L19 13';
// Arrowhead SVG path
const HEAD_D  = 'M14 8 L19 8 L19 13';

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function ShareDiagonalIcon({
  size = 24,
  color = '#fff',
  strokeWidth = 2,
}: Props) {
  // Each path segment gets its own animated offset so the glow
  // travels sequentially: tray → shaft → arrowhead
  const trayOff  = useRef(new Animated.Value(SEG)).current;
  const shaftOff = useRef(new Animated.Value(SEG)).current;
  const headOff  = useRef(new Animated.Value(SEG)).current;
  const flashOp  = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAnimation = useCallback(() => {
    // Reset all offsets to "segment just before path start" = invisible
    trayOff.setValue(SEG);
    shaftOff.setValue(SEG);
    headOff.setValue(SEG);
    flashOp.setValue(0);

    Animated.sequence([
      // 1. Glow travels down-around-up the tray
      Animated.timing(trayOff, {
        toValue: -(TRAY_LEN),
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // 2. Glow travels up-right along the 45° shaft
      Animated.timing(shaftOff, {
        toValue: -(SHAFT_LEN),
        duration: 260,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // 3. Glow traces the arrowhead L
      Animated.timing(headOff, {
        toValue: -(HEAD_LEN),
        duration: 260,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // 4. Flash burst at the arrowhead tip
      Animated.timing(flashOp, {
        toValue: 1,
        duration: 90,
        useNativeDriver: false,
      }),
      Animated.timing(flashOp, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [trayOff, shaftOff, headOff, flashOp]);

  useEffect(() => {
    // Fire first animation after 1.8s, then every 4.5s
    const INTERVAL = 4500;
    timerRef.current = setTimeout(function tick() {
      runAnimation();
      timerRef.current = setTimeout(tick, INTERVAL);
    }, 1800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runAnimation]);

  const sw = strokeWidth;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">

      {/* ── Base icon (always visible, slightly dimmed) ───────────── */}
      <Path d={TRAY_D}
        stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.55} />
      <Line x1="12" y1="15" x2="19" y2="8"
        stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={0.55} />
      <Path d={HEAD_D}
        stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.55} />

      {/* ── Outermost red halo (widest, most transparent) ───────── */}
      <APath d={TRAY_D}
        stroke={OUTER_RED} strokeWidth={sw * 7} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.12}
        strokeDasharray={DA} strokeDashoffset={trayOff} />
      <ALine x1="12" y1="15" x2="19" y2="8"
        stroke={OUTER_RED} strokeWidth={sw * 7} strokeLinecap="round" opacity={0.12}
        strokeDasharray={DA} strokeDashoffset={shaftOff} />
      <APath d={HEAD_D}
        stroke={OUTER_RED} strokeWidth={sw * 7} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.12}
        strokeDasharray={DA} strokeDashoffset={headOff} />

      {/* ── Hot pink outer glow ──────────────────────────────────── */}
      <APath d={TRAY_D}
        stroke={OUTER_PINK} strokeWidth={sw * 4.5} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.35}
        strokeDasharray={DA} strokeDashoffset={trayOff} />
      <ALine x1="12" y1="15" x2="19" y2="8"
        stroke={OUTER_PINK} strokeWidth={sw * 4.5} strokeLinecap="round" opacity={0.35}
        strokeDasharray={DA} strokeDashoffset={shaftOff} />
      <APath d={HEAD_D}
        stroke={OUTER_PINK} strokeWidth={sw * 4.5} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.35}
        strokeDasharray={DA} strokeDashoffset={headOff} />

      {/* ── Purple mid glow ──────────────────────────────────────── */}
      <APath d={TRAY_D}
        stroke={MID} strokeWidth={sw * 2.5} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.55}
        strokeDasharray={DA} strokeDashoffset={trayOff} />
      <ALine x1="12" y1="15" x2="19" y2="8"
        stroke={MID} strokeWidth={sw * 2.5} strokeLinecap="round" opacity={0.55}
        strokeDasharray={DA} strokeDashoffset={shaftOff} />
      <APath d={HEAD_D}
        stroke={MID} strokeWidth={sw * 2.5} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={0.55}
        strokeDasharray={DA} strokeDashoffset={headOff} />

      {/* ── Bright white core ────────────────────────────────────── */}
      <APath d={TRAY_D}
        stroke={CORE} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        strokeDasharray={DA} strokeDashoffset={trayOff} />
      <ALine x1="12" y1="15" x2="19" y2="8"
        stroke={CORE} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={DA} strokeDashoffset={shaftOff} />
      <APath d={HEAD_D}
        stroke={CORE} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        strokeDasharray={DA} strokeDashoffset={headOff} />

      {/* ── End-of-path flash: blooms then fades over full icon ───── */}
      <APath d={TRAY_D}
        stroke={FLASH} strokeWidth={sw * 4} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={flashOp} />
      <ALine x1="12" y1="15" x2="19" y2="8"
        stroke={FLASH} strokeWidth={sw * 4} strokeLinecap="round" opacity={flashOp} />
      <APath d={HEAD_D}
        stroke={FLASH} strokeWidth={sw * 4} strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity={flashOp} />

    </Svg>
  );
}
