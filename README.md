# Stimulus

A premium gym / workout tracker built with Expo (React Native) and Supabase.

Track workouts with weight **and** reps, log body weight, browse history on a
calendar, and visualize exercise progression over time.

## Stack

- **App:** Expo SDK 56, React Native 0.85, expo-router (typed routes), TypeScript
- **Backend:** Supabase (Postgres + Auth), row-level security
- **Charts:** react-native-gifted-charts, custom SVG sparklines

## Project layout

```
.                  Expo app (src/, app.json, assets/)
supabase/          Postgres migrations + local config
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + publishable/anon key
npx expo run:android   # or run:ios
```

### Database

Migrations live in `supabase/migrations`. Apply them to a local stack with the
Supabase CLI:

```bash
supabase start
supabase migration up --local
```

## Environment

Configure `.env` (git-ignored) from `.env.example`:

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
