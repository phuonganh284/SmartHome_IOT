import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, useSyncExternalStore, useEffect } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { deviceAPI, notificationAPI, type Device } from '@/services/api';
import {
  getLightUiState,
  getLightUiStateVersion,
  setLightUiState,
  subscribeLightUiState,
} from '@/services/mockDeviceState';

type DeviceTile = {
  id: string;
  backendId: number;
  title: string;
  type: 'ac' | 'light' | 'fan';
  icon: any;
  status: number;
};

const normalizeType = (rawType: string): 'ac' | 'light' | 'fan' => {
  const lower = String(rawType || '').toLowerCase();
  if (lower.includes('fan')) return 'fan';
  if (lower.includes('ac')) return 'ac';
  return 'light';
};

const iconForType = (type: 'ac' | 'light' | 'fan') => {
  if (type === 'ac') return require('@/assets/images/AC.png');
  if (type === 'fan') return require('@/assets/images/Frame.png');
  return require('@/assets/images/Light.png');
};

const defaultTitleForType = (type: 'ac' | 'light' | 'fan') => {
  if (type === 'ac') return 'Smart AC';
  if (type === 'fan') return 'Smart Fan';
  return 'Smart Light';
};

const mapDeviceToTile = (device: Device): DeviceTile => {
  const type = normalizeType(device.type);
  return {
    id: String(device.id),
    backendId: Number(device.id),
    title: device.name?.trim() || defaultTitleForType(type),
    type,
    status: device.status || 0,
    icon: iconForType(type),
  };
};

const isAuthErrorMessage = (message: string) => {
  const lower = message.toLowerCase();
  return lower.includes('no token') || lower.includes('invalid token') || lower.includes('401');
};

