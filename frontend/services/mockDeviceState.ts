type LightUiState = {
  power: boolean;
  intensity: number;
  color: string;
};

const defaultLightState: LightUiState = {
  power: false,
  intensity: 35,
  color: '#F2D9AA',
};

const lightStateById: Record<string, LightUiState> = {};
const listeners = new Set<() => void>();
let version = 0;

const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeLightUiState = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getLightUiState = (deviceId: string): LightUiState => {
  return lightStateById[deviceId] ?? defaultLightState;
};

export const setLightUiState = (deviceId: string, patch: Partial<LightUiState>) => {
  const current = getLightUiState(deviceId);
  lightStateById[deviceId] = {
    ...current,
    ...patch,
  };
  notify();
};

export const getLightUiStateVersion = () => version;
