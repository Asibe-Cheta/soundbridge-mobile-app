# COMPLETE CURSOR PROMPT: Convert HTML Discover Screen to React Native

## PART 1: HTML REFERENCE CODE

Below is the HTML/Tailwind design that needs to be converted to React Native. This shows the EXACT visual design we want.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SoundBridge - Discover Screen</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bricolage+Grotesque:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body { 
    font-family: 'Inter', sans-serif; 
    margin: 0;
    padding: 0;
}
.font-bricolage { font-family: 'Bricolage Grotesque', sans-serif !important; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { 
    -ms-overflow-style: none; 
    scrollbar-width: none; 
}
</style>
</head>
<body class="min-h-screen flex items-center justify-center bg-[#0a0510] w-full overflow-hidden">

    <!-- DISCOVER SCREEN CONTAINER -->
    <div class="relative flex items-center justify-center">
        
        <!-- DISCOVER SCREEN FRAME -->
        <div class="relative w-[393px] h-[852px] bg-gradient-to-b from-[#130722] via-[#240c3e] to-[#2e1065] rounded-[55px] border-[12px] border-[#0a0a0a] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col ring-1 ring-white/10">

            <!-- Status Bar -->
            <div class="px-6 py-3 flex justify-between items-center text-white z-50 mt-1">
                <span class="text-sm font-medium font-sans">9:41</span>
                <div class="flex gap-2 items-center">
                    <span class="iconify" data-icon="solar:signal-linear" data-width="16"></span>
                    <span class="iconify" data-icon="solar:wi-fi-linear" data-width="16"></span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                        <g fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M2 12c0-3.771 0-5.657 1.172-6.828S6.229 4 10 4h1.5c3.771 0 5.657 0 6.828 1.172S19.5 8.229 19.5 12s0 5.657-1.172 6.828S15.271 20 11.5 20H10c-3.771 0-5.657 0-6.828-1.172S2 15.771 2 12Z"></path>
                            <path stroke-linecap="round" d="M7 9s.5.9.5 3s-.5 3-.5 3m3.5-6s.5.9.5 3s-.5 3-.5 3M14 9s.5.9.5 3s-.5 3-.5 3"></path>
                            <path d="M20 10c.943 0 1.414 0 1.707.293S22 11.057 22 12s0 1.414-.293 1.707S20.943 14 20 14z"></path>
                        </g>
                    </svg>
                </div>
            </div>
            
            <!-- Dynamic Island -->
            <div class="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-40"></div>

            <!-- Minimal Top Navigation -->
            <div class="px-6 pt-6 pb-2 flex justify-between items-center z-30">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" class="text-white">
                    <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M20 7H4m16 5H4m16 5H4"></path>
                </svg>
                <div class="flex gap-5 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="text-white">
                        <g fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="11.5" cy="11.5" r="9.5"></circle>
                            <path stroke-linecap="round" d="M18.5 18.5L22 22"></path>
                        </g>
                    </svg>
                    <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="text-white">
                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19H6.2c-.75 0-1.12 0-1.46-.11a1.9 1.9 0 0 1-1.3-.92C3.25 17.65 3.38 17.3 3.65 16.6L4.2 15a4 4 0 0 1 4-4h7.8c1.68 0 2.52 0 3.16.33a3 3 0 0 1 1.31 1.31C21 13.28 21 14.12 21 15.8c0 1.68 0 2.52-.33 3.16a3 3 0 0 1-1.31 1.31C18.72 20.6 17.88 20.6 16.2 20.6H16"></path>
                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9l-2.4-6H8.4L6 9"></path>
                        </svg>
                        <span class="absolute top-0 right-0 w-2 h-2 bg-[#EC4899] rounded-full border border-[#130722]"></span>
                    </div>
                </div>
            </div>

            <!-- SCROLLABLE CONTENT -->
            <div class="flex-1 overflow-y-auto hide-scrollbar pb-8 relative z-10">
                
                <!-- Main Header -->
                <div class="px-6 mt-8 mb-6">
                    <h2 class="text-[52px] leading-none tracking-tight text-white font-bricolage font-light mb-2">
                        Discover
                    </h2>
                    <p class="text-white/60 text-[15px] font-sans font-normal tracking-wide">
                        Find music, podcasts, events, venues, services, and creators
                    </p>
                </div>

                <!-- Text-only Tab Navigation -->
                <div class="px-6 mb-8 flex gap-8 overflow-x-auto hide-scrollbar items-baseline pb-2 pr-6">
                    <span class="text-[28px] text-white cursor-pointer font-sans font-semibold tracking-tight whitespace-nowrap">
                        Music
                    </span>
                    <span class="text-[28px] text-white/40 hover:text-white/70 transition-colors cursor-pointer font-sans font-normal tracking-tight whitespace-nowrap">
                        Artists
                    </span>
                    <span class="text-[28px] text-white/40 hover:text-white/70 transition-colors cursor-pointer font-sans font-normal tracking-tight whitespace-nowrap">
                        Events
                    </span>
                    <span class="text-[28px] text-white/40 hover:text-white/70 transition-colors cursor-pointer font-sans font-normal tracking-tight whitespace-nowrap">
                        Venues
                    </span>
                </div>

                <!-- Section: Trending This Week -->
                <div>
                    <div class="px-6 mb-4 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="iconify text-[#EC4899]" data-icon="solar:flame-linear" data-width="20"></span>
                            <h3 class="text-[20px] font-semibold text-white font-sans tracking-tight">Trending This Week</h3>
                        </div>
                        <button class="flex items-center gap-1 text-[#EC4899] text-sm font-medium hover:text-[#EC4899]/80 transition-colors">
                            See all
                            <span class="iconify" data-icon="solar:alt-arrow-right-linear" data-width="14"></span>
                        </button>
                    </div>

                    <!-- Horizontal Scrolling Cards -->
                    <div class="flex overflow-x-auto hide-scrollbar px-6 gap-4 pb-8">
                        
                        <!-- Card 1: Music Track -->
                        <div class="w-[280px] h-[380px] bg-white/[0.05] rounded-[24px] shrink-0 relative overflow-hidden flex flex-col justify-end p-0 group backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors">
                            <!-- Badge -->
                            <div class="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-[12px] bg-white/10 border border-white/20 backdrop-blur-md">
                                <span class="text-[10px] font-bold text-white tracking-widest uppercase font-sans">New</span>
                            </div>
                            
                            <!-- Play Button -->
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
                                <div class="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center">
                                     <span class="iconify text-white" data-icon="solar:play-circle-linear" data-width="36"></span>
                                </div>
                            </div>

                            <!-- Image with Gradient Overlay -->
                            <div class="absolute inset-0 w-full h-full">
                                <img src="https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Abstract Cover Art">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                            </div>

                            <!-- Card Content -->
                            <div class="relative z-10 p-5 w-full">
                                <h3 class="text-white text-2xl font-bold tracking-tight leading-none mb-1 font-sans">Neon Nights</h3>
                                <p class="text-white/70 text-base font-sans mb-3">Midnight Pulse</p>
                                <div class="flex items-center gap-3 text-white/40 text-xs font-medium">
                                    <span class="flex items-center gap-1">
                                        <span class="iconify" data-icon="solar:headphones-round-linear" data-width="12"></span>
                                        125k
                                    </span>
                                    <span class="w-1 h-1 rounded-full bg-white/30"></span>
                                    <span>Electronic</span>
                                </div>
                            </div>
                        </div>

                        <!-- Card 2: Artist Profile -->
                        <div class="w-[280px] h-[380px] bg-white/[0.05] rounded-[24px] shrink-0 relative overflow-hidden flex flex-col justify-end p-0 group backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors">
                            <!-- Badge -->
                            <div class="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-[12px] bg-white/10 border border-white/20 backdrop-blur-md">
                                <span class="text-[10px] font-bold text-[#EC4899] tracking-widest uppercase font-sans">Rising</span>
                            </div>

                            <!-- Image with Gradient Overlay -->
                            <div class="absolute inset-0 w-full h-full">
                                <img src="https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" alt="Artist Profile">
                                <div class="absolute inset-0 bg-gradient-to-t from-[#130722] via-[#130722]/50 to-transparent"></div>
                            </div>

                            <!-- Card Content - Centered for Artist -->
                            <div class="relative z-10 p-5 w-full flex flex-col items-center text-center pb-8">
                                <div class="w-20 h-20 rounded-full border-2 border-[#EC4899] p-1 mb-4">
                                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" class="w-full h-full rounded-full object-cover" alt="Artist Avatar">
                                </div>
                                <h3 class="text-white text-2xl font-bold tracking-tight leading-none mb-1 font-sans">Alex Rivera</h3>
                                <p class="text-white/70 text-sm font-sans mb-4">2.4M Followers</p>
                                <button class="px-6 py-2 bg-[#EC4899] hover:bg-[#db2777] text-white text-sm font-semibold rounded-full transition-colors w-full">
                                    Follow
                                </button>
                            </div>
                        </div>

                        <!-- Card 3: Event -->
                        <div class="w-[280px] h-[380px] bg-white/[0.05] rounded-[24px] shrink-0 relative overflow-hidden flex flex-col justify-end p-0 group backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors">
                            <!-- Image with Gradient Overlay -->
                            <div class="absolute inset-0 w-full h-full">
                                <img src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Concert">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                            </div>

                            <!-- Card Content -->
                            <div class="relative z-10 p-5 w-full">
                                <span class="text-[#EC4899] text-xs font-bold tracking-wider uppercase mb-2 block">Live Event</span>
                                <h3 class="text-white text-2xl font-bold tracking-tight leading-tight mb-3 font-sans">Summer Bass Festival 2024</h3>
                                <div class="flex flex-col gap-1.5 text-white/80 text-sm">
                                    <div class="flex items-center gap-2">
                                        <span class="iconify" data-icon="solar:calendar-linear" data-width="14"></span>
                                        <span>Aug 24 • 8:00 PM</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="iconify" data-icon="solar:map-point-linear" data-width="14"></span>
                                        <span>Brooklyn Mirage, NY</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Section: Empty State / Call-to-Action -->
                <div class="px-6 pb-8">
                    <div class="w-full rounded-[24px] border border-white/10 bg-white/[0.03] p-6 flex flex-col items-center text-center gap-3 backdrop-blur-sm">
                        <span class="iconify text-white/20" data-icon="solar:microphone-3-linear" data-width="40"></span>
                        <p class="text-white/60 text-base font-medium">Start your own journey</p>
                        <p class="text-white/40 text-sm leading-relaxed max-w-[200px]">Upload tracks, host events, and build your fanbase.</p>
                        <a href="#" class="text-[#EC4899] text-sm font-semibold mt-1">Learn More</a>
                    </div>
                </div>

            </div>
            <!-- END SCROLLABLE CONTENT -->

        </div>
        <!-- END DISCOVER SCREEN FRAME -->

    </div>

</body>
</html>
```

---

## PART 2: CONVERSION REQUIREMENTS

### YOUR TASK:
Convert the above HTML design to React Native in the existing `src/screens/DiscoverScreen.tsx` file.

### CRITICAL RULES:

1. **PRESERVE ALL EXISTING FUNCTIONALITY**
   - ✅ Keep ALL data fetching logic (API calls to Supabase)
   - ✅ Keep ALL business logic
   - ✅ Keep ALL navigation
   - ✅ Keep ALL state management
   - ✅ Keep ALL event handlers
   - ✅ This is a VISUAL redesign only

2. **USE REAL DATA - NO MOCK DATA**
   - Find existing state variables: `tracks`, `artists`, `events`, `venues`, `services`
   - Find existing API calls and data fetching functions
   - Connect the new card designs to this REAL data
   - Display actual track titles, artist names, play counts, etc.

3. **SEARCH FUNCTIONALITY**
   - The minimal top nav has a search icon
   - Clicking it should open a modal/overlay with search input
   - This search must use the DISCOVER SCREEN's search logic
   - DO NOT use the global top navigation search
   - Find existing `searchQuery`, `handleSearch`, `filteredResults` variables
   - Connect them to the new search UI

4. **SUBTITLE TEXT**
   - Update from: "Find music, events, and creators"
   - Update to: **"Find music, podcasts, events, venues, services, and creators"**

---

## PART 3: REACT NATIVE CONVERSION GUIDE

### Components to Import:
```typescript
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  Pressable,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
```

### HTML to React Native Conversion:

**Gradients:**
```html
HTML: class="bg-gradient-to-b from-[#130722] via-[#240c3e] to-[#2e1065]"

React Native:
<LinearGradient
  colors={['#130722', '#240c3e', '#2e1065']}
  style={StyleSheet.absoluteFill}
/>
```

**Glassmorphic Cards:**
```html
HTML: class="bg-white/[0.05] backdrop-blur-md border border-white/10"

React Native:
<BlurView intensity={20} tint="dark" style={styles.cardBlur}>
  <View style={{
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  }}>
```

**Icons:**
```html
HTML: <span class="iconify" data-icon="solar:flame-linear" data-width="20"></span>

React Native: <Ionicons name="flame-outline" size={20} color="#EC4899" />
```

**Horizontal Scrolling:**
```html
HTML: <div class="flex overflow-x-auto hide-scrollbar gap-4">

React Native:
<FlatList
  horizontal
  data={trendingData}
  renderItem={({ item }) => <MusicCard track={item} />}
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingLeft: 24, gap: 16 }}
/>
```

---

## PART 4: COMPONENT STRUCTURE

Create this layout in DiscoverScreen.tsx:

```typescript
export default function DiscoverScreen() {
  // KEEP ALL EXISTING STATE AND LOGIC HERE
  // const [tracks, setTracks] = useState([]);
  // const [activeTab, setActiveTab] = useState('Music');
  // const [searchQuery, setSearchQuery] = useState('');
  // etc...

  const [searchModalVisible, setSearchModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#130722', '#240c3e', '#2e1065']}
        style={StyleSheet.absoluteFill}
      />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.time}>9:41</Text>
        <View style={styles.statusIcons}>
          <Ionicons name="cellular" size={16} color="white" />
          <Ionicons name="wifi" size={16} color="white" />
          <Ionicons name="battery-full" size={16} color="white" />
        </View>
      </View>

      {/* Minimal Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={handleMenuPress}>
          <Ionicons name="menu" size={26} color="white" />
        </TouchableOpacity>
        <View style={styles.topNavRight}>
          <TouchableOpacity onPress={() => setSearchModalVisible(true)}>
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMessagesPress}>
            <View>
              <Ionicons name="chatbubble-outline" size={24} color="white" />
              {unreadMessages > 0 && <View style={styles.notificationDot} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>
            Find music, podcasts, events, venues, services, and creators
          </Text>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Music', 'Artists', 'Events', 'Venues', 'Services', 'Playlists'].map(tab => (
            <TouchableOpacity key={tab} onPress={() => handleTabPress(tab)}>
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="flame-outline" size={20} color="#EC4899" />
              <Text style={styles.sectionTitle}>Trending This Week</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Cards - USE REAL DATA */}
          <FlatList
            horizontal
            data={trendingData} // REAL DATA
            renderItem={({ item }) => renderCard(item)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <Ionicons name="mic-outline" size={40} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyStateTitle}>Start your own journey</Text>
          <Text style={styles.emptyStateText}>
            Upload tracks, host events, and build your fanbase.
          </Text>
          <TouchableOpacity>
            <Text style={styles.learnMoreLink}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={searchModalVisible} animationType="slide" transparent>
        <BlurView intensity={80} style={styles.modalContainer}>
          <View style={styles.searchModal}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search music, artists, events..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={handleSearchChange} // USE EXISTING FUNCTION
            />
            <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {/* Show filtered results using EXISTING filtered data */}
        </BlurView>
      </Modal>
    </View>
  );
}
```

---

## PART 5: CARD COMPONENTS WITH REAL DATA

Create these components that accept REAL data:

```typescript
interface MusicCardProps {
  track: {
    id: string;
    title: string;
    artist_name: string;
    cover_url: string;
    play_count: number;
    genre: string;
    created_at: string;
  };
}

