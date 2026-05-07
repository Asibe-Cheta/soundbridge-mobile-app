import React, { useEffect, useRef } from 'react';
import { Animated, View, ScrollView, StyleSheet } from 'react-native';

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: 'rgba(255,255,255,0.12)', opacity },
        style,
      ]}
    />
  );
}

// 280×380 card — matches htmlCard in DiscoverScreen (tracks, artists)
export function SkeletonHtmlCardRow({ count = 3 }: { count?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.htmlCard}>
          <SkeletonBox width="100%" height={380} borderRadius={24} />
        </View>
      ))}
    </ScrollView>
  );
}

// 160×160 card — matches albumCard in DiscoverScreen (albums, playlists)
export function SkeletonAlbumCardRow({ count = 4 }: { count?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.albumCard}>
          <SkeletonBox width={160} height={160} borderRadius={8} />
          <SkeletonBox width={120} height={12} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonBox width={80} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </ScrollView>
  );
}

// Row card — matches eventCard / serviceCard in DiscoverScreen
export function SkeletonRowCards({ count = 3 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.rowCard}>
          <SkeletonBox width={72} height={72} borderRadius={8} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonBox width="75%" height={13} borderRadius={4} />
            <SkeletonBox width="55%" height={11} borderRadius={4} style={{ marginTop: 8 }} />
            <SkeletonBox width="35%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Full-width post card — matches PostCard in FeedScreen
export function SkeletonPostCard() {
  return (
    <View style={styles.postCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <SkeletonBox width={42} height={42} borderRadius={21} />
        <View style={{ marginLeft: 10 }}>
          <SkeletonBox width={130} height={12} borderRadius={4} />
          <SkeletonBox width={80} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonBox width="100%" height={13} borderRadius={4} />
      <SkeletonBox width="80%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
      <SkeletonBox width="100%" height={200} borderRadius={12} style={{ marginTop: 12 }} />
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 20 }}>
        <SkeletonBox width={56} height={10} borderRadius={4} />
        <SkeletonBox width={56} height={10} borderRadius={4} />
        <SkeletonBox width={56} height={10} borderRadius={4} />
      </View>
    </View>
  );
}

// Three stacked post skeletons for the feed empty state
export function SkeletonFeed() {
  return (
    <View>
      <SkeletonPostCard />
      <SkeletonPostCard />
      <SkeletonPostCard />
    </View>
  );
}

const styles = StyleSheet.create({
  htmlCard: {
    width: 280,
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  albumCard: {
    width: 160,
    marginRight: 16,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  postCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
