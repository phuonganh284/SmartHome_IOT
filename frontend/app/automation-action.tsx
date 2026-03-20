import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

const deviceConfig: Record<string, { name: string; image: any; width: number; height: number }> = {
  light: { name: 'Smart Light', image: require('@/assets/images/smart_light.png'), width: 280, height: 280 },
  lamp: { name: 'Smart Lamp', image: require('@/assets/images/lamp.png'), width: 250, height: 250 },
  fan: { name: 'Smart Fan', image: require('@/assets/images/smartfan.png'), width: 321, height: 321 },
  ac: { name: 'Smart AC', image: require('@/assets/images/smartAC.png'), width: 321, height: 321 },
};

export default function AutomationActionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const deviceType = (params.type ?? 'ac').toLowerCase();
  const device = useMemo(() => deviceConfig[deviceType] || deviceConfig.ac, [deviceType]);

  const goToAutomationCompose = (action: 'off' | 'on') => {
    router.replace({ pathname: '/(tabs)/automation', params: { compose: '1', action } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
          <Text style={styles.title}>Select Action</Text>
          <View style={styles.headerRight} />
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

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionButton, styles.homeButton]} onPress={() => goToAutomationCompose('off')}>
            <Text style={[styles.actionText, styles.homeButtonText]}>Turn off</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, styles.homeButton]} onPress={() => goToAutomationCompose('on')}>
            <Text style={[styles.actionText, styles.homeButtonText]}>Turn on</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32 },
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
  deviceInfoRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkmarkImage: {
    width: 26,
    height: 26,
  },
  deviceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#232323',
  },
  ringWrap: { alignItems: 'center', marginTop: 100, marginBottom: 6, position: 'relative' },
  ring: {
    width: 372,
    height: 355,
    borderRadius: 187,
    borderWidth: 4,
    borderColor: '#CCCCCC',
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
  actionText: {
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Noto Sans',
  },
  homeButtonText: {
    color: '#121212',
  },
});