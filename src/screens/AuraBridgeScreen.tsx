// Dependencies: expo-linear-gradient, react-native-svg, @expo/vector-icons
import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

const stars = [
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

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [answered, setAnswered] = useState(false);

  return (
    <TouchableWithoutFeedback onPress={() => setMenuOpen(false)} accessible={false}>
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#28168e" />
        <LinearGradient
          colors={['#28168e', '#21137e', '#1b126e', '#160e55']}
          locations={[0, 0.29, 0.58, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.65, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

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
            <Text accessibilityRole="header" style={styles.title}>Friends</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Your profile"
                style={styles.profile}
                hitSlop={10}
              >
                <Feather name="user" size={19} color="#8471d8" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="More options"
                accessibilityState={{ expanded: menuOpen }}
                onPress={() => setMenuOpen(!menuOpen)}
                style={styles.moreButton}
                hitSlop={10}
              >
                <Feather name="more-horizontal" size={24} color="#c1b3f2" />
              </TouchableOpacity>
            </View>
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

        <View style={styles.invitation}>
          <View pointerEvents="none" style={styles.glow} />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setAnswered(!answered)}
            activeOpacity={0.8}
            style={styles.typeButton}
          >
            <Text style={styles.typeText}>
              {answered ? 'Someone like you.' : "What's your type?"}
            </Text>
          </TouchableOpacity>
          <View pointerEvents="none" style={styles.nearStar} />
        </View>

        <View pointerEvents="none" style={styles.horizon}>
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
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1b126e' },
  safeArea: { zIndex: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '500', color: '#e2dcff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profile: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e4ddfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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
  glow: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: -12,
    right: -12,
    borderRadius: 40,
    backgroundColor: 'rgba(121,96,255,0.12)',
    shadowColor: '#7960ff',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  typeButton: {
    width: 148,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(163,145,255,0.3)',
    backgroundColor: 'rgba(104,81,204,0.35)',
    shadowColor: '#7f60ff',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
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
  horizon: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '31%' },
});
