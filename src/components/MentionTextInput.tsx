import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  TextStyle,
} from 'react-native';

interface Props extends TextInputProps {
  /** Usernames of confirmed mentions to highlight (without @). */
  mentionUsernames: string[];
  mentionColor: string;
  /** Extra text styles forwarded to both layers (e.g. fontSize, fontFamily). */
  sharedTextStyle?: StyleProp<TextStyle>;
}

/** Parse the value into plain-text and @mention segments. */
function parseSegments(
  value: string,
  usernames: string[]
): Array<{ text: string; isMention: boolean }> {
  if (!value || usernames.length === 0) return [{ text: value, isMention: false }];

  const segments: Array<{ text: string; isMention: boolean }> = [];
  let pos = 0;

  while (pos < value.length) {
    const atIdx = value.indexOf('@', pos);
    if (atIdx === -1) {
      segments.push({ text: value.slice(pos), isMention: false });
      break;
    }
    if (atIdx > pos) {
      segments.push({ text: value.slice(pos, atIdx), isMention: false });
    }

    let matched = false;
    for (const un of usernames) {
      const token = `@${un}`;
      if (value.startsWith(token, atIdx)) {
        const charAfter = value[atIdx + token.length];
        // Only treat as mention if followed by a non-word char or end of string
        if (!charAfter || /\W/.test(charAfter)) {
          segments.push({ text: token, isMention: true });
          pos = atIdx + token.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      segments.push({ text: '@', isMention: false });
      pos = atIdx + 1;
    }
  }

  return segments;
}

/**
 * A drop-in replacement for TextInput that renders confirmed @mention tokens
 * in a distinct accent colour using a transparent-text overlay technique.
 *
 * When no confirmed mentions exist the component renders a plain TextInput
 * with zero extra overhead.
 */
export const MentionTextInput = forwardRef<TextInput, Props>(
  function MentionTextInput(
    { mentionUsernames, mentionColor, sharedTextStyle, value = '', style, ...props },
    ref
  ) {
    const segments = parseSegments(value, mentionUsernames);
    const hasMentions = segments.some(s => s.isMention);

    // No confirmed mentions yet — use a plain TextInput (no layering overhead)
    if (!hasMentions) {
      return (
        <TextInput
          ref={ref}
          value={value}
          style={[style, sharedTextStyle, styles.base]}
          {...props}
        />
      );
    }

    return (
      <View>
        {/*
         * Display layer: renders the styled text with coloured @mentions.
         * Positioned absolutely so it never drives layout; the TextInput below
         * controls the View's height instead.
         * pointerEvents="none" lets all touches pass through to the TextInput.
         */}
        <Text
          style={[style, sharedTextStyle, styles.base, styles.displayLayer]}
          pointerEvents="none"
          selectable={false}
          aria-hidden
        >
          {segments.map((seg, i) =>
            seg.isMention ? (
              <Text key={i} style={[{ color: mentionColor }, styles.mentionToken]}>
                {seg.text}
              </Text>
            ) : (
              <Text key={i}>{seg.text}</Text>
            )
          )}
          {/* Zero-width space prevents the Text from collapsing when value is empty */}
          {'\u200b'}
        </Text>

        {/*
         * Input capture layer: transparent text so the display layer shows
         * through; cursor and selection highlights remain fully visible.
         */}
        <TextInput
          ref={ref}
          value={value}
          style={[style, sharedTextStyle, styles.base, styles.inputLayer]}
          {...props}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  // Shared by both layers — ensures pixel-perfect text alignment
  base: {
    padding: 0,
    margin: 0,
  },
  displayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  inputLayer: {
    color: 'transparent',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  mentionToken: {
    fontWeight: '600',
  },
});
