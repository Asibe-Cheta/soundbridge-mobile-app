import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';

interface Props {
  tier: 'premium' | 'unlimited';
  size?: number;
}

export default function PremiumBadge({ tier, size = 16 }: Props) {
  return (
    <View style={styles.row}>
      <Image
        source={require('../../assets/images/icon.png')}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        resizeMode="cover"
      />
      {tier === 'unlimited' && (
        <Text style={[styles.plus, { fontSize: size * 0.65 }]}>+</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  plus: {
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 16,
  },
});
