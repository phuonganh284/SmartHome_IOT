import AsyncStorage from '@react-native-async-storage/async-storage';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.10:3000/api';
const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

let authToken = '';
const AUTH_TOKEN_KEY = 'smarthome_auth_token';
let tokenHydrationPromise: Promise<void> | null = null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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

export { API_BASE_URL };
