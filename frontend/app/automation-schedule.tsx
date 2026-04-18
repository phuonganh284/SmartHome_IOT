import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScrollView } from 'react-native';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const toDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default function AutomationScheduleScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    selected?: string;
    selectedType?: string;
    tempComparator?: '<' | '=' | '>';
    humidityComparator?: '<' | '=' | '>';
    temperature?: string;
    humidity?: string;
  }>();
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => toMonthStart(today));
  const [rangeStart, setRangeStart] = useState<Date | null>(today);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [onTime, setOnTime] = useState('10:27');
  const [onMeridiem, setOnMeridiem] = useState('PM');
  const [offTime, setOffTime] = useState('07:30');
  const [offMeridiem, setOffMeridiem] = useState('AM');
  const [activeTimeGroup, setActiveTimeGroup] = useState<'on' | 'off' | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const monthLabel = `${monthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

  const daysInVisibleMonth = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => {
      const dayNumber = i + 1;
      const date = new Date(year, month, dayNumber);
      return {
        key: `${year}-${month + 1}-${dayNumber}`,
        dayNumber,
        weekDay: weekDayNames[date.getDay()],
        date,
      };
    });
  }, [visibleMonth]);

  const goPrevMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const compareDate = (a: Date, b: Date) => toDateOnly(a).getTime() - toDateOnly(b).getTime();

  const handleDatePress = (date: Date) => {
    if (!rangeStart) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    if (rangeEnd) {
      if (isSameDate(date, rangeStart)) {
        setRangeStart(rangeEnd);
        setRangeEnd(null);
        return;
      }

      if (isSameDate(date, rangeEnd)) {
        setRangeEnd(null);
        return;
      }

      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    const diff = compareDate(date, rangeStart);
    if (diff === 0) {
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    if (diff < 0) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
      return;
    }

    setRangeEnd(date);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const to24Hour = (time: string, meridiem: string) => {
    const [hourPart, minutePart] = time.split(':');
    const hourRaw = Number(hourPart);
    const minuteRaw = Number(minutePart);
    const safeMinute = Number.isNaN(minuteRaw) ? 0 : Math.max(0, Math.min(59, minuteRaw));
    let safeHour = Number.isNaN(hourRaw) ? 0 : Math.max(1, Math.min(12, hourRaw));

    const isPM = meridiem.trim().toUpperCase() === 'PM';
    if (isPM && safeHour < 12) safeHour += 12;
    if (!isPM && safeHour === 12) safeHour = 0;

    return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}:00`;
  };

  const formatDate = (value: Date | null) => {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleContinue = () => {
    router.push({
      pathname: '/automation-action',
      params: {
        category: params.category ?? '',
        selected: params.selected ?? '',
        selectedType: params.selectedType ?? '',
        tempComparator: params.tempComparator ?? '<',
        humidityComparator: params.humidityComparator ?? '<',
        temperature: params.temperature ?? '27',
        humidity: params.humidity ?? '5',
        start_time: to24Hour(onTime, onMeridiem),
        end_time: to24Hour(offTime, offMeridiem),
        start_date: formatDate(rangeStart),
        end_date: formatDate(rangeEnd ?? rangeStart),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior="padding"
        keyboardVerticalOffset={20}
        enabled={false}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.backArrow}>{'←'}</Text>
            </Pressable>
            <Text style={styles.title}>Schedule Time</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.contentWrap}>
            <View style={styles.timeCard}>
              <Text style={styles.hintText}>Select the desired time</Text>

              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>On Time</Text>
                  <View style={styles.timeInputRow}>
                    <View style={[styles.timeBox, activeTimeGroup === 'on' && styles.timeBoxActive]}>
                      <TextInput
                        value={onTime}
                        onChangeText={setOnTime}
                        onFocus={() => setActiveTimeGroup('on')}
                        style={[styles.timeInput, activeTimeGroup === 'on' && styles.timeBoxTextActive]}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.timeBox, activeTimeGroup === 'on' && styles.timeBoxActive]}>
                      <TextInput
                        value={onMeridiem}
                        onChangeText={(value) => setOnMeridiem(value.toUpperCase())}
                        onFocus={() => setActiveTimeGroup('on')}
                        style={[styles.timeInput, activeTimeGroup === 'on' && styles.timeBoxTextActive]}
                        autoCapitalize="characters"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>Off Time</Text>
                  <View style={styles.timeInputRow}>
                    <View style={[styles.timeBox, activeTimeGroup === 'off' && styles.timeBoxActive]}>
                      <TextInput
                        value={offTime}
                        onChangeText={setOffTime}
                        onFocus={() => setActiveTimeGroup('off')}
                        style={[styles.timeInput, activeTimeGroup === 'off' && styles.timeBoxTextActive]}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.timeBox, activeTimeGroup === 'off' && styles.timeBoxActive]}>
                      <TextInput
                        value={offMeridiem}
                        onChangeText={(value) => setOffMeridiem(value.toUpperCase())}
                        onFocus={() => setActiveTimeGroup('off')}
                        style={[styles.timeInput, activeTimeGroup === 'off' && styles.timeBoxTextActive]}
                        autoCapitalize="characters"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.scheduleCard}>
              <View style={styles.monthRow}>
                <Text style={styles.monthText}>{monthLabel}</Text>
                <View style={styles.monthArrows}>
                  <Pressable onPress={goPrevMonth} hitSlop={8}>
                    <Text style={styles.monthArrow}>{'‹'}</Text>
                  </Pressable>
                  <Pressable onPress={goNextMonth} hitSlop={8}>
                    <Text style={styles.monthArrow}>{'›'}</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.hintText}>Select the desired date</Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.dayGrid}
                style={styles.dayScroll}>
                {daysInVisibleMonth.map((item) => {
                  const isStart = rangeStart ? isSameDate(item.date, rangeStart) : false;
                  const isEnd = rangeEnd ? isSameDate(item.date, rangeEnd) : false;
                  const isSingleDay = isStart && !rangeEnd;
                  const isBetweenRange =
                    !!rangeStart &&
                    !!rangeEnd &&
                    compareDate(item.date, rangeStart) > 0 &&
                    compareDate(item.date, rangeEnd) < 0;
                  const isActiveEdge = isSingleDay || isStart || isEnd;
                  return (
                    <Pressable
                      key={item.key}
                      style={[
                        styles.dayChip,
                        isBetweenRange && styles.dayChipRange,
                        isActiveEdge && styles.dayChipActive,
                      ]}
                      onPress={() => handleDatePress(item.date)}>
                      <Text
                        style={[
                          styles.dayNumber,
                          isBetweenRange && styles.dayTextRange,
                          isActiveEdge && styles.dayNumberActive,
                        ]}>
                        {String(item.dayNumber).padStart(2, '0')}
                      </Text>
                      <Text
                        style={[
                          styles.dayName,
                          isBetweenRange && styles.dayTextRange,
                          isActiveEdge && styles.dayNameActive,
                        ]}>
                        {item.weekDay}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {!keyboardVisible && (
            <Pressable style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  keyboardWrap: {
    flex: 1,
  },
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
  contentWrap: {
    marginTop: 6,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleCard: {
    width: 355,
    flex: 1,
    minHeight: 420,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    color: '#121212',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  monthArrows: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  monthArrow: {
    color: '#121212',
    fontSize: 22,
    fontWeight: '700',
  },
  hintText: {
    marginTop: 2,
    color: '#B0B0B0',
    fontSize: 11,
    fontWeight: '500',
  },
  dayGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 9,
    rowGap: 8,
    paddingBottom: 8,
  },
  dayScroll: {
    marginRight: -2,
    marginTop: 4,
    flex: 1,
  },
  dayChip: {
    width: 76,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8D8DB',
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayChipActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  dayChipRange: {
    backgroundColor: '#D7DADF',
    borderColor: '#D7DADF',
  },
  dayNumber: {
    color: '#B6B6BA',
    fontSize: 12,
    fontWeight: '600',
  },
  dayName: {
    color: '#B6B6BA',
    fontSize: 12,
    fontWeight: '600',
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  dayNameActive: {
    color: '#FFFFFF',
  },
  dayTextRange: {
    color: '#5B616C',
  },
  timeCard: {
    width: 355,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  timeRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DDDEE1',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeGroup: {
    flex: 1,
  },
  timeLabel: {
    color: '#8D8F96',
    fontSize: 8,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timeBox: {
    flex: 1,
    height: 34,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D1D1D5',
    backgroundColor: '#ECECEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#707070',
  },
  timeBoxText: {
    color: '#AFAFB4',
    fontSize: 12,
    fontWeight: '600',
  },
  timeInput: {
    color: '#AFAFB4',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
  },
  timeBoxTextActive: {
    color: '#111111',
  },
  continueButton: {
    marginTop: 10,
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
