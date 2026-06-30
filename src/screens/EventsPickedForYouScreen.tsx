import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { eventMatchIntelligenceService } from '../services/EventMatchIntelligenceService';
import EventForYouBadge from '../components/EventForYouBadge';
import { getMatchEvent, type EventMatchScore } from '../types/eventMatch.types';

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
}

export default function EventsPickedForYouScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [matches, setMatches] = useState<EventMatchScore[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setMatches([]);
        setLoading(false);
        return;
      }
      let active = true;
      setLoading(true);
      (async () => {
        const rows = await eventMatchIntelligenceService.fetchHighConfidenceMatches(user.id);
        if (!active) return;
        setMatches(rows);
        const unseenIds = rows.filter(r => !r.indicator_shown).map(r => r.id);
        await eventMatchIntelligenceService.markMatchesViewed(user.id, unseenIds);
        setLoading(false);
      })();
      return () => { active = false; };
    }, [user?.id]),
  );

  const renderItem = ({ item }: { item: typeof matches[number] }) => {
    const event = getMatchEvent(item);
    if (!event) return null;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        activeOpacity={0.88}
        onPress={() =>
          (navigation as any).navigate('EventDetails', { eventId: event.id, event })
        }
      >
        <View style={styles.imageWrap}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#1E1235', '#3B1D8A']}
              style={styles.imagePlaceholder}
            >
              <Ionicons name="calendar" size={32} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          <EventForYouBadge style={styles.badgeOverlay} />
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {formatEventDate(event.event_date)}
            </Text>
          </View>

          {(event.venue || event.location) ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {[event.venue, event.location].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}

          {item.personalised_reason ? (
            <Text style={[styles.reason, { color: theme.colors.textSecondary }]}>
              {item.personalised_reason}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Events picked for you</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && matches.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No picks right now</Text>
          <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
            We will surface events that genuinely fit your taste when we find a strong match.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 40,
  },
  headerSpacer: { width: 0 },
  listContent: { padding: 16, paddingBottom: 32, gap: 14 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 160 },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  cardBody: { padding: 14, gap: 6 },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, flex: 1 },
  reason: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
