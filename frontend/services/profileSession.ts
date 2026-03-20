export type AccountProfile = {
  username: string;
  email: string;
  password: string;
};

let currentProfile: AccountProfile = {
  username: 'Guest User',
  email: 'guest@example.com',
  password: '********',
};

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeProfile = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getCurrentProfile = () => currentProfile;

export const setCurrentProfile = (profile: AccountProfile) => {
  currentProfile = profile;
  notify();
};

export const patchCurrentProfile = (patch: Partial<AccountProfile>) => {
  currentProfile = { ...currentProfile, ...patch };
  notify();
};

export const clearCurrentProfile = () => {
  currentProfile = {
    username: 'Guest User',
    email: 'guest@example.com',
    password: '********',
  };
  notify();
};