export default function HomeScreen() {
  const [devices, setDevices] = useState<DeviceTile[]>([]);
  const [switches, setSwitches] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Record<string, boolean>>({});
  const [unreadCount, setUnreadCount] = useState(0);

  useSyncExternalStore(subscribeLightUiState, getLightUiStateVersion, getLightUiStateVersion);

  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await notificationAPI.getUnreadCount();
      setUnreadCount(result.unread_count);
    } catch (error) {
      console.warn('Failed to load unread count:', error);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');

      const response = await deviceAPI.getDevices();
      const mapped = response.map(mapDeviceToTile);

      const nextSwitches: Record<string, boolean> = {};
      response.forEach((item) => {
        const key = String(item.id);
        const isOn = Number(item.status) === 1;
        nextSwitches[key] = isOn;

        if (normalizeType(item.type) === 'light') {
          setLightUiState(key, { power: isOn });
        }
      });

      setDevices(mapped);
      setSwitches(nextSwitches);
      setDeleteMode(false);
      setSelectedDevices({});

      // Load unread notification count
      await loadUnreadCount();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load devices';
      if (isAuthErrorMessage(message)) {
        setDevices([]);
        setLoadError('');
      } else {
        setLoadError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [loadUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void loadDevices();
    }, [loadDevices])
  );

  // Periodically refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const toggleDevice = async (deviceId: string) => {
    const key = String(deviceId);
    const device = devices.find((item) => item.id === key);
    if (!device) return;

    const current = device.type === 'light' ? getLightUiState(key).power : !!switches[key];
    const next = !current;

    if (device.type === 'light') {
      setLightUiState(key, { power: next });
    }
    setSwitches((prev) => ({ ...prev, [key]: next }));

    try {
      await deviceAPI.setPower(device.backendId, next ? 1 : 0);
    } catch (error) {
      if (device.type === 'light') {
        setLightUiState(key, { power: current });
      }
      setSwitches((prev) => ({ ...prev, [key]: current }));
      const message = error instanceof Error ? error.message : 'Failed to update device power';
      setLoadError(isAuthErrorMessage(message) ? '' : message);
    }
  };

  const toggleSelectedDevice = (deviceId: string) => {
    const key = String(deviceId);
    setSelectedDevices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enterDeleteMode = (deviceId: string) => {
    const key = String(deviceId);
    setDeleteMode(true);
    setSelectedDevices((prev) => ({ ...prev, [key]: true }));
  };

  const deleteSelectedDevices = async () => {
    const selectedIds = Object.keys(selectedDevices).filter((id) => selectedDevices[id]);
    if (selectedIds.length === 0) {
      setDeleteMode(false);
      return;
    }

    const selectedTiles = devices.filter((device) => selectedIds.includes(String(device.id)));
    const results = await Promise.allSettled(
      selectedTiles.map((device) => deviceAPI.deleteDevice(device.backendId))
    );

    const deletedIds = selectedTiles
      .filter((_, idx) => results[idx].status === 'fulfilled')
      .map((device) => String(device.id));

    if (deletedIds.length === 0) {
      setLoadError('Delete failed. Please try again.');
      return;
    }

    setDevices((prev) => prev.filter((device) => !deletedIds.includes(String(device.id))));
    setSwitches((prev) => {
      const next = { ...prev };
      deletedIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });

    setSelectedDevices((prev) => {
      const next = { ...prev };
      deletedIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });

    setDeleteMode(false);
  };

  const selectedCount = useMemo(
    () => Object.keys(selectedDevices).filter((id) => selectedDevices[id]).length,
    [selectedDevices]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>Welcome Home</Text>
          <View style={styles.headerIcons}>
            <Pressable
              onPress={() => router.push('/notifications-modal')}
              style={styles.bellIconContainer}>
              <Image
                source={require('@/assets/images/notifications.png')}
                style={styles.headerIcon}
                contentFit="contain"
              />
              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </Pressable>
          </View>
        </View>

        {loading ? (
          <Text style={styles.statusText}>Loading devices...</Text>
        ) : devices.length === 0 ? (
          <Text style={styles.statusText}>No devices found for this user.</Text>
        ) : (
          <View style={styles.grid}>
            {devices.map((item) => {
              const isOn = item.type === 'light' ? getLightUiState(item.id).power : !!switches[item.id];

              return (
                <Pressable
                  key={item.id}
                  style={[styles.card, selectedDevices[item.id] && styles.cardSelected]}
                  onLongPress={() => enterDeleteMode(item.id)}
                  onPress={() => {
                    if (deleteMode) {
                      toggleSelectedDevice(item.id);
                      return;
                    }
                    const isOn = item.type === 'light' ? getLightUiState(item.id).power : !!switches[item.id];
                    if (!isOn) {
                      Alert.alert('Device is off', 'Please turn on the device first to control it.');
                      return;
                    }
                    router.push({
                      pathname: '/device/[deviceId]',
                      params: { deviceId: item.id, deviceType: item.type },
                    });
                  }}>
                  <View style={styles.cardTop}>
                    <Image source={item.icon} style={styles.deviceIcon} contentFit="contain" />
                    <Pressable
                      style={[styles.switchTrack, isOn && styles.switchTrackOn]}
                      onPress={(event) => {
                        event.stopPropagation();
                        void toggleDevice(item.id);
                      }}>
                      <View style={[styles.switchThumb, isOn && styles.switchThumbOn]} />
                    </Pressable>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!loading && !!loadError && <Text style={styles.errorText}>{loadError}</Text>}

        {deleteMode && (
          <View style={styles.deleteRow}>
            <Text style={styles.deleteCountText}>{selectedCount} selected</Text>
            <Pressable style={styles.deleteFab} onPress={() => void deleteSelectedDevices()}>
              <Image
                source={require('@/assets/images/Trash 2.png')}
                style={styles.deleteFabIcon}
                contentFit="contain"
              />
            </Pressable>
          </View>
        )}

        <Pressable style={styles.addDeviceCard} onPress={() => router.push('/add-device')}>
          <Text style={styles.plusText}>+</Text>
          <Text style={styles.addDeviceText}>Add New Device</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 45,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  greeting: {
    color: '#4A4A4F',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontWeight: '700',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 24,
    height: 24,
    opacity: 1,
  },
  bellIconContainer: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  grid: {
    marginTop: 132,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  statusText: {
    marginTop: 132,
    textAlign: 'center',
    color: '#8D8F96',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#B43D3D',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    width: '47.8%',
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 176,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderColor: '#A6A8AF',
    backgroundColor: '#ECEDEF',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceIcon: {
    width: 52,
    height: 52,
    opacity: 0.7,
  },
  switchTrack: {
    width: 56,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DFDFE2',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  switchTrackOn: {
    backgroundColor: '#AEB3BF',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2F2F2',
    alignSelf: 'flex-start',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  cardTitle: {
    marginBottom: 10,
    color: '#4A4A4F',
    fontSize: 40 / 2,
    lineHeight: 54 / 2,
    letterSpacing: 0.1,
    fontWeight: '700',
  },
  deleteRow: {
    position: 'absolute',
    right: 10,
    bottom: 144,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteCountText: {
    color: '#8D8F96',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteFabIcon: {
    width: 24,
    height: 24,
    opacity: 0.9,
  },
  addDeviceCard: {
    marginTop: 'auto',
    marginBottom: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D3D3D6',
    borderStyle: 'dashed',
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  plusText: {
    color: '#B6B7BC',
    fontSize: 52,
    lineHeight: 52,
    fontWeight: '300',
  },
  addDeviceText: {
    color: '#BCBCC0',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
});
