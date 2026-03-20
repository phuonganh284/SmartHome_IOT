import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { deviceAPI } from '@/services/api';

const deviceConfig: Record<string, { name: string; image: any; width: number; height: number }> = {
  light: { name: 'Smart Light', image: require('@/assets/images/smart_light.png'), width: 280, height: 280 },
  lamp: { name: 'Smart Lamp', image: require('@/assets/images/lamp.png'), width: 250, height: 250 },
  fan: { name: 'Smart Fan', image: require('@/assets/images/smartfan.png'), width: 321, height: 321 },
  ac: { name: 'Smart AC', image: require('@/assets/images/smartAC.png'), width: 321, height: 321 },
};

export default function ScanDeviceScreen() {
  const params = useLocalSearchParams<{ type?: string; name?: string }>();
  const deviceType = (params.type ?? 'ac').toLowerCase();
  const device = useMemo(() => {
    const preset = deviceConfig[deviceType] || deviceConfig.ac;
    return {
      ...preset,
      name: params.name || preset.name,
    };
  }, [deviceType, params.name]);
  const [dots, setDots] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const connectingText = 'Connecting' + '.'.repeat(dots);

  const handleConnect = async () => {
    try {
      setCreating(true);
      const payload: { type: string; name: string; base_type?: 'light' | 'fan' } = {
        type: deviceType,
        name: device.name,
      };

      if (deviceType === 'ac') {
        payload.base_type = 'fan';
      }

      const createdDevice = await deviceAPI.addDevice(payload);
      const createdId = Number(createdDevice?.id);

      router.replace({
        pathname: '/connected',
        params: {
          type: deviceType,
          deviceId: Number.isFinite(createdId) ? String(createdId) : undefined,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot connect to backend.';
      const lower = message.toLowerCase();
      if (lower.includes('no token') || lower.includes('invalid token') || lower.includes('401')) {
        Alert.alert('Session expired', 'Please sign in again to continue.', [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]);
      } else {
        Alert.alert('Add device failed', message);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
          <Text style={styles.title}>Add Devices</Text>
          <View style={styles.headerRight} />
        </View>

        <Text style={styles.sectionTitle}>Connect to device</Text>

        <View style={styles.wifiContainer}>
          <Image source={require('@/assets/images/Wifi.png')} style={[styles.wifiIcon, { tintColor: '#000000' }]} contentFit="contain" />
          <Text style={styles.wifiText}>Turn on your Wifi to connect</Text>
        </View>

        <View style={styles.ringWrap}>
          <View style={styles.ring}>
            <Image source={device.image} style={{ width: device.width, height: device.height }} contentFit="contain" />
          </View>
        </View>

        <View style={styles.deviceInfoRow}>
          <Image source={require('@/assets/images/checkmark.png')} style={styles.checkmarkImage} contentFit="contain" />
          <Text style={styles.deviceLabel}>{device.name}</Text>
        </View>

        <Text style={styles.connectingText}>{connectingText}</Text>

        <Pressable style={styles.primaryButton} onPress={handleConnect} disabled={creating}>
          <Text style={styles.primaryText}>{creating ? 'Connecting...' : 'Connect'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  headerRow: {
    height: 70,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontSize: 40,
    color: '#232323',
  },
  title: {
    color: '#212121',
    fontSize: 24,
    lineHeight: 38.4,
    fontWeight: '700',
    letterSpacing: 0,
    fontFamily: 'Noto Sans',
    marginTop: 12,
  },
  headerRight: {
    width: 32,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 15,
    color: '#232323',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  wifiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 19,
    alignSelf: 'center',
  },
  wifiRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wifiIcon: {
    width: 20,
    height: 20,
  },
  wifiText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Noto Sans',
  },
  ringWrap: { alignItems: 'center', marginTop: 60, marginBottom: 20, position: 'relative' },
  ring: {
    width: 372,
    height: 355,
    borderRadius: 187,
    borderWidth: 4,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkmarkImage: {
    width: 28,
    height: 28,
  },
  deviceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#232323',
  },
  connectingText: { textAlign: 'center', fontSize: 16, color: '#AAAAAA', marginTop: 12, marginBottom: 'auto' },
  primaryButton: {
    marginTop: 32,
    marginBottom: 32,
    backgroundColor: '#111111',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
