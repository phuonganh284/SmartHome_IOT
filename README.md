# SmartHome_IOT

Smart home IoT project — mobile app (Expo React Native), backend (Express + Supabase), gateway (Micro:bit + Adafruit IO)

## Prerequisites
- Node.js (16+ recommended)
- npm
- Python 3 (for the gateway script)
- Expo Go (on mobile device) for app testing

## Backend

1. Copy environment variables into `backend/.env` from the example:

   - See [backend/.env.example](backend/.env.example)

2. Install and run:

```bash
cd backend
npm install

node server.js
```

3. Endpoints

- Register: `POST /api/auth/register` with JSON `{ "name", "email", "password" }`
- Login: `POST /api/auth/login` with JSON `{ "email", "password" }` — response contains `session` (use `session.access_token`)
- Get devices: `GET /api/devices` with header `Authorization: Bearer <ACCESS_TOKEN>`
- Get profile: `GET /api/user/profile` with header `Authorization: Bearer <ACCESS_TOKEN>`

Example curl to fetch devices:

```bash
# replace <TOKEN> with session.access_token from login
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/devices
```

## Mobile App (Expo React Native)

1. Install and run:

```bash
cd mobile
npm install
npx expo start --tunnel
```

Open Expo Go on your phone and scan the QR code from the terminal.

Note: This project is configured for mobile runtime only. The `frontend/` folder is legacy and not used for the current app runtime.

## Gateway (Micro:bit + Adafruit IO)

The gateway script is at [gateway/main.py](gateway/main.py). It currently has AIO credentials hardcoded. Instead, copy `gateway/.env.example` to `gateway/.env` and set your Adafruit IO username and key.

Run the gateway:

```bash
cd gateway
python main.py
```

## Environment variables

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `PORT` — optional (default 3000)

Gateway (.env):
- `AIO_USERNAME` — Adafruit IO username
- `AIO_KEY` — Adafruit IO key

