import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

const deviceConfig: Record<string, { name: string; image: any; width: number; height: number }> = {
  light: { name: 'Smart Light', image: require('@/assets/images/smart_light.png'), width: 260, height: 260 },
  lamp: { name: 'Smart Lamp', image: require('@/assets/images/lamp.png'), width: 220, height: 220 },
  fan: { name: 'Smart Fan', image: require('@/assets/images/smartfan.png'), width: 300, height: 300 },
  ac: { name: 'Smart AC', image: require('@/assets/images/smartAC.png'), width: 300, height: 300 },
};

export default function ConnectedScreen() {
  const params = useLocalSearchParams<{ type?: string; deviceId?: string }>();
  const deviceType = (params.type ?? 'ac').toLowerCase();
  const deviceId = params.deviceId ? String(params.deviceId) : '';
  const device = useMemo(() => deviceConfig[deviceType] || deviceConfig.ac, [deviceType]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={require('@/assets/images/checkmark.png')} style={styles.checkmarkImage} contentFit="contain" />

        <Text style={styles.title}>Connected!</Text>

        <View style={styles.messageChip}>
          <Text style={styles.messageText}>You have connected to {device.name}</Text>
        </View>

        <View style={styles.heroImageWrap}>
          <Image source={device.image} style={{ width: device.width, height: device.height }} contentFit="contain" />
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionButton, styles.homeButton]} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.homeButtonText}>Go to Homepage</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.controlButton]}
            onPress={() =>
              router.replace({
                pathname: '/device/[deviceId]',
                params: { deviceId: deviceId || deviceType, deviceType },
              })
            }>
            <Text style={styles.controlButtonText}>Control Device</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 14, paddingTop: 150, paddingBottom: 32 },
  checkmarkImage: {
    width: 92,
    height: 92,
  },
  title: {
    marginTop: 20,
    color: '#232323',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  messageChip: {
    marginTop: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  messageText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Noto Sans',
  },
  heroImageWrap: {
    marginTop: 42,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  homeButton: {
    backgroundColor: '#FFFFFF',
  },
  controlButton: {
    backgroundColor: '#111111',
  },
  homeButtonText: {
    color: '#121212',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Noto Sans',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Noto Sans',
  },
});
