import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { automationAPI, deviceAPI, type Device } from '@/services/api';

type Category = 'lighting' | 'fan';

type DeviceCandidate = {
  id: number;
  name: string;
  type: string;
  category: Category;
  image: any;
};

const categories: Array<{ id: Category; label: string }> = [
  { id: 'lighting', label: 'Lightning' },
  { id: 'fan', label: 'Fan' },
];

const getCategoryFromType = (type: string): Category => {
  const normalized = type.toLowerCase();
  if (normalized.includes('fan') || normalized.includes('ac') || normalized.includes('air')) {
    return 'fan';
  }
  return 'lighting';
};

const getImageFromType = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes('fan')) return require('@/assets/images/smartfan.png');
  if (normalized.includes('ac') || normalized.includes('air')) return require('@/assets/images/smartAC.png');
  if (normalized.includes('lamp')) return require('@/assets/images/lamp.png');
  return require('@/assets/images/smart_light.png');
};

const toCandidate = (device: Device): DeviceCandidate => ({
  id: device.id,
  name: device.name || `Device #${device.id}`,
  type: device.type,
  category: getCategoryFromType(device.type),
  image: getImageFromType(device.type),
});

export default function AutomationCreateScreen() {
  const params = useLocalSearchParams<{
    aiMode?: string;
    taskId?: string;
    taskName?: string;
    action?: 'on' | 'off';
    selected?: string;
    selectedType?: string;
    category?: string;
    tempComparator?: '<' | '=' | '>';
    humidityComparator?: '<' | '=' | '>';
    temperature?: string;
    humidity?: string;
    start_time?: string;
    end_time?: string;
    start_date?: string;
    end_date?: string;
  }>();
  const [activeCategory, setActiveCategory] = useState<Category>('fan');
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [candidates, setCandidates] = useState<DeviceCandidate[]>([]);

  const isAiMode = params.aiMode === '1';

  const paramCategory = useMemo<Category | null>(() => {
    const value = (params.category || '').toLowerCase();
    if (value === 'lighting' || value === 'light') return 'lighting';
    if (value === 'fan') return 'fan';
    return null;
  }, [params.category]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const [devices, aiRules] = await Promise.all([
          deviceAPI.getDevices(),
          isAiMode ? automationAPI.getAIRules() : Promise.resolve([]),
        ]);

        const excludedAiDeviceIds = new Set<number>();
        if (isAiMode) {
          aiRules.forEach((rule) => {
            (rule.devices || []).forEach((deviceId) => excludedAiDeviceIds.add(deviceId));
          });
        }

        const mapped = devices
          .map(toCandidate)
          .filter((candidate) => {
            if (!isAiMode) return true;
            if (excludedAiDeviceIds.has(candidate.id)) return false;
            return true;
          });
        setCandidates(mapped);

        const selectedIdsFromParams = (params.selected || '')
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((id) => Number.isFinite(id) && id > 0);

        if (selectedIdsFromParams.length > 0) {
          const seeded: Record<string, boolean> = {};
          selectedIdsFromParams.forEach((id) => {
            seeded[String(id)] = true;
          });
          setSelectedMap(seeded);

          const firstSelected = mapped.find((item) => item.id === selectedIdsFromParams[0]);
          if (firstSelected) {
            setActiveCategory(firstSelected.category);
            return;
          }
        }

        const hasFanCategory = mapped.some((item) => item.category === 'fan');
        if (paramCategory) {
          setActiveCategory(paramCategory);
        } else {
          setActiveCategory(hasFanCategory ? 'fan' : 'lighting');
        }
      } catch (error) {
        Alert.alert('Cannot load devices', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    void loadDevices();
  }, [isAiMode, paramCategory, params.selected]);

  const filteredCandidates = useMemo(
    () => candidates.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  const toggleSelect = (id: number) => {
    setSelectedMap((prev) => {
      const key = String(id);
      const isCurrentlySelected = !!prev[key];
      if (isCurrentlySelected) {
        return { ...prev, [key]: false };
      }

      const selectedIds = Object.keys(prev).filter((key) => prev[key]);
      if (selectedIds.length === 0) {
        return { ...prev, [key]: true };
      }

      const selectedCategory = candidates.find((item) => String(item.id) === selectedIds[0])?.category;
      const nextCategory = candidates.find((item) => item.id === id)?.category;

      if (selectedCategory && nextCategory && selectedCategory !== nextCategory) {
        Alert.alert(
          'Selection Restricted',
          'You can only select multiple devices in the same category.'
        );
        return prev;
      }

      return { ...prev, [key]: true };
    });
  };

  const clearAll = () => setSelectedMap({});

  const handleSelect = () => {
    const selectedIds = Object.keys(selectedMap).filter((key) => selectedMap[key]);
    if (selectedIds.length === 0) {
      Alert.alert('No Device Selected', 'Please select at least one device.');
      return;
    }

    const firstSelected = candidates.find((item) => String(item.id) === selectedIds[0]);
    const category = firstSelected?.category ?? activeCategory;

    if (isAiMode) {
      router.push({
        pathname: '/automation-schedule',
        params: {
          aiMode: '1',
          category,
          selected: selectedIds.join(','),
          selectedType: firstSelected?.type || '',
        },
      });
      return;
    }

    const nextParams = {
      taskId: params.taskId ?? '',
      taskName: params.taskName ?? '',
      action: params.action ?? '',
      category,
      selected: selectedIds.join(','),
      selectedType: firstSelected?.type || '',
      tempComparator: params.tempComparator ?? '<',
      humidityComparator: params.humidityComparator ?? '<',
      temperature: params.temperature ?? '27',
      humidity: params.humidity ?? '5',
      start_time: params.start_time ?? '',
      end_time: params.end_time ?? '',
      start_date: params.start_date ?? '',
      end_date: params.end_date ?? '',
    };

    if (category === 'lighting') {
      router.push({
        pathname: '/automation-schedule',
        params: nextParams,
      });
      return;
    }

    router.push({
      pathname: '/automation-condition',
      params: nextParams,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.backArrow}>{'←'}</Text>
            </Pressable>
            <Text style={styles.title}>Select Devices</Text>
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

          <View style={styles.grid}>
            {filteredCandidates.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No devices in this category yet.</Text>
              </View>
            ) : null}

            {filteredCandidates.map((item) => {
              const selected = !!selectedMap[String(item.id)];
              return (
                <View key={item.id} style={styles.cardWrapper}>
                  <Pressable style={styles.card} onPress={() => toggleSelect(item.id)}>
                    {selected && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                    <Image source={item.image} style={styles.deviceImage} contentFit="contain" />
                  </Pressable>
                  <Text style={styles.deviceName}>{item.name}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actionsRow}>
          <Pressable style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
          <Pressable style={styles.selectButton} onPress={handleSelect}>
            <Text style={styles.selectText}>Select</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
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
  emptyState: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#7A7A7F',
    fontSize: 14,
    fontWeight: '500',
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
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
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
  actionsRow: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  clearButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  clearText: {
    color: '#121212',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Noto Sans',
  },
  selectButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  selectText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Noto Sans',
  },
});
