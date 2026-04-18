import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type Comparator = '<' | '=' | '>';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function ConditionCard({
  title,
  value,
  unit,
  max,
  comparator,
  onComparatorChange,
  onValueChange,
}: {
  title: string;
  value: number;
  unit: string;
  max: number;
  comparator: Comparator;
  onComparatorChange: (value: Comparator) => void;
  onValueChange: (value: number) => void;
}) {
  const [sliderWidth, setSliderWidth] = useState(1);

  const ratio = useMemo(() => clamp(value / max, 0, 1), [max, value]);

  const updateByX = (x: number) => {
    const nextRatio = clamp(x / sliderWidth, 0, 1);
    onValueChange(Math.round(nextRatio * max));
  };

  return (
    <View style={styles.conditionCard}>
      <Text style={styles.conditionTitle}>{title}</Text>

      <View style={styles.comparatorWrap}>
        {(['<', '=', '>'] as Comparator[]).map((item) => {
          const active = comparator === item;
          return (
            <Pressable
              key={item}
              style={[styles.comparatorButton, active && styles.comparatorButtonActive]}
              onPress={() => onComparatorChange(item)}>
              <Text style={[styles.comparatorText, active && styles.comparatorTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.valueText}>
        {value}
        {unit}
      </Text>

      <View
        style={styles.sliderTrack}
        onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => updateByX(event.nativeEvent.locationX)}
        onResponderMove={(event) => updateByX(event.nativeEvent.locationX)}>
        <View style={[styles.sliderActive, { width: `${ratio * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>0%</Text>
        <Text style={styles.scaleText}>100%</Text>
      </View>
    </View>
  );
}

export default function AutomationConditionScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    selected?: string;
    selectedType?: string;
    taskId?: string;
    taskName?: string;
    action?: string;
    tempComparator?: Comparator;
    humidityComparator?: Comparator;
    temperature?: string;
    humidity?: string;
  }>();

  const parseComparator = (value: string | undefined, fallback: Comparator): Comparator => {
    if (value === '<' || value === '=' || value === '>') {
      return value;
    }
    return fallback;
  };

  const parseNumber = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return parsed;
  };

  const [tempComparator, setTempComparator] = useState<Comparator>(() =>
    parseComparator(params.tempComparator, '<')
  );
  const [humidityComparator, setHumidityComparator] = useState<Comparator>(() =>
    parseComparator(params.humidityComparator, '<')
  );
  const [temperature, setTemperature] = useState(() => parseNumber(params.temperature, 27));
  const [humidity, setHumidity] = useState(() => parseNumber(params.humidity, 5));

  const handleContinue = () => {
    router.push({
      pathname: '/automation-schedule',
      params: {
        category: params.category ?? '',
        selected: params.selected ?? '',
        selectedType: params.selectedType ?? '',
        tempComparator,
        humidityComparator,
        temperature: String(temperature),
        humidity: String(humidity),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
          <Text style={styles.title}>Select Condition</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentWrap} showsVerticalScrollIndicator={false}>
          <ConditionCard
            title="Temperature"
            value={temperature}
            unit="°C"
            max={100}
            comparator={tempComparator}
            onComparatorChange={setTempComparator}
            onValueChange={setTemperature}
          />

          <ConditionCard
            title="Humidity"
            value={humidity}
            unit="%"
            max={100}
            comparator={humidityComparator}
            onComparatorChange={setHumidityComparator}
            onValueChange={setHumidity}
          />
        </ScrollView>

        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
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
  contentScroll: {
    marginTop: 6,
    flex: 1,
  },
  contentWrap: {
    gap: 8,
    alignItems: 'center',
    paddingBottom: 10,
  },
  conditionCard: {
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    width: 355,
    height: 340,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
  },
  conditionTitle: {
    color: '#121212',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  comparatorWrap: {
    marginTop: 20,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#BEBFC3',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  comparatorButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparatorButtonActive: {
    backgroundColor: '#000000',
  },
  comparatorText: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  comparatorTextActive: {
    color: '#FFFFFF',
  },
  valueText: {
    marginTop: 50,
    textAlign: 'center',
    color: '#111111',
    fontSize: 55,
    lineHeight: 60,
    fontWeight: '700',
  },
  sliderTrack: {
    marginTop: 38,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D1D4',
    justifyContent: 'center',
  },
  sliderActive: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  sliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000000',
    marginLeft: -7,
  },
  scaleRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleText: {
    color: '#444444',
    fontSize: 12,
  },
  continueButton: {
    marginTop: 32,
    marginBottom: 32,
    backgroundColor: '#111111',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
