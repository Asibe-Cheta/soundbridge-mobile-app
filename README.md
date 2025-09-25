# SoundBridge Mobile App

A React Native mobile app for SoundBridge - the music streaming and creator platform.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev:mobile
   # or
   expo start
   ```

3. **View the app:**
   - **On your phone:** Install Expo Go app and scan the QR code
   - **iOS Simulator:** Press `i` in the terminal
   - **Android Emulator:** Press `a` in the terminal
   - **Web:** Press `w` in the terminal

## 📱 Features Implemented

### ✅ Completed
- **Splash Screen** - Beautiful animated loading screen with brand colors
- **Authentication Screen** - Login/signup with email and Google OAuth
- **Discover Screen** - Search and browse with proper tabs (Music, Artists, Events, Playlists)
- **Navigation** - Bottom tab navigation with React Navigation
- **Context Providers** - Auth and Audio Player state management
- **Brand Consistency** - Pink (#EC4899) and black theme throughout

### 🔄 In Progress
- Home Screen
- Audio Player Screen
- Creator Profile Screen
- Upload Screen
- Messages Screen
- Profile Screen

### 📋 Todo
- Integrate with Supabase for authentication and data
- Implement actual audio playback
- Add creator tipping functionality
- Implement file upload for tracks
- Add messaging system
- Complete all remaining screens

## 🏗️ Architecture

### Monorepo Structure
```
apps/mobile/
├── src/
│   ├── screens/          # Screen components
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Utility functions
├── App.tsx              # Main app component
└── package.json         # Dependencies and scripts
```

### Shared Packages
- `@soundbridge/types` - TypeScript type definitions
- `@soundbridge/supabase` - Supabase client configuration
- `@soundbridge/shared` - Shared utilities and helpers

## 🎨 Design System

### Colors
- **Primary:** #EC4899 (Pink)
- **Accent:** #DC2626 (Red)
- **Background:** #1A1A1A (Dark)
- **Text:** #FFFFFF (White)
- **Secondary Text:** rgba(255, 255, 255, 0.7)

### Typography
- **Font Family:** System default (Be Vietnam Pro on web)
- **Headers:** Bold, 18-36px
- **Body:** Regular, 14-16px
- **Captions:** Regular, 12-14px

### Components
- **Gradients:** Linear gradients for buttons and backgrounds
- **Glassmorphism:** Semi-transparent cards with backdrop blur
- **Rounded Corners:** 8-12px radius for cards and buttons
- **Shadows:** Subtle shadows for depth

## 🔧 Development

### Available Scripts
- `npm run start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run on web browser
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Environment Setup
Create a `.env` file in the mobile app root:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📸 Screenshots

The app includes:
- **Splash Screen** with animated logo and progress bar
- **Authentication** with email/password and Google login
- **Discover Screen** with trending music, featured artists, and new releases
- **Bottom Navigation** with 5 main tabs (Home, Discover, Upload, Messages, Profile)

## 🚀 Deployment

### Building for Production
```bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
```

### App Store Submission
1. Complete all features and testing
2. Build production versions
3. Submit to Google Play Store and Apple App Store
4. Follow platform-specific guidelines

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Maintain brand consistency
4. Test on both iOS and Android
5. Update documentation as needed

## 📄 License

This project is part of the SoundBridge platform.
