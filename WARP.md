# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project type: Expo (React Native + Web) app using React Navigation, AsyncStorage, and a small fetch-based API client.

Commands
- Install deps: npm install
- Start dev server (choose platform in Expo UI): npm start
- Launch on Android: npm run android
- Launch on iOS: npm run ios
- Launch on Web: npm run web
- Lint (ESLint): npm run lint
  - Note: ESLint is referenced but not included/configured in devDependencies; add ESLint/config if you need linting to run here.
- Tests: No test runner/config present in this repo (no Jest/Vitest setup).
- Production builds: No EAS (expo-application-services) config is present; production build commands are not defined here.

High-level architecture
- Entry point
  - index.js registers App with Expo (registerRootComponent).
  - App.js wraps the app with SafeAreaProvider and NavigationContainer, loads Urbanist fonts, and declares a native stack navigator with screens: Login → OTP → Restaurants → RestaurantDetail.
- Screens and flow (src/screens)
  - LoginScreen.js: collects phone; calls registerPhone(...); persists phone and dial_code in AsyncStorage; navigates to OTP.
  - OTPScreen.js: 6-digit OTP UI; calls loginWithOTP(...); extracts bearer token from response headers/body; stores token in AsyncStorage; resets navigation to Restaurants.
  - RestaurantsScreen.js: on mount, reads token; calls fetchRestaurants(118, token); normalizes API response shape; renders a FlatList; images use expo-image with Authorization header when token exists and fall back to a bundled placeholder asset.
  - RestaurantDetailScreen.js: displays a hero image (from navigation params, with local fallback) and overlays a draggable Fastor logo. Captures the composed view via react-native-view-shot and shares it via expo-sharing; includes a web fallback that creates and downloads a PNG if the Web Share API isn’t available.
- API layer (src/api/client.js)
  - registerPhone(phone, dialCode): POST x-www-form-urlencoded to /v1/pwa/user/register; returns { status, data } with best-effort JSON parsing.
  - loginWithOTP(phone, otp, dialCode): POST to /v1/pwa/user/login; returns { status, data, headers } and tries multiple header keys to discover a token; callers strip any leading "Bearer ".
  - fetchRestaurants(cityId, token): GET /v1/m/restaurant?city_id=118; optionally adds Authorization: Bearer <token>.
- Configuration
  - app.json: Expo app config; newArchEnabled: true; android edgeToEdgeEnabled; uses the expo-font plugin; standard icon/splash entries.
  - babel.config.js and package.json "babel": use babel-preset-expo and react-native-reanimated/plugin.
- Styling and assets
  - Fonts: Urbanist via @expo-google-fonts/urbanist loaded in App.js; typography uses font family names in styles.
  - Images: expo-image for remote and local assets; placeholder images live in assets/ and are referenced in screens.
- State and storage
  - AsyncStorage persists phone, dial_code, and token for the simple auth flow.

Notes for future agents
- This repo currently lacks:
  - Test setup (no Jest/Vitest config or tests found).
  - EAS build configuration (no eas.json); only dev-server workflows are defined.
  - Local ESLint config/dependency; "npm run lint" assumes ESLint is added.
