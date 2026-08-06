import React, { useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface SplashScreenProps {
  /** Called once the clip finishes playing. The video freezes on its last frame
   *  (default behaviour when isLooping is false) until the parent unmounts this
   *  screen — the parent decides when that happens (e.g. once auth has resolved). */
  onVideoFinish?: () => void;
}

export default function SplashScreen({ onVideoFinish }: SplashScreenProps) {
  const finishedRef = useRef(false);

  const handleStatusUpdate = (status: AVPlaybackStatus) => {
    if (finishedRef.current) return;
    if (status.isLoaded && status.didJustFinish) {
      finishedRef.current = true;
      onVideoFinish?.();
    }
  };

  const handleError = () => {
    // Don't let a playback failure block the whole app from launching.
    if (finishedRef.current) return;
    finishedRef.current = true;
    onVideoFinish?.();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
      <Video
        source={require('../../assets/images/Sb-splash.mp4')}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isMuted
        isLooping={false}
        onPlaybackStatusUpdate={handleStatusUpdate}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
});
