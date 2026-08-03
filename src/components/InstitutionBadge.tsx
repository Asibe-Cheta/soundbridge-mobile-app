import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';

export type InstitutionBadgeId = 'abbey_road_institute' | 'sound_academy';

const BADGE_ASSETS: Record<InstitutionBadgeId, any> = {
  abbey_road_institute: require('../../assets/images/abb-badge.png'),
  sound_academy: require('../../assets/sa-2.png'),
};

type Props = {
  institution: string | null | undefined;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export default function InstitutionBadge({ institution, size = 18, style }: Props) {
  if (!institution || !(institution in BADGE_ASSETS)) return null;
  const source = BADGE_ASSETS[institution as InstitutionBadgeId];
  return (
    <Image
      source={source}
      style={[{ width: size, height: size, marginLeft: 5 }, style]}
      resizeMode="contain"
    />
  );
}
