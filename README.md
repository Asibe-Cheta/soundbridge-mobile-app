# SoundBridge Mobile App

A comprehensive React Native mobile application for SoundBridge - a professional networking and music streaming platform for audio creators. Built with Expo, React Native, and Supabase.

## 📊 Project Status

**Current Progress: ~60% MVP Complete**

The app is in active development with core authentication, navigation, and key features implemented. The foundation is solid and ready for feature expansion.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **iOS Simulator** (for iOS development) or **Android Studio/Emulator** (for Android development)
- **Expo Go app** (for testing on physical devices)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Asibe-Cheta/soundbridge-mobile-app.git
   cd soundbridge-mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_API_URL=https://www.soundbridge.live
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   ```

4. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

5. **Run on your device:**
   - **iOS Simulator:** Press `i` in the terminal
   - **Android Emulator:** Press `a` in the terminal
   - **Physical Device:** Install Expo Go and scan the QR code

---

## 🏗️ Architecture

### Project Structure

```
soundbridge-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── GlassmorphicTabBar.tsx
│   │   ├── MiniPlayer.tsx
│   │   ├── PasswordStrengthIndicator.tsx
│   │   ├── BackupCodesModal.tsx
│   │   └── ...
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── AudioPlayerContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── CollaborationContext.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useCollaborationPerformance.ts
│   │   └── useUserPreferences.ts
│   ├── lib/               # Core libraries
│   │   ├── supabase.ts    # Supabase client configuration
│   │   └── apiClient.ts   # API client utilities
│   ├── screens/           # Screen components (50+ screens)
│   │   ├── AuthScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── DiscoverScreen.tsx
│   │   └── ...
│   ├── services/          # Business logic services
│   │   ├── twoFactorAuthService.ts
│   │   ├── WalletService.ts
│   │   ├── TipService.ts
│   │   └── ...
│   ├── types/             # TypeScript type definitions
│   │   ├── twoFactor.ts
│   │   ├── collaboration.ts
│   │   └── database.ts
│   └── utils/             # Utility functions
│       ├── dataLoading.ts
│       ├── logStore.ts
│       └── collaborationUtils.ts
├── App.tsx                # Main app entry point
├── package.json
└── README.md
```

### Navigation Structure

- **Stack Navigator** - Main app navigation
- **Bottom Tab Navigator** - Primary navigation (Home, Discover, Upload, Messages, Profile)
- **Nested Stack Navigators** - Feature-specific navigation

---

## 🔐 Authentication

### Implemented Authentication Methods

#### 1. **Email/Password Authentication**
- ✅ Sign up with email and password
- ✅ Sign in with email and password
- ✅ Password reset functionality
- ✅ Email verification
- ✅ Password strength validation

#### 2. **Two-Factor Authentication (2FA)**
- ✅ **TOTP (Time-based One-Time Password)** - Google Authenticator compatible
- ✅ **Backup Codes** - 8-character recovery codes
- ✅ **Secure Login Flow** - Checks 2FA before creating session (prevents app flash)
- ✅ **2FA Setup Screen** - QR code generation and verification
- ✅ **2FA Settings Screen** - Enable/disable, regenerate backup codes
- ✅ **2FA Verification Screen** - Code input during login

**2FA Flow:**
1. User enters email/password
2. Backend validates credentials via `/api/auth/login-initiate`
3. If 2FA enabled, returns `verificationSessionId` (no session created)
4. User enters 6-digit TOTP code
5. Backend verifies code via `/api/user/2fa/verify-code`
6. Backend returns access/refresh tokens
7. Mobile app sets Supabase session
8. User navigates to main app

#### 3. **Google OAuth**
- ✅ Sign in with Google account
- ✅ OAuth redirect handling
- ✅ Session management

#### 4. **Biometric Authentication**
- ✅ Face ID / Touch ID support (iOS)
- ✅ Fingerprint authentication (Android)
- ✅ Secure credential storage

### Authentication Context

The `AuthContext` provides:
- User state management
- Session management
- Authentication methods (signIn, signUp, signOut, etc.)
- Onboarding status tracking
- 2FA check flag management

---

## 📱 Screens

### Core Navigation Screens

#### **Home Screen** (`HomeScreen.tsx`)
- ✅ Featured creators display
- ✅ Creator earning cards
- ✅ Value proposition cards
- ✅ Live audio sessions banner
- ✅ Trending music section
- ✅ Hot creators section
- ✅ Events feed
- ✅ Parallel data loading with timeouts
- ✅ Optimized queries for performance

#### **Discover Screen** (`DiscoverScreen.tsx`)
- ✅ Search functionality
- ✅ Tab navigation (Music, Artists, Events, Playlists)
- ✅ Advanced search filters
- ✅ Featured artists with real data
- ✅ Search results display
- ✅ Optimized data loading

#### **Upload Screen** (`UploadScreen.tsx`)
- ✅ File picker integration
- ✅ Upload quota management
- ✅ Progress tracking
- ✅ Metadata input (title, description, tags)

#### **Messages Screen** (`MessagesScreen.tsx`)
- ✅ Conversation list
- ✅ Real-time messaging support
- ✅ Chat interface

#### **Profile Screen** (`ProfileScreen.tsx`)
- ✅ User profile display
- ✅ Edit profile functionality
- ✅ Settings navigation
- ✅ Statistics display
- ✅ Optimized data loading

### Authentication Screens

#### **Auth Screen** (`AuthScreen.tsx`)
- ✅ Login form
- ✅ Sign up form
- ✅ Password reset
- ✅ Google OAuth button
- ✅ 2FA flow integration
- ✅ Navigation to 2FA verification

#### **Two-Factor Verification Screen** (`TwoFactorVerificationScreen.tsx`)
- ✅ 6-digit code input
- ✅ Backup code option
- ✅ Auto-submit on 6 digits
- ✅ Error handling
- ✅ Loading states
- ✅ Navigation after verification

#### **Two-Factor Setup Screen** (`TwoFactorSetupScreen.tsx`)
- ✅ QR code display
- ✅ Manual secret entry
- ✅ Code verification
- ✅ Backup codes generation

#### **Two-Factor Settings Screen** (`TwoFactorSettingsScreen.tsx`)
- ✅ Enable/disable 2FA
- ✅ Regenerate backup codes
- ✅ View backup codes

### Creator Screens

#### **Creator Profile Screen** (`CreatorProfileScreen.tsx`)
- ✅ Creator profile display
- ✅ Track listings
- ✅ Follow/unfollow functionality
- ✅ Tip creator button

#### **Creator Setup Screen** (`CreatorSetupScreen.tsx`)
- ✅ Creator onboarding
- ✅ Profile completion
- ✅ Creator type selection

#### **All Creators Screen** (`AllCreatorsScreen.tsx`)
- ✅ Browse all creators
- ✅ Filter and search
- ✅ Creator cards display

### Event Screens

#### **All Events Screen** (`AllEventsScreen.tsx`)
- ✅ Browse all events
- ✅ Event filtering
- ✅ Event cards display

#### **Event Details Screen** (`EventDetailsScreen.tsx`)
- ✅ Event information
- ✅ RSVP functionality
- ✅ Event location

#### **Create Event Screen** (`CreateEventScreen.tsx`)
- ✅ Event creation form
- ✅ Date/time picker
- ✅ Location selection

### Audio & Playback Screens

#### **Audio Player Screen** (`AudioPlayerScreen.tsx`)
- ✅ Full-screen audio player
- ✅ Playback controls
- ✅ Progress bar
- ✅ Track information
- ✅ Queue management

#### **Track Details Screen** (`TrackDetailsScreen.tsx`)
- ✅ Track information
- ✅ Artist details
- ✅ Play/pause controls
- ✅ Add to playlist

#### **Playlist Details Screen** (`PlaylistDetailsScreen.tsx`)
- ✅ Playlist tracks
- ✅ Playlist information
- ✅ Edit playlist

#### **Create Playlist Screen** (`CreatePlaylistScreen.tsx`)
- ✅ Create new playlist
- ✅ Add tracks
- ✅ Playlist settings

### Live Sessions Screens

#### **Live Sessions Screen** (`LiveSessionsScreen.tsx`)
- ✅ Browse live sessions
- ✅ Join live sessions
- ✅ Session schedule

#### **Live Session Room Screen** (`LiveSessionRoomScreen.tsx`)
- ✅ Live audio streaming
- ✅ Real-time interaction
- ✅ Tipping functionality
- ✅ Participant list

#### **Create Live Session Screen** (`CreateLiveSessionScreen.tsx`)
- ✅ Schedule live session
- ✅ Session settings
- ✅ Privacy controls

### Settings & Preferences Screens

#### **Privacy & Security Screen** (`PrivacySecurityScreen.tsx`)
- ✅ Privacy settings
- ✅ Security settings
- ✅ 2FA management
- ✅ Account deletion

#### **Change Password Screen** (`ChangePasswordScreen.tsx`)
- ✅ Password change form
- ✅ Current password verification
- ✅ Password strength indicator

#### **Notification Settings Screen** (`NotificationSettingsScreen.tsx`)
- ✅ Notification preferences
- ✅ Push notification settings
- ✅ Email notification settings

#### **Notification Preferences Screen** (`NotificationPreferencesScreen.tsx`)
- ✅ Granular notification controls
- ✅ Category-based settings

#### **Theme Settings Screen** (`ThemeSettingsScreen.tsx`)
- ✅ Dark/light mode toggle
- ✅ Theme customization
- ✅ Color scheme selection

### Payment & Wallet Screens

#### **Wallet Screen** (`WalletScreen.tsx`)
- ✅ Wallet balance
- ✅ Transaction history
- ✅ Withdrawal options

#### **Transaction History Screen** (`TransactionHistoryScreen.tsx`)
- ✅ Transaction list
- ✅ Filter by type
- ✅ Transaction details

#### **Withdrawal Screen** (`WithdrawalScreen.tsx`)
- ✅ Withdrawal form
- ✅ Amount input
- ✅ Withdrawal method selection

#### **Withdrawal Methods Screen** (`WithdrawalMethodsScreen.tsx`)
- ✅ Manage withdrawal methods
- ✅ Add/edit methods

#### **Add Withdrawal Method Screen** (`AddWithdrawalMethodScreen.tsx`)
- ✅ Add bank account
- ✅ Add PayPal
- ✅ Add other methods

#### **Payment Methods Screen** (`PaymentMethodsScreen.tsx`)
- ✅ Manage payment methods
- ✅ Add credit card
- ✅ Stripe integration

#### **Billing Screen** (`BillingScreen.tsx`)
- ✅ Billing history
- ✅ Subscription management
- ✅ Invoice download

#### **Upgrade Screen** (`UpgradeScreen.tsx`)
- ✅ Subscription plans
- ✅ Feature comparison
- ✅ Upgrade flow

### Collaboration Screens

#### **Collaboration Requests Screen** (`CollaborationRequestsScreen.tsx`)
- ✅ View collaboration requests
- ✅ Accept/decline requests
- ✅ Request details

#### **Service Provider Dashboard Screen** (`ServiceProviderDashboardScreen.tsx`)
- ✅ Service provider dashboard
- ✅ Service management
- ✅ Analytics

#### **Service Provider Onboarding Screen** (`ServiceProviderOnboardingScreen.tsx`)
- ✅ Service provider setup
- ✅ Service registration

#### **Availability Calendar Screen** (`AvailabilityCalendarScreen.tsx`)
- ✅ Calendar view
- ✅ Availability management
- ✅ Booking system

### Other Screens

#### **Splash Screen** (`SplashScreen.tsx`)
- ✅ App loading screen
- ✅ Brand animation

#### **Onboarding Screen** (`OnboardingScreen.tsx`)
- ✅ First-time user onboarding
- ✅ Feature introduction
- ✅ Profile setup

#### **Chat Screen** (`ChatScreen.tsx`)
- ✅ One-on-one chat
- ✅ Message history
- ✅ Real-time updates

#### **Notification Inbox Screen** (`NotificationInboxScreen.tsx`)
- ✅ Notification list
- ✅ Mark as read
- ✅ Notification actions

#### **Offline Download Screen** (`OfflineDownloadScreen.tsx`)
- ✅ Download management
- ✅ Offline content
- ✅ Storage management

#### **Audio Enhancement Screen** (`AudioEnhancementScreen.tsx`)
- ✅ Audio processing
- ✅ Enhancement tools
- ✅ Real-time effects

#### **Help & Support Screen** (`HelpSupportScreen.tsx`)
- ✅ Help articles
- ✅ FAQ
- ✅ Contact support

#### **About Screen** (`AboutScreen.tsx`)
- ✅ App information
- ✅ Version details
- ✅ Credits

#### **Terms of Service Screen** (`TermsOfServiceScreen.tsx`)
- ✅ Terms and conditions
- ✅ Legal information

#### **Privacy Policy Screen** (`PrivacyPolicyScreen.tsx`)
- ✅ Privacy policy
- ✅ Data handling

---

## 🛠️ Technologies & Dependencies

### Core Framework
- **React Native** (`0.81.5`) - Mobile app framework
- **React** (`19.1.0`) - UI library
- **Expo** (`~54.0.25`) - Development platform and tooling

### Navigation
- **@react-navigation/native** (`^6.1.17`) - Navigation library
- **@react-navigation/stack** (`^6.3.29`) - Stack navigator
- **@react-navigation/bottom-tabs** (`^6.5.20`) - Bottom tab navigator
- **react-native-screens** (`~4.16.0`) - Native screen components
- **react-native-safe-area-context** (`~5.6.0`) - Safe area handling
- **react-native-gesture-handler** (`~2.28.0`) - Gesture handling

### Backend & Database
- **@supabase/supabase-js** (`^2.58.0`) - Supabase client
- **@react-native-async-storage/async-storage** (`^2.2.0`) - Local storage
- **expo-secure-store** (`^15.0.7`) - Secure credential storage

### Authentication & Security
- **expo-local-authentication** (`^17.0.7`) - Biometric authentication
- **expo-crypto** (`~15.0.7`) - Cryptographic functions
- **zxcvbn** (`^4.4.2`) - Password strength checking

### Payments
- **@stripe/stripe-react-native** (`0.50.3`) - Stripe payment integration
- **expo-iap** (`^3.1.6`) - In-app purchases

### Audio & Media
- **expo-av** (`~16.0.7`) - Audio/video playback
- **react-native-agora** (`^4.5.3`) - Live audio streaming (Agora)
- **expo-image-picker** (`^17.0.8`) - Image selection
- **expo-document-picker** (`~14.0.7`) - Document selection
- **expo-file-system** (`~19.0.17`) - File system operations

### UI Components & Styling
- **@expo/vector-icons** (`^15.0.2`) - Icon library
- **expo-linear-gradient** (`~15.0.7`) - Gradient backgrounds
- **expo-blur** (`^15.0.7`) - Blur effects
- **@react-native-community/slider** (`^5.0.1`) - Slider component
- **@react-native-community/datetimepicker** (`8.4.4`) - Date/time picker
- **@react-native-picker/picker** (`2.11.1`) - Picker component

### Notifications
- **expo-notifications** (`~0.32.13`) - Push notifications
- **expo-task-manager** (`~14.0.8`) - Background tasks
- **expo-background-fetch** (`~14.0.8`) - Background data fetching

### Location & Device
- **expo-location** (`^19.0.7`) - Location services
- **expo-device** (`^8.0.9`) - Device information
- **expo-localization** (`~17.0.7`) - Localization support

### Utilities
- **expo-linking** (`~8.0.9`) - Deep linking
- **expo-web-browser** (`^15.0.9`) - In-app browser
- **expo-haptics** (`~15.0.7`) - Haptic feedback
- **expo-constants** (`~18.0.9`) - App constants
- **expo-font** (`~14.0.8`) - Custom fonts
- **expo-status-bar** (`~3.0.8`) - Status bar control
- **react-native-url-polyfill** (`^3.0.0`) - URL polyfill for React Native
- **react-native-fs** (`^2.20.0`) - File system access
- **react-native-config** (`^1.5.9`) - Environment variables

### Development Tools
- **TypeScript** (`~5.9.2`) - Type safety
- **ESLint** (`^8.0.0`) - Code linting
- **Jest** (`^29.0.0`) - Testing framework
- **expo-dev-client** (`~6.0.18`) - Development client

---

## ✨ Features Implemented

### ✅ Authentication & Security
- Email/password authentication
- Google OAuth
- Two-factor authentication (TOTP + Backup codes)
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- Password strength validation
- Secure session management
- Email verification
- Password reset

### ✅ User Management
- User profiles
- Onboarding flow
- Profile editing
- Creator setup
- Service provider onboarding

### ✅ Content Discovery
- Search functionality
- Advanced filters
- Featured artists
- Trending content
- Event browsing
- Playlist browsing

### ✅ Audio Playback
- Audio player with controls
- Mini player
- Queue management
- Offline downloads
- Background playback
- Audio enhancement tools

### ✅ Live Sessions
- Live audio streaming (Agora integration)
- Create live sessions
- Join live sessions
- Real-time interaction
- Live tipping

### ✅ Messaging
- One-on-one chat
- Conversation list
- Real-time messaging
- Message history

### ✅ Payments & Wallet
- Stripe integration
- Wallet management
- Transaction history
- Withdrawal methods
- In-app purchases
- Subscription management

### ✅ Tipping & Earnings
- Creator tipping
- Tip analytics
- Earnings tracking
- Revenue management

### ✅ Notifications
- Push notifications
- Notification inbox
- Notification preferences
- Email notifications

### ✅ Collaboration
- Collaboration requests
- Service provider dashboard
- Availability calendar
- Collaboration performance tracking

### ✅ Settings & Preferences
- Privacy settings
- Security settings
- Theme customization
- Notification preferences
- Account management

### ✅ Data Loading & Performance
- Parallel data loading
- Query timeouts
- Optimized database queries
- Loading state management
- Error handling
- Retry logic

---

## 🔧 Services

### Authentication Services
- `twoFactorAuthService.ts` - 2FA management
- `biometricAuth.ts` - Biometric authentication

### Audio Services
- `AudioEnhancementService.ts` - Audio processing
- `BackgroundAudioService.ts` - Background playback
- `AgoraService.ts` - Live streaming
- `AgoraTokenService.ts` - Agora token generation

### Payment Services
- `WalletService.ts` - Wallet operations
- `TipService.ts` - Tipping functionality
- `TipAnalyticsService.ts` - Tip analytics
- `InAppPurchaseService.ts` - In-app purchases
- `SubscriptionService.ts` - Subscription management
- `EarningsService.ts` - Earnings tracking
- `revenueService.ts` - Revenue management

### Content Services
- `UploadQuotaService.ts` - Upload management
- `OfflineDownloadService.ts` - Offline content
- `DistributionPlatformService.ts` - Content distribution

### User Services
- `UserPreferencesService.ts` - User preferences
- `creatorExpansionService.ts` - Creator management
- `NotificationService.ts` - Notifications
- `LocationService.ts` - Location services
- `CurrencyService.ts` - Currency conversion

### Collaboration Services
- Collaboration context and utilities

### Utility Services
- `DeepLinkingService.ts` - Deep linking
- `AdService.ts` - Ad management

---

## 🎨 Design System

### Theme
- **Primary Color:** Pink (#EC4899)
- **Background:** Dark theme with glassmorphism
- **Typography:** System fonts with custom weights
- **Icons:** Ionicons from @expo/vector-icons

### Components
- Glassmorphic tab bar
- Custom buttons with gradients
- Password strength indicator
- Mini audio player
- Error boundaries
- Loading indicators

---

## 📝 Environment Variables

Create a `.env` file with:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API
EXPO_PUBLIC_API_URL=https://www.soundbridge.live

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Agora (for live streaming)
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

---

## 🚀 Build & Deployment

### Development Build
```bash
npm start
```

### Production Build (iOS)
```bash
eas build --platform ios --profile production
```

### Production Build (Android)
```bash
eas build --platform android --profile production
```

### Preview Build
```bash
eas build --platform ios --profile preview
```

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

---

## 📚 Documentation

- **2FA Flow:** See `COMPLETE_2FA_FLOW_SUMMARY_FOR_WEB_TEAM.md`
- **Database Migrations:** See `DISABLE_RLS_FOR_VERIFICATION_SESSIONS.sql`
- **API Integration:** See service files in `src/services/`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 👥 Team

- **Mobile App Team** - React Native development
- **Web App Team** - Backend API development

---

## 🐛 Known Issues

- Some screens may have placeholder data
- Offline mode needs additional testing
- Push notifications need production configuration

---

## 🔮 Roadmap

### Upcoming Features
- [ ] Complete playlist functionality
- [ ] Enhanced collaboration features
- [ ] Advanced analytics dashboard
- [ ] Social sharing
- [ ] Content recommendations
- [ ] Advanced search filters
- [ ] Multi-language support

---

## 📞 Support

For issues and questions, please contact the development team.

---

**Last Updated:** November 23, 2025  
**Version:** 1.0.0  
**Status:** Active Development (~60% MVP Complete)
