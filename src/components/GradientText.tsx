import React, { useState } from 'react';
import { Text, View, TextStyle } from 'react-native';
import Svg, { Defs, Filter, FeGaussianBlur, Text as SvgText } from 'react-native-svg';

interface GradientTextProps {
  children: string;
  style?: TextStyle;
}

// Solid gold with neon glow — high contrast on dark purple
const GOLD_COLOR = '#FBBF24';
const GLOW_COLOR = '#F59E0B';
const GLOW_PAD = 12;

export default function GradientText({ children, style }: GradientTextProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const fontSize      = (style?.fontSize     as number) ?? 24;
  const fontWeight    = (style?.fontWeight   as string) ?? '600';
  const fontFamily    = (style?.fontFamily   as string) ?? 'Inter_600SemiBold';
  const lineHeight    = (style?.lineHeight   as number) ?? fontSize * 1.3;
  const letterSpacing = (style?.letterSpacing as number) ?? 0;

  const svgW  = size ? size.width  + GLOW_PAD * 2 : 0;
  const svgH  = size ? size.height + GLOW_PAD * 2 : 0;
  const textY = GLOW_PAD + lineHeight * 0.78;
  const textX = svgW / 2;

  return (
    <View>
      <Text
        style={[style, { opacity: 0 }]}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) setSize({ width, height });
        }}
      >
        {children}
      </Text>

      {size && (
        <Svg
          width={svgW}
          height={svgH}
          style={{ position: 'absolute', top: -GLOW_PAD, left: -GLOW_PAD }}
        >
          <Defs>
            <Filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <FeGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </Filter>
          </Defs>

          {/* Glow layer 1 — wide, amber */}
          <SvgText
            fill={GLOW_COLOR}
            opacity={0.55}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            letterSpacing={letterSpacing}
            x={textX}
            y={textY}
            textAnchor="middle"
            filter="url(#glow)"
          >
            {children}
          </SvgText>

          {/* Glow layer 2 — tighter, bright gold core */}
          <SvgText
            fill={GOLD_COLOR}
            opacity={0.25}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            letterSpacing={letterSpacing}
            x={textX}
            y={textY}
            textAnchor="middle"
            filter="url(#glow)"
          >
            {children}
          </SvgText>

          {/* Sharp solid gold text on top */}
          <SvgText
            fill={GOLD_COLOR}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            letterSpacing={letterSpacing}
            x={textX}
            y={textY}
            textAnchor="middle"
          >
            {children}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
