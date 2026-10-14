// Dependencies: expo-linear-gradient, react-native-svg, @expo/vector-icons, expo-blur
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type Phase = 'entry' | 'response';

const entryStars = [
  { left: '23%', top: '33.5%', size: 3, opacity: 0.35 },
  { left: '57%', top: '34.8%', size: 4, opacity: 0.4 },
  { left: '59%', top: '34%', size: 2, opacity: 0.2 },
  { left: '27.5%', top: '41.9%', size: 3, opacity: 0.45 },
  { left: '25.5%', top: '42.7%', size: 2, opacity: 0.3 },
  { left: '43%', top: '42.7%', size: 2, opacity: 0.15 },
  { left: '46%', top: '42.1%', size: 2, opacity: 0.15 },
  { left: '61%', top: '43%', size: 3, opacity: 0.25 },
  { left: '63%', top: '42.2%', size: 2, opacity: 0.2 },
  { left: '65%', top: '41.5%', size: 2, opacity: 0.1 },
] as const;

// Points of light for the 'response' phase — different positions/colors from entryStars,
// ported from the second Aura screen's own star field.
const responseStars = [
  { left: '55%', top: '69%', size: 3, opacity: 0.5 },
  { left: '53%', top: '70%', size: 2, opacity: 0.4 },
  { left: '50%', top: '72%', size: 3, opacity: 0.5 },
  { left: '46%', top: '72.2%', size: 3, opacity: 0.4 },
  { left: '41%', top: '71.8%', size: 3, opacity: 0.4 },
  { left: '35%', top: '73%', size: 3, opacity: 0.4 },
  { left: '45%', top: '75%', size: 3, opacity: 0.6 },
  { left: '48%', top: '74.4%', size: 2, opacity: 0.5 },
  { left: '53%', top: '74%', size: 3, opacity: 0.4 },
  { left: '30%', top: '76.5%', size: 3, opacity: 0.5 },
  { left: '23%', top: '79%', size: 3, opacity: 0.3 },
  { left: '30%', top: '86%', size: 3, opacity: 0.4 },
  { left: '27%', top: '88%', size: 3, opacity: 0.3 },
  { left: '76%', top: '85%', size: 3, opacity: 0.6 },
  { left: '78%', top: '85.3%', size: 3, opacity: 0.5 },
  { left: '80%', top: '84.8%', size: 2, opacity: 0.5 },
  { left: '76%', top: '90%', size: 3, opacity: 0.5 },
  { left: '80%', top: '90.2%', size: 3, opacity: 0.5 },
] as const;

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('entry');

  const stars = phase === 'entry' ? entryStars : responseStars;

  return (
    <TouchableWithoutFeedback onPress={() => setMenuOpen(false)} accessible={false}>
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={phase === 'entry' ? '#28168e' : '#9b00ef'} />

        {phase === 'entry' ? (
          <LinearGradient
            colors={['#28168e', '#21137e', '#1b126e', '#160e55']}
            locations={[0, 0.29, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.65, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <>
            <LinearGradient
              colors={['#9b00ef', '#6610df', '#2218a5', '#070924', '#050717']}
              locations={[0, 0.19, 0.36, 0.59, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.responseGlowBlob} />
          </>
        )}

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {stars.map((star, index) => (
            <View
              key={index}
              style={[
                styles.star,
                {
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                },
              ]}
            />
          ))}
        </View>

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerPill}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="More options"
                accessibilityState={{ expanded: menuOpen }}
                onPress={() => setMenuOpen(!menuOpen)}
                style={styles.headerDotsButton}
                hitSlop={10}
              >
                <Feather name="grid" size={18} color="#d2acff" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Your profile"
                style={styles.headerAvatarButton}
                hitSlop={10}
              >
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces' }}
                  style={styles.headerAvatarImage as any}
                />
              </TouchableOpacity>
            </View>
            {phase === 'response' && (
              <Text style={styles.headline}>Tell me more about{'\n'}my peer comparison</Text>
            )}
          </View>

          {menuOpen && (
            <View style={styles.menu}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setMenuOpen(false)}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>Back to friends</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>

        {phase === 'entry' ? (
          <View style={styles.invitation}>
            <View pointerEvents="none" style={styles.glow} />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPhase('response')}
              activeOpacity={0.8}
              style={styles.typeButtonShadow}
            >
              <BlurView intensity={15} tint="dark" style={styles.typeButton}>
                <Text style={styles.typeText}>What's your type?</Text>
              </BlurView>
            </TouchableOpacity>
            <View pointerEvents="none" style={styles.nearStar} />
          </View>
        ) : (
          <View pointerEvents="none" style={styles.responseInvitation}>
            <View pointerEvents="none" style={styles.responseGlow} />
            <BlurView intensity={10} tint="dark" style={styles.responseButton}>
              <Text style={styles.responseText}>Generating responses</Text>
            </BlurView>
          </View>
        )}

        <View pointerEvents="none" style={[styles.horizon, phase === 'response' && styles.horizonResponse]}>
          {phase === 'entry' ? (
            <Svg width="100%" height="100%" viewBox="0 0 393 265" preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="horizon-fill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#2d2085" stopOpacity={0.2} />
                  <Stop offset="1" stopColor="#100c48" stopOpacity={0.05} />
                </SvgGradient>
              </Defs>
              <Path
                d="M-30 64 Q196 -26 423 64 L423 265 L-30 265Z"
                fill="url(#horizon-fill)"
                stroke="#43309b"
                strokeOpacity={0.08}
                strokeWidth={2}
              />
              <Path
                d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225"
                fill="none"
                stroke="#8e71ff"
                strokeOpacity={0.12}
                strokeWidth={18}
              />
              <Path
                d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225 L419 265 L-25 265Z"
                fill="#110c49"
                fillOpacity={0.6}
              />
              <Path
                d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225"
                fill="none"
                stroke="#8d74dd"
                strokeOpacity={0.5}
                strokeWidth={3}
              />
              <Path
                d="M-25 232 Q26 191 89 191 L304 191 Q369 192 419 233"
                fill="none"
                stroke="#493095"
                strokeOpacity={0.35}
                strokeWidth={5}
              />
            </Svg>
          ) : (
            <Svg width="100%" height="100%" viewBox="0 0 393 265" preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="horizon-fill-response" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0b1649" stopOpacity={0.5} />
                  <Stop offset="1" stopColor="#100c48" stopOpacity={0.05} />
                </SvgGradient>
              </Defs>
              <Path
                d="M-25 85 Q196 -65 418 85 L418 265 L-25 265Z"
                fill="url(#horizon-fill-response)"
                stroke="#43309b"
                strokeOpacity={0.08}
                strokeWidth={2}
              />
              <Path
                d="M-25 85 Q196 -65 418 85"
                fill="none"
                stroke="#387eff"
                strokeOpacity={0.45}
                strokeWidth={5}
              />
              <Path
                d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225 L419 265 L-25 265Z"
                fill="#110c49"
                fillOpacity={0}
              />
              <Path
                d="M-25 85 Q196 -65 418 85"
                fill="none"
                stroke="#549aff"
                strokeOpacity={0.5}
                strokeWidth={2}
              />
              <Path
                d="M-25 232 Q26 191 89 191 L304 191 Q369 192 419 233"
                fill="none"
                stroke="#493095"
                strokeOpacity={0}
                strokeWidth={5}
              />
            </Svg>
          )}
        </View>

        {phase === 'response' && (
          <View pointerEvents="none" style={styles.sendBubbleShadow}>
            <View style={styles.sendBubbleClip}>
              <Svg width={61} height={61} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="sendBubbleGrad" cx="35%" cy="65%" r="75%">
                    <Stop offset="0%" stopColor="#bd43d4" />
                    <Stop offset="28%" stopColor="#6237c3" />
                    <Stop offset="57%" stopColor="#17216e" />
                    <Stop offset="75%" stopColor="#0b123d" />
                  </RadialGradient>
                </Defs>
                <Circle cx={30.5} cy={30.5} r={30.5} fill="url(#sendBubbleGrad)" />
              </Svg>
              <View style={styles.sendBubbleHighlight} />
              <View style={styles.sendBubbleIconWrap}>
                <Svg width={32} height={32} viewBox="0 0 32 32">
                  <Path
                    d="m23 7-14 9 11 4-8 6"
                    stroke="#e7e2ff"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </View>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1b126e' },
  safeArea: { zIndex: 20 },
  responseGlowBlob: {
    position: 'absolute',
    left: '-45%',
    top: '8%',
    height: '45%',
    width: '120%',
    borderRadius: 9999,
    backgroundColor: 'rgba(49,36,240,0.4)',
    filter: [{ blur: 55 }],
  } as any,
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'flex-start',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 47,
    width: 103,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(191,128,255,0.5)',
    paddingHorizontal: 8,
  },
  headerDotsButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerAvatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(211,162,255,0.7)',
    backgroundColor: '#a06ad8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: { width: '100%', height: '100%' },
  headline: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 25,
    color: '#ded1ff',
  },
  menu: {
    alignSelf: 'flex-end',
    marginRight: 12,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#251776',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 10 },
  menuText: { fontSize: 14, color: '#ede9fe' },
  star: { position: 'absolute', borderRadius: 4, backgroundColor: '#ad9bff' },
  invitation: {
    position: 'absolute',
    top: '49.3%',
    left: '50%',
    width: 148,
    height: 45,
    transform: [{ translateX: -74 }, { translateY: -22.5 }],
    zIndex: 10,
  },
  // Ported from the actual CSS: the halo is a `::before` with `filter: blur(18px)`, not a
  // box-shadow — box-shadow only casts a blurred copy OUTSIDE a shape while the shape's own
  // fill edge stays sharp. `filter: blur()` blurs the element's own pixels in place.
  glow: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: -20,
    right: -20,
    borderRadius: 999,
    backgroundColor: 'rgba(121,96,255,0.5)',
    filter: [{ blur: 18 }],
  } as any,
  typeButtonShadow: {
    width: 148,
    height: 45,
    borderRadius: 24,
    shadowColor: '#7f60ff',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(163,145,255,0.3)',
    backgroundColor: 'rgba(104,81,204,0.35)',
  },
  typeText: { fontSize: 12, fontWeight: '500', color: '#c1b1ff' },
  nearStar: {
    position: 'absolute',
    left: 2,
    top: 34,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(184,166,255,0.5)',
  },
  // 'response' phase's disabled "Generating responses" pill — replaces .invitation/.glow/
  // .typeButton above when phase === 'response'.
  responseInvitation: {
    position: 'absolute',
    top: '81%',
    left: '50%',
    width: 200,
    height: 51,
    transform: [{ translateX: -100 }, { translateY: -25.5 }],
    zIndex: 10,
  },
  responseGlow: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: -12,
    right: -12,
    borderRadius: 999,
    backgroundColor: 'rgba(100,127,162,0.1)',
    filter: [{ blur: 14 }],
  } as any,
  responseButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(37,44,64,0.9)',
  },
  responseText: { fontSize: 16, fontWeight: '500', color: '#d4d9e3' },
  horizon: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '31%' },
  horizonResponse: { height: '40%' },
  // Circular send/compose bubble — 'response' phase only. Shadow split from the clipped
  // gradient+icon layer for the same iOS reason as elsewhere in this screen (overflow:hidden
  // and shadow can't share one view).
  sendBubbleShadow: {
    position: 'absolute',
    bottom: 22,
    left: '50%',
    width: 61,
    height: 61,
    transform: [{ translateX: -30.5 }],
    borderRadius: 30.5,
    shadowColor: '#523db4',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 10,
  },
  sendBubbleClip: {
    flex: 1,
    borderRadius: 30.5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(122,116,217,0.6)',
  },
  sendBubbleHighlight: {
    position: 'absolute',
    left: 12,
    top: 8,
    width: 32,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(173,157,255,0.3)',
    transform: [{ rotate: '-12deg' }],
    filter: [{ blur: 3 }],
  } as any,
  sendBubbleIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
