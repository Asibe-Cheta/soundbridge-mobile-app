/**
 * THROWAWAY TEST SCREEN — Step 1 compatibility spike only (MOBILE_TEAM_LIVE_STREAMING.MD).
 * Purpose: confirm expo-live-stream (fallback library — @api.video/react-native-livestream
 * was tried first and failed the iOS build with a Swift bridging-header error) builds clean
 * alongside this project's existing native deps (react-native-agora, withFFmpegKit,
 * withTrackPlayerFix, kotlinVersion 2.1.20) and that the camera preview actually renders.
 * Not the real Go Live screen — delete once the spike result is reported and Step 2 is
 * green-lit.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { ExpoLiveStreamPublisherView, useLiveStream, VideoQuality } from 'expo-live-stream';

export default function LiveStreamSpikeTestScreen() {
  const { ref, isStreaming, start, stop } = useLiveStream();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.banner}>SPIKE TEST — not the real Go Live screen</Text>
      <ExpoLiveStreamPublisherView
        ref={ref}
        style={styles.preview}
        url="rtmp://placeholder.invalid/live/spike-test"
        quality={VideoQuality.HD_720P}
        frontCamera
        onStreamStateChanged={(e: any) => console.log('[spike] stream state:', e)}
        onConnectionFailed={(e: any) => console.log('[spike] connection failed:', e)}
      />
      <View style={styles.footer}>
        <Text style={styles.statusText}>streaming: {String(isStreaming)}</Text>
        <Text style={styles.hint}>Camera preview only — RTMP URL is a placeholder, not wired to Cloudflare yet.</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: isStreaming ? '#DC2626' : '#fff' }]}
          onPress={() => (isStreaming ? stop() : start())}
        >
          <Text style={{ color: isStreaming ? '#fff' : '#000', fontWeight: '700' }}>
            {isStreaming ? 'Stop' : 'Start (preview only)'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  banner: {
    color: '#FCD34D',
    backgroundColor: 'rgba(245,158,11,0.2)',
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  preview: { flex: 1, alignSelf: 'stretch', backgroundColor: '#000' },
  footer: { padding: 16, backgroundColor: '#000' },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, marginBottom: 12 },
  button: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
