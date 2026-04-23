import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { deviceAPI, type DeviceType } from '@/services/api';

type Category = 'lighting' | 'fan';

type DeviceCandidate = {
  id: string;
  name: string;
  type: string;
  category: Category;
  image: any;
};

const categories: Array<{ id: Category; label: string }> = [
  { id: 'lighting', label: 'Lightning' },
  { id: 'fan', label: 'Fan' },
];

const inferCategory = (item: DeviceType): Category => {
  const haystack = `${item.type || ''} ${item.display_name || ''}`.toLowerCase();
  return haystack.includes('fan') || haystack.includes('ac') ? 'fan' : 'lighting';
};

const inferImage = (type: string) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('fan')) return require('@/assets/images/smartfan.png');
  if (t.includes('ac')) return require('@/assets/images/smartAC.png');
  if (t.includes('lamp')) return require('@/assets/images/lamp.png');
  return require('@/assets/images/smart_light.png');
};

const mapTypeToCandidate = (item: DeviceType): DeviceCandidate => ({
  id: item.type,
  name: item.display_name?.trim() || item.type,
  type: item.type,
  category: inferCategory(item),
  image: inferImage(item.type),
});

export default function AddDeviceScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('lighting');
  const [candidates, setCandidates] = useState<DeviceCandidate[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const types = await deviceAPI.getDeviceTypes();
        setCandidates(types.map(mapTypeToCandidate));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load device types');
      } finally {
        setLoading(false);
      }
    };

    void loadTypes();
  }, []);

  const filteredCandidates = useMemo(
    () => candidates.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
          <Text style={styles.title}>Add Devices</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          style={styles.categoryScroll}>
          {categories.map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(item.id)}>
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.nameInputSection}>
          <Text style={styles.nameInputLabel}>Your device name</Text>
          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Enter your device name"
            placeholderTextColor="#A0A2A9"
            style={styles.nameInput}
            maxLength={50}
          />
        </View>

        {loading ? (
          <Text style={styles.statusText}>Loading device types...</Text>
        ) : filteredCandidates.length === 0 ? (
          <Text style={styles.statusText}>No device types found.</Text>
        ) : (
          <View style={styles.grid}>
            {filteredCandidates.map((item) => (
              <View key={item.id} style={styles.cardWrapper}>
                <Pressable
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/scan-device',
                      params: {
                        type: item.type,
                        name: deviceName.trim() || item.name,
                      },
                    })
                  }>
                  <Image source={item.image} style={styles.deviceImage} contentFit="contain" />
                </Pressable>
                {!!item.name && <Text style={styles.deviceName}>{item.name}</Text>}
              </View>
            ))}
          </View>
        )}

        {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 26,
  },
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
  categoryScroll: {
    marginTop: 20,
  },
  nameInputSection: {
    marginTop: 12,
  },
  nameInputLabel: {
    color: '#404248',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  nameInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D6DC',
    backgroundColor: '#F6F6F7',
    paddingHorizontal: 12,
    color: '#232323',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryRow: {
    marginHorizontal: -10,
    height: 75,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    width: 146,
    height: 35,
    paddingHorizontal: 20,
    paddingVertical: 0,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#000000',
  },
  categoryText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  grid: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 32,
  },
  statusText: {
    marginTop: 40,
    textAlign: 'center',
    color: '#8D8F96',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#B43D3D',
    fontSize: 13,
    fontWeight: '600',
  },
  cardWrapper: {
    width: '47.3%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#F3F3F3',
    borderRadius: 8,
    minHeight: 132,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceImage: {
    width: 140,
    height: 120,
  },
  deviceName: {
    marginTop: 8,
    color: '#2D2D2D',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
