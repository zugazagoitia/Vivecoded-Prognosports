import { users } from './index'

/** Fixtures of the account settings (U3), in the wire shape the app has to parse. */

export const ACCOUNT_TIMEZONES: Record<string, string> = {
  'America/Mexico_City': '-06:00',
  'America/New_York': '-04:00',
  'Europe/London': '+01:00',
  'Europe/Madrid': '+02:00',
  'Asia/Tokyo': '+09:00',
}

/** Assumed shape of `User.preferences` (spec: free-form map): type -> channel -> on. */
export const ACCOUNT_PREFERENCES = {
  INFO: { mail: true, telegram: false },
  SESSION_PRE_ALERT: { mail: true, telegram: true },
  SESSION_ALERT: { mail: false, telegram: true },
  GRID_CHANGES: { mail: false, telegram: true },
  POINTS_DISPATCHED: { mail: true, telegram: true },
}

/** The signed-in mock user with a filled profile. */
export const accountUser = {
  ...users[0]!,
  bio: 'Aficionado a la F1 desde 2005.',
  location: 'Madrid',
  birthdate: '1991-05-14',
  timeZone: 'Europe/Madrid',
  hasProfileImage: false,
  preferences: ACCOUNT_PREFERENCES,
}

export const ACCOUNT_CHANNELS = [
  { id: 'MAIL', label: 'Correo', enabled: true, suscribed: true },
  { id: 'TELEGRAM', label: 'Telegram', enabled: true, suscribed: true },
]

export const ACCOUNT_TOKENS = [
  {
    token: 'tok-current',
    current: true,
    lifetime: 2592000,
    createdAt: '2026-06-28T09:00:00Z',
    lastActivityAt: '2026-07-01T11:59:00Z',
    ipAddress: '127.0.0.1',
    agent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
  {
    token: 'tok-iphone',
    current: false,
    lifetime: 2592000,
    createdAt: '2026-06-20T18:00:00Z',
    lastActivityAt: '2026-07-01T10:00:00Z',
    ipAddress: '127.0.0.2',
    agent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
  {
    token: 'tok-android',
    current: false,
    lifetime: 2592000,
    createdAt: '2026-05-01T08:00:00Z',
    lastActivityAt: '2026-06-10T08:00:00Z',
    ipAddress: '127.0.0.3',
    agent: 'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0',
  },
]
