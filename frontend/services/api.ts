import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const parseHost = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const withoutScheme = value.replace(/^https?:\/\//, '');
  const firstSegment = withoutScheme.split('/')[0] ?? '';
  const host = firstSegment.split(':')[0] ?? '';
  return host || null;
};

const getExpoHostIp = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoGo?.developer?.tool,
    (Constants as any).linkingUri,
  ];

  for (const candidate of candidates) {
    const host = parseHost(candidate);
    if (host) {
      return host;
    }
  }

  return null;
};

const normalizeHostForDevice = (host: string) => {
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (isLocalHost && Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return host;
};

const resolveApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const hostIp = getExpoHostIp();
  if (hostIp) {
    const normalized = normalizeHostForDevice(hostIp);
    return `http://${normalized}:3000/api`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
};

const API_BASE_URL = resolveApiBaseUrl().replace(/\/$/, '');

let authToken = '';
const AUTH_TOKEN_KEY = 'smarthome_auth_token';
let tokenHydrationPromise: Promise<void> | null = null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

type ApiError = {
  error?: string;
  message?: string;
};

const hydrateAuthToken = async () => {
  if (authToken) {
    return;
  }

  if (!tokenHydrationPromise) {
    tokenHydrationPromise = (async () => {
      const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      authToken = stored ?? '';
    })().finally(() => {
      tokenHydrationPromise = null;
    });
  }

  await tokenHydrationPromise;
};

export type Device = {
  id: number;
  name: string | null;
  type: string;
  status: number;
  image?: string | null;
};

export type DeviceType = {
  type: string;
  display_name?: string | null;
  image?: string | null;
};

export type CreatedDevice = {
  id: number;
  type: string;
  name?: string | null;
  status?: number;
  adafruit_key?: string | null;
};

export type UserProfile = {
  name: string;
  email: string;
};

export type UserProfileResponse = {
  profile: UserProfile;
};

export type RuleCondition = {
  id?: number;
  sensor_type: string;
  operator: '<' | '=' | '>';
  value: number;
};

export type RuleAction = {
  id?: number;
  action: string;
  value?: string | null;
};

export type RuleSchedule = {
  id?: number;
  start_time?: string | null;
  end_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type AutomationRule = {
  id: number;
  name: string | null;
  is_active: boolean;
  is_ai?: boolean;
  last_executed?: string | null;
  created_at?: string;
  devices: number[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedules: RuleSchedule[];
};

export type AutomationRulePayload = {
  name: string;
  devices: number[];
  conditions: Array<Omit<RuleCondition, 'id'>>;
  actions: Array<Omit<RuleAction, 'id'>>;
  schedule?: Omit<RuleSchedule, 'id'> | null;
};

export type Notification = {
  id: number;
  user_id: string;
  rule_id: number;
  device_id: number;
  message: string;
  action: string;
  read: boolean;
  created_at: string;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, token } = options;

  if (!token) {
    await hydrateAuthToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const bearer = token ?? authToken;
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as T & ApiError;

  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`);
  }

  return json as T;
};

export const setAuthToken = (token: string) => {
  authToken = token;

  if (token) {
    void AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    void AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const getAuthToken = () => authToken;

export const authAPI = {
  register: (name: string, email: string, password: string) =>
    request<{ message: string; user_id: string }>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    }),

  login: (email: string, password: string) =>
    request<{ message: string; session?: { access_token?: string } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/auth/forgot', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset', {
      method: 'POST',
      body: { token, password },
    }),
};

export const isEmailRateLimitError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('rate limit exceeded') || message.includes('too many requests');
};

export const deviceAPI = {
  getDeviceTypes: () => request<DeviceType[]>('/devices/types'),

  addDevice: (payload: { type: string; name?: string; adafruit_key?: string; base_type?: 'light' | 'fan' }) =>
    request<CreatedDevice>('/devices', {
      method: 'POST',
      body: payload,
    }),

  getDevices: () => request<Device[]>('/devices'),

  setPower: (id: number | string, status: 0 | 1) =>
    request<Record<string, unknown>>(`/devices/${id}/power`, {
      method: 'PATCH',
      body: { status },
    }),

  deleteDevice: (id: number | string) =>
    request<{ message: string }>(`/devices/${id}`, {
      method: 'DELETE',
    }),

  updateDevice: (id: number | string, payload: Partial<Device>) =>
    request<Device>(`/devices/${id}`, {
      method: 'PUT',
      body: payload,
    }),
};

export const lightAPI = {
  getLight: (id: number | string) => request<Record<string, unknown>>(`/lights/${id}`),

  setPower: (id: number | string, status: 0 | 1) =>
    request<Record<string, unknown>>(`/lights/${id}/power`, {
      method: 'PATCH',
      body: { status },
    }),

  setColor: (id: number | string, color: string) =>
    request<Record<string, unknown>>(`/lights/${id}/color`, {
      method: 'PATCH',
      body: { color },
    }),

  setIntensity: (id: number | string, intensity: number) =>
    request<Record<string, unknown>>(`/lights/${id}/intensity`, {
      method: 'PATCH',
      body: { intensity },
    }),
};

export const fanAPI = {
  getFan: (id: number | string) => request<Record<string, unknown>>(`/fans/${id}`),

  setPower: (id: number | string, status: 0 | 1) =>
    request<Record<string, unknown>>(`/fans/${id}/power`, {
      method: 'PATCH',
      body: { status },
    }),

  setMode: (id: number | string, mode: string) =>
    request<Record<string, unknown>>(`/fans/${id}/mode`, {
      method: 'PATCH',
      body: { mode },
    }),

  setSpeed: (id: number | string, speed_level: number) =>
    request<Record<string, unknown>>(`/fans/${id}/speed`, {
      method: 'PATCH',
      body: { speed_level },
    }),
};

export const profileAPI = {
  getProfile: () => request<UserProfileResponse>('/user/profile'),
};

export const automationAPI = {
  getRules: () => request<AutomationRule[]>('/rules'),

  getAIRules: () => request<AutomationRule[]>('/rules/ai'),

  createRule: (payload: AutomationRulePayload) =>
    request<AutomationRule>('/rules', {
      method: 'POST',
      body: payload,
    }),

  createAIRule: (payload: AutomationRulePayload) =>
    request<AutomationRule>('/rules/ai', {
      method: 'POST',
      body: payload,
    }),

  updateRule: (id: number | string, payload: AutomationRulePayload) =>
    request<{ ok: boolean }>(`/rules/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  deleteRule: (id: number | string) =>
    request<{ ok: boolean }>(`/rules/${id}`, {
      method: 'DELETE',
    }),

  setRuleActive: (id: number | string, is_active: boolean) =>
    request<{ ok: boolean; rule?: AutomationRule }>(`/rules/${id}/active`, {
      method: 'PATCH',
      body: { is_active },
    }),

  toggleAIRuleActive: (id: number | string, is_active: boolean) =>
    request<{ ok: boolean; rule?: AutomationRule }>(`/rules/ai/${id}/active`, {
      method: 'PATCH',
      body: { is_active },
    }),

  deleteAIRule: (id: number | string) =>
    request<{ ok: boolean }>(`/rules/ai/${id}`, {
      method: 'DELETE',
    }),
};

export const notificationAPI = {
  getNotifications: (limit?: number) =>
    request<Notification[]>(`/notifications${limit ? `?limit=${limit}` : ''}`),

  getUnreadCount: () => request<{ unread_count: number }>('/notifications/unread/count'),

  markAsRead: (id: number) =>
    request<{ ok: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    request<{ ok: boolean }>('/notifications/read/all', {
      method: 'PATCH',
    }),

  deleteNotification: (id: number) =>
    request<{ ok: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    }),
};

export const sensorAPI = {
  getSensorReadings: (sensorId: number | string, range = '24h') =>
    request<Array<{ id: number; value: number; created_at: string }>>(
      `/iot/sensor_readings/${sensorId}?range=${encodeURIComponent(range)}`
    ),
};

export { API_BASE_URL };