import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { fanAPI, lightAPI } from '@/services/api';
import { getLightUiState, setLightUiState, subscribeLightUiState } from '@/services/mockDeviceState';


const palette = [
  '#7C4CC8',
  '#6E59FF',
  '#5F92FF',
  '#59C0E7',
  '#5BAF5D',
  '#E0D92D',
  '#F09C1A',
  '#F1447C',
  '#F54B42',
  '#D9DCE7',
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function DeviceControlScreen() {
  const params = useLocalSearchParams<{ deviceId?: string; deviceType?: string }>();
  const deviceId = params.deviceId ?? 'light';
  const initialType = (params.deviceType ?? String(deviceId) ?? '').toLowerCase();
  const startsAsFan = initialType === 'fan';
  const lightKey = String(deviceId);
  const routeType = (params.deviceType ?? '').toLowerCase();
  const lightState = useSyncExternalStore(
    subscribeLightUiState,
    () => getLightUiState(lightKey),
    () => getLightUiState(lightKey)
  );
  const power = lightState.power;
  const intensity = lightState.intensity;
  const selectedColor = lightState.color;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingColor, setPendingColor] = useState(selectedColor);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [applianceMode, setApplianceMode] = useState<'cooling' | 'heating' | 'low' | 'medium' | 'high' | 'auto'>(
    startsAsFan ? 'low' : 'cooling'
  );
  const [speed, setSpeed] = useState<0 | 1 | 2 | 3>(0);
  const [savingColor, setSavingColor] = useState(false);
  const [savingIntensity, setSavingIntensity] = useState(false);
  const [savingAppliance, setSavingAppliance] = useState(false);

  const effectiveType = useMemo(() => {
    if (routeType === 'ac' || routeType === 'fan' || routeType === 'light') return routeType;
    if (deviceId === 'ac' || deviceId === 'fan' || deviceId === 'light') return deviceId;
    return 'light';
  }, [deviceId, routeType]);

  const title = useMemo(() => {
    if (effectiveType === 'ac') return 'Smart AC';
    if (effectiveType === 'fan') return 'Smart Fan';
    return 'Smart Light';
  }, [effectiveType]);

  const isLight = effectiveType === 'light';
  const lightColor = power ? selectedColor : '#D9DBDF';
  const glowOpacity = power ? 0.35 + (intensity / 100) * 0.55 : 0.2;
  const applianceImage =
    effectiveType === 'fan'
      ? require('@/assets/images/smartfan.png')
      : require('@/assets/images/smartAC.png');
  const isFan = effectiveType === 'fan';
  const modeLeft = isFan ? 'low' : 'cooling';
  const modeRight = isFan ? 'high' : 'heating';
  const modeLeftLabel = isFan ? 'Low' : 'Cooling';
  const modeRightLabel = isFan ? 'High' : 'Heating';
  const fanModes: Array<{ key: 'low' | 'medium' | 'high' | 'auto'; label: string }> = [
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
    { key: 'auto', label: 'Auto' },
  ];

  const numericDeviceId = useMemo(() => {
    const parsed = Number(lightKey);
    return Number.isFinite(parsed) ? parsed : null;
  }, [lightKey]);

  useEffect(() => {
    if (!isLight || numericDeviceId === null) {
      return;
    }

    let cancelled = false;

    const loadLightDetail = async () => {
      try {
        const data = await lightAPI.getLight(numericDeviceId);
        if (cancelled) return;

        const status = Number((data as { status?: unknown }).status);
        const intensityFromApi = Number((data as { intensity?: unknown }).intensity);
        const colorFromApi = (data as { color?: unknown }).color;

        setLightUiState(lightKey, {
          power: status === 1,
          intensity: Number.isFinite(intensityFromApi) ? clamp(intensityFromApi, 0, 100) : intensity,
          color: typeof colorFromApi === 'string' && colorFromApi ? colorFromApi : selectedColor,
        });
      } catch {
        // Keep local mock state if API fetch fails.
      }
    };

    void loadLightDetail();

    return () => {
      cancelled = true;
    };
  }, [isLight, numericDeviceId, lightKey]);

  useEffect(() => {
    if (isLight || numericDeviceId === null) {
      return;
    }

    let cancelled = false;

    const loadApplianceDetail = async () => {
      try {
        const data = await fanAPI.getFan(numericDeviceId);
        if (cancelled) return;

        const modeFromApi = String((data as { mode?: unknown }).mode || '').toLowerCase();
        const speedFromApi = Number((data as { speed_level?: unknown }).speed_level);

        if (
          modeFromApi === 'low' ||
          modeFromApi === 'medium' ||
          modeFromApi === 'high' ||
          modeFromApi === 'auto' ||
          modeFromApi === 'cooling' ||
          modeFromApi === 'heating'
        ) {
          setApplianceMode(modeFromApi);
        }

        if (speedFromApi >= 0 && speedFromApi <= 3) {
          setSpeed(speedFromApi as 0 | 1 | 2 | 3);
        }
      } catch {
        // Keep local fallback state if API fetch fails.
      }
    };

    void loadApplianceDetail();

    return () => {
      cancelled = true;
    };
  }, [isLight, numericDeviceId]);

  const updateIntensityFromX = (locationX: number) => {
    const ratio = clamp(locationX / sliderWidth, 0, 1);
    setLightUiState(lightKey, { intensity: Math.round(ratio * 100) });
  };

  const openPicker = () => {
    if (!power) {
      Alert.alert('Light is off', 'Please turn on the light first to change color.');
      return;
    }
    setPendingColor(selectedColor);
    setPickerOpen(true);
  };

  const applyColor = async () => {
    const previousColor = selectedColor;

    setLightUiState(lightKey, { color: pendingColor });
    setPickerOpen(false);

    if (!isLight || numericDeviceId === null) {
      return;
    }

    try {
      setSavingColor(true);
      await lightAPI.setColor(numericDeviceId, pendingColor);
    } catch (error) {
      setLightUiState(lightKey, { color: previousColor });
      Alert.alert('Update color failed', error instanceof Error ? error.message : 'Cannot connect to backend.');
    } finally {
      setSavingColor(false);
    }
  };

  const updateApplianceMode = async (nextMode: 'cooling' | 'heating' | 'low' | 'medium' | 'high' | 'auto') => {
    const previousMode = applianceMode;
    setApplianceMode(nextMode);

    if (isLight || numericDeviceId === null) {
      return;
    }

    try {
      setSavingAppliance(true);
      await fanAPI.setMode(numericDeviceId, nextMode);
    } catch (error) {
      setApplianceMode(previousMode);
      Alert.alert('Update mode failed', error instanceof Error ? error.message : 'Cannot connect to backend.');
    } finally {
      setSavingAppliance(false);
    }
  };

  const updateApplianceSpeed = async (nextSpeed: 0 | 1 | 2 | 3) => {
    const previousSpeed = speed;
    setSpeed(nextSpeed);

    if (isLight || numericDeviceId === null) {
      return;
    }

    try {
      setSavingAppliance(true);
      await fanAPI.setSpeed(numericDeviceId, nextSpeed);
    } catch (error) {
      setSpeed(previousSpeed);
      Alert.alert('Update speed failed', error instanceof Error ? error.message : 'Cannot connect to backend.');
    } finally {
      setSavingAppliance(false);
    }
  };

  if (!isLight) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headRow}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backArrow}>{'←'}</Text>
            </Pressable>
          </View>

          <Text style={styles.applianceTitle}>{title}</Text>

          <View style={styles.applianceHero}>
            <Image source={applianceImage} style={styles.applianceImage} contentFit="contain" />
          </View>

          <View style={styles.applianceSection}>
            <Text style={styles.applianceSectionTitle}>Mode</Text>
            {isFan ? (
              <View style={styles.modeGrid}>
                {fanModes.map((modeItem) => (
                  <Pressable
                    key={modeItem.key}
                    style={[styles.modeButton, styles.modeGridButton, applianceMode === modeItem.key && styles.modeButtonActive]}
                    onPress={() => void updateApplianceMode(modeItem.key)}>
                    <Text style={[styles.modeText, applianceMode === modeItem.key && styles.modeTextActive]}>{modeItem.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.modeRow}>
                <Pressable
                  style={[styles.modeButton, applianceMode === modeLeft && styles.modeButtonActive]}
                  onPress={() => void updateApplianceMode(modeLeft)}>
                  <Text style={[styles.modeText, applianceMode === modeLeft && styles.modeTextActive]}>{modeLeftLabel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modeButton, applianceMode === modeRight && styles.modeButtonActive]}
                  onPress={() => void updateApplianceMode(modeRight)}>
                  <Text style={[styles.modeText, applianceMode === modeRight && styles.modeTextActive]}>{modeRightLabel}</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.applianceSection}>
            <Text style={styles.applianceSectionTitle}>Speed</Text>
            <View style={styles.speedRow}>
              {[0, 1, 2, 3].map((speedLevel) => (
                <Pressable
                  key={speedLevel}
                  style={[styles.speedButton, speed === speedLevel && styles.speedButtonActive]}
                  onPress={() => void updateApplianceSpeed(speedLevel as 0 | 1 | 2 | 3)}>
                  <Text style={[styles.speedText, speed === speedLevel && styles.speedTextActive]}>
                    {speedLevel}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {savingAppliance && <Text style={styles.syncText}>Syncing with backend...</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
        </View>

        <View style={styles.lightHero}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Smart</Text>
            <Text style={styles.title}>Light</Text>
          </View>

          <View style={styles.lampWrap}>
            <Image
              source={require('@/assets/images/lamp.png')}
              style={styles.lampImage}
              contentFit="contain"
            />
            <View style={styles.beamWrap}>
              <Image
                source={require('@/assets/images/lightcolour.png')}
                style={[
                  styles.beamImage,
                  {
                    tintColor: lightColor,
                    opacity: glowOpacity,
                  },
                ]}
                contentFit="fill"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, !power && styles.textDisabled]}>Color</Text>
          <Pressable
            style={[styles.colorTrigger, { backgroundColor: selectedColor }, !power && styles.colorTriggerDisabled]}
            onPress={openPicker}
            disabled={!power}
          />
        </View>

        <View style={styles.intensityHeader}>
          <Text style={styles.sectionTitle}>Intensity</Text>
          <Text style={styles.intensityValue}>{intensity}%</Text>
        </View>

        <View
          style={styles.sliderTrack}
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event) => updateIntensityFromX(event.nativeEvent.locationX)}
          onResponderMove={(event) => updateIntensityFromX(event.nativeEvent.locationX)}
          onResponderRelease={(event) => {
            const ratio = clamp(event.nativeEvent.locationX / sliderWidth, 0, 1);
            const value = Math.round(ratio * 100);
            setLightUiState(lightKey, { intensity: value });

            if (numericDeviceId === null) {
              return;
            }

            const syncIntensity = async () => {
              try {
                setSavingIntensity(true);
                await lightAPI.setIntensity(numericDeviceId, value);
              } catch (error) {
                Alert.alert(
                  'Update intensity failed',
                  error instanceof Error ? error.message : 'Cannot connect to backend.'
                );
              } finally {
                setSavingIntensity(false);
              }
            };

            void syncIntensity();
          }}>
          <View style={[styles.sliderActive, { width: `${intensity}%` }]} />
          <View style={[styles.sliderThumb, { left: `${intensity}%` }]} />
        </View>

        <View style={styles.scaleRow}>
          <Text style={styles.scaleText}>0%</Text>
          <Text style={styles.scaleText}>100%</Text>
        </View>

        {(savingColor || savingIntensity) && <Text style={styles.syncText}>Syncing with backend...</Text>}
      </View>

      <Modal transparent visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Color</Text>
            <Text style={styles.sheetHint}>Pick available colors</Text>
            <View style={styles.divider} />

            <View style={styles.paletteWrap}>
              {palette.map((color) => {
                const isActive = color === pendingColor;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setPendingColor(color)}
                    style={[
                      styles.paletteDot,
                      {
                        borderColor: color,
                        backgroundColor: isActive ? color : '#FFFFFF',
                      },
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelButton} onPress={() => setPickerOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.applyButton} onPress={applyColor}>
                <Text style={styles.applyText}>Set Color</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  headRow: { height: 70, justifyContent: 'center', marginTop: 12 },
  backArrow: { fontSize: 40, color: '#232323' },
  lightHero: {
    marginTop: 10,
    alignItems: 'center',
    minHeight: 290,
  },
  titleBlock: {
    position: 'absolute',
    left: 0,
    top: 8,
    zIndex: 2,
  },
  title: {
    color: '#111111',
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -0.7,
    fontWeight: '700',
  },
  lampWrap: {
    marginTop: 0,
    width: 230,
    alignItems: 'center',
    marginLeft: 180,
  },
  lampImage: {
    width: 230,
    height: 160,
  },
  beamWrap: {
    marginTop: -8,
    width: 190,
    height: 150,
    alignItems: 'center',
    overflow: 'hidden',
  },
  beamImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    marginTop: 20,
  },
  applianceSection: {
    marginTop: 70,
  },
  applianceTitle: {
    color: '#111111',
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -0.7,
    fontWeight: '700',
    marginTop: 2,
  },
  applianceHero: {
    marginTop: 34,
    alignItems: 'center',
    minHeight: 170,
  },
  applianceImage: {
    width: 400,
    height: 300,
  },
  modeRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  modeGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeGridButton: {
    flexBasis: '47.5%',
    flexGrow: 0,
  },
  modeButtonActive: {
    backgroundColor: '#101010',
  },
  modeText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  speedRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  speedButton: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8EB',
  },
  speedButtonActive: {
    backgroundColor: '#101010',
  },
  speedText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '500',
  },
  speedTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#151515',
    fontSize: 30 / 2,
    lineHeight: 36 / 2,
    fontWeight: '700',
  },
  applianceSectionTitle: {
    color: '#151515',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  toggle: {
    marginTop: 12,
    width: 56,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: '#AEB3BF' },
  toggleOff: { backgroundColor: '#DFDFE2' },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2F2F2',
  },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
  colorTrigger: {
    marginTop: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8D8DB',
  },
  colorTriggerDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.5,
  },
  intensityHeader: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applianceIntensityHeader: {
    marginTop: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intensityValue: {
    color: '#161616',
    fontSize: 20 / 2,
    lineHeight: 20 / 2,
    fontWeight: '700',
  },
  sliderTrack: {
    marginTop: 18,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4E4E7',
    justifyContent: 'center',
  },
  sliderActive: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    backgroundColor: '#111111',
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111111',
    marginLeft: -10,
  },
  scaleRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleText: {
    color: '#444444',
    fontSize: 10,
  },
  syncText: {
    marginTop: 8,
    color: '#7E8087',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  sheet: {
    backgroundColor: '#F3F3F4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  grabber: {
    alignSelf: 'center',
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#111111',
    marginBottom: 14,
  },
  sheetTitle: {
    color: '#111111',
    fontSize: 30 / 2,
    lineHeight: 36 / 2,
    fontWeight: '700',
  },
  sheetHint: {
    marginTop: 6,
    color: '#BABCC2',
    fontSize: 12 / 2,
    lineHeight: 20 / 2,
  },
  divider: {
    marginTop: 14,
    height: 1,
    backgroundColor: '#DDDEE1',
  },
  paletteWrap: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    rowGap: 14,
  },
  paletteDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
  },
  sheetActions: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CFCFD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#111111',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
