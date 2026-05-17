/**
 * DEV-ONLY: Sound Academy Partner Banner Mockup
 * Stored here for future use / re-screenshots.
 * Drop into FeedScreen ListHeaderComponent wrapped in {__DEV__ && (...)}
 *
 * Dependencies already in FeedScreen: LinearGradient, Ionicons, Linking, Image, StyleSheet, TouchableOpacity, View, Text
 */

/*
USAGE — paste inside ListHeaderComponent in FeedScreen.tsx:

{__DEV__ && (
  <View style={saStyles.saPartnerBanner}>
    <LinearGradient
      colors={['#1C1235', '#2A1650', '#1C1235']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <LinearGradient
      colors={['rgba(139,92,246,0.18)', 'transparent', 'rgba(88,28,135,0.12)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <View style={saStyles.saTopRow}>
      <View style={saStyles.saLogoWrap}>
        <Image
          source={require('../../assets/sa.jpg')}
          style={saStyles.saLogo}
          resizeMode="cover"
        />
      </View>
      <View style={saStyles.saPartnerBadge}>
        <View style={saStyles.saPartnerDot} />
        <Text style={saStyles.saPartnerBadgeText}>EDUCATION PARTNER</Text>
      </View>
    </View>
    <Text style={saStyles.saHeadline}>Level Up Your Sound</Text>
    <Text style={saStyles.saSubheadline}>
      World-class audio engineering & DJ courses.{'\n'}Pro Tools certified · 5 countries.
    </Text>
    <TouchableOpacity
      style={saStyles.saCtaButton}
      activeOpacity={0.75}
      onPress={() => Linking.openURL('https://www.sound-academy.uk')}
    >
      <Ionicons name="school-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
      <Text style={saStyles.saCtaText}>Explore Courses</Text>
    </TouchableOpacity>
    <View style={saStyles.saFooterStrip}>
      <Text style={saStyles.saFooterText}>Official SoundBridge Education Partner</Text>
      <Image
        source={require('../../assets/images/logos/logo-trans-lockup.png')}
        style={saStyles.saFooterLogo}
        resizeMode="contain"
      />
    </View>
  </View>
)}

STYLES — add to StyleSheet.create({...}) or use as const saStyles = StyleSheet.create({...}):

saPartnerBanner: {
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 4,
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: 'rgba(139,92,246,0.25)',
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 0,
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 10,
},
saTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
},
saLogoWrap: {
  width: 52,
  height: 52,
  borderRadius: 12,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.15)',
},
saLogo: { width: '100%', height: '100%' },
saPartnerBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  backgroundColor: 'rgba(139,92,246,0.2)',
  borderWidth: 1,
  borderColor: 'rgba(139,92,246,0.4)',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 20,
},
saPartnerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A78BFA' },
saPartnerBadgeText: {
  fontSize: 10, fontWeight: '700', color: '#C4B5FD', letterSpacing: 0.8,
},
saHeadline: {
  fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 6, letterSpacing: 0.1,
},
saSubheadline: {
  fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19, marginBottom: 14,
},
saCtaButton: {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: 'rgba(0,0,0,0.35)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.2)',
  paddingHorizontal: 16,
  paddingVertical: 9,
  borderRadius: 24,
  marginBottom: 14,
},
saCtaText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
saFooterStrip: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.07)',
  marginTop: 2,
},
saFooterText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
saFooterLogo: { height: 14, width: 72, opacity: 0.35 },
*/

export {};
