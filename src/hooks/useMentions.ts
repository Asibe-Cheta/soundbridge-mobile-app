import { useState, useRef, useEffect, useCallback } from 'react';
import { dbHelpers } from '../lib/supabase';

export interface MentionUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Mention {
  userId: string;
  username: string;
  display_name: string;
}

interface ActiveMention {
  query: string;
  startIndex: number;
  endIndex: number;
}

export function useMentions() {
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmedMentions, setConfirmedMentions] = useState<Mention[]>([]);
  const cursorPosRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const textBefore = text.slice(0, cursorPos);
    // Match @ followed by word characters up to cursor (no spaces allowed in query)
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      const startIndex = cursorPos - match[0].length;
      setActiveMention({ query: match[1], startIndex, endIndex: cursorPos });
      setSelectedIndex(0);
    } else {
      setActiveMention(null);
      setSuggestions([]);
    }
  }, []);

  const handleSelectionChange = useCallback(
    (selection: { start: number; end: number }, text: string) => {
      cursorPosRef.current = selection.start;
      detectMention(text, selection.start);
    },
    [detectMention]
  );

  const handleTextChange = useCallback(
    (text: string) => {
      detectMention(text, cursorPosRef.current);
      // Keep confirmed mentions in sync — remove any no longer in the content
      setConfirmedMentions(prev => prev.filter(m => text.includes(`@${m.username}`)));
    },
    [detectMention]
  );

  // Debounced Supabase search triggered whenever the query changes
  useEffect(() => {
    if (!activeMention) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await dbHelpers.searchAllUsers(activeMention.query, 8);
        if (result.success && result.data) {
          setSuggestions(
            result.data.map((u: any) => ({
              id: u.id,
              username: u.username,
              display_name: u.display_name,
              avatar_url: u.avatar_url,
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [activeMention?.query]);

  // Returns the updated content string after inserting the mention token
  const selectMention = useCallback(
    (user: MentionUser, currentContent: string): string => {
      if (!activeMention) return currentContent;

      const before = currentContent.slice(0, activeMention.startIndex);
      const after = currentContent.slice(activeMention.endIndex);
      const insertion = `@${user.username} `;
      const newContent = `${before}${insertion}${after}`;

      cursorPosRef.current = activeMention.startIndex + insertion.length;

      setConfirmedMentions(prev => {
        if (prev.some(m => m.userId === user.id)) return prev;
        return [...prev, { userId: user.id, username: user.username, display_name: user.display_name }];
      });

      setActiveMention(null);
      setSuggestions([]);

      return newContent;
    },
    [activeMention]
  );

  const dismissSuggestions = useCallback(() => {
    setActiveMention(null);
    setSuggestions([]);
  }, []);

  const moveSelectionUp = useCallback(() => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const moveSelectionDown = useCallback((total: number) => {
    setSelectedIndex(prev => (prev < total - 1 ? prev + 1 : prev));
  }, []);

  const isDropdownVisible = activeMention !== null && (loading || suggestions.length > 0);

  return {
    activeMention,
    suggestions,
    loading,
    selectedIndex,
    confirmedMentions,
    isDropdownVisible,
    handleSelectionChange,
    handleTextChange,
    selectMention,
    dismissSuggestions,
    moveSelectionUp,
    moveSelectionDown,
  };
}