const MusicCard: React.FC<MusicCardProps> = ({ track }) => {
  const isNew = isWithinDays(track.created_at, 7);
  
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('TrackDetail', { trackId: track.id })}
    >
      {isNew && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NEW</Text>
        </View>
      )}

      <Image 
        source={{ uri: track.cover_url }}
        style={styles.cardImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{track.title}</Text>
        <Text style={styles.cardArtist}>{track.artist_name}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="headset-outline" size={12} color="rgba(255,255,255,0.4)" />
          <Text style={styles.cardMetaText}>{formatPlayCount(track.play_count)}</Text>
          <View style={styles.dot} />
          <Text style={styles.cardMetaText}>{track.genre}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
```

---

## PART 6: COMPLETE STYLESHEET

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#130722',
  },
  
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  time: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 8,
  },

  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  topNavRight: {
    flexDirection: 'row',
    gap: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC4899',
  },

  header: {
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 24,
  },
  title: {
    fontSize: 52,
    color: '#FFFFFF',
    fontWeight: '300',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },

  tabText: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
    letterSpacing: -0.5,
    marginRight: 32,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seeAllText: {
    fontSize: 14,
    color: '#EC4899',
  },

  card: {
    width: 280,
    height: 380,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginRight: 16,
  },
  cardImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },

  cardContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardArtist: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardMetaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  emptyState: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  learnMoreLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC4899',
  },
});
```

---

## PART 7: HELPER FUNCTIONS

```typescript
const formatPlayCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const isWithinDays = (dateString: string, days: number): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
};

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  return `${month} ${day} • ${time}`;
};
```

---

## PART 8: ACTION ITEMS

1. ✅ Find existing DiscoverScreen.tsx file
2. ✅ Backup current file (copy to DiscoverScreen.OLD.tsx)
3. ✅ Identify ALL existing state variables and functions
4. ✅ Convert HTML layout to React Native using the guide above
5. ✅ Create card components that accept real data props
6. ✅ Connect new UI to existing data and logic
7. ✅ Implement search modal connected to existing search logic
8. ✅ Update subtitle text to include podcasts, venues, services
9. ✅ Test ALL functionality
10. ✅ Verify everything works with real data

---

## SUMMARY

You now have:
1. ✅ Complete HTML reference showing exact design
2. ✅ Full conversion guide (HTML → React Native)
3. ✅ Complete component structure
4. ✅ Full StyleSheet with all values
5. ✅ Card components with real data props
6. ✅ Helper functions
7. ✅ Search implementation strategy

**Convert the HTML design to React Native while preserving ALL existing functionality and using REAL data from Supabase.**