# Fastor Restaurants

A simple Expo (React Native + Web) app that demonstrates a phone OTP login flow and a restaurant discovery experience.

## Quick start

- Install deps: `npm install`
- Start dev server (open Expo): `npm start`
  - Android: `npm run android`
  - iOS: `npm run ios`
  - Web: `npm run web`

## Scripts (package.json)

- `start`: expo start
- `android` | `ios` | `web`: platform launchers
- `lint`: eslint . (add ESLint/config if not present)

## Project structure

- `index.js` – registers the app with Expo
- `App.js` – loads Urbanist fonts, sets up React Navigation stack
- `src/api/client.js` – minimal fetch-based API client
- `src/screens/` – screens for the app flow
  - `LoginScreen` → `OTPScreen` → `RestaurantsScreen` → `RestaurantDetailScreen`
- `assets/` – local images (placeholders, logo)
- `app.json`, `babel.config.js` – Expo/Babel config

## App flow and features

- Login
  - Enter phone → `registerPhone()` requests OTP (staging.fastor.ai)
  - Enter OTP → `loginWithOTP()` extracts token from response (header or body)
  - Stores `phone`, `dial_code`, and `token` in AsyncStorage
- Restaurants
  - Reads token; fetches restaurants for city_id=118
  - Renders list with image, title, cuisines/address, offers row, and bottom metrics (rating/popularity on left, cost for two on right)
- Restaurant detail
  - Displays a hero image; a draggable Fastor logo overlay
  - Vertical slider to resize the logo; share composed image (native/web fallbacks)

## API (staging)

- `POST /v1/pwa/user/register` – request OTP
- `POST /v1/pwa/user/login` – verify OTP; token may appear in headers/body
- `GET /v1/m/restaurant?city_id=118` – list restaurants; Authorization: Bearer <token> (optional)

## Tech stack

- Expo SDK 54, React Native 0.81
- React Navigation (native stack)
- AsyncStorage
- expo-image, react-native-view-shot, expo-sharing, expo-font
- @expo-google-fonts/urbanist

## Notes

- No test runner is configured
- ESLint is referenced but local config/deps may need to be added if you want linting to run
- No EAS build config (dev-server workflows only)
