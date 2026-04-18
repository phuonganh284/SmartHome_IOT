import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { automationAPI, type AutomationRule } from '@/services/api';

type AutomationItem = {
  id: string;
  name: string;
  icon: any;
  rule: AutomationRule;
  config?: {
    action?: 'on' | 'off';
  };
};

const toSingleParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const toComparator = (value?: string): '<' | '=' | '>' => {
  if (value === '<' || value === '=' || value === '>') return value;
  return '<';
};

const parseSelectedDevices = (value?: string) => {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
};

const mapRuleToItem = (rule: AutomationRule): AutomationItem => {
  const firstAction = rule.actions?.[0]?.action?.toLowerCase() || '';
  const isOffAction = firstAction.includes('off');

  return {
    id: String(rule.id),
    name: rule.name || `Rule #${rule.id}`,
    icon: isOffAction ? require('@/assets/images/Frame.png') : require('@/assets/images/Light.png'),
    rule,
    config: {
      action: isOffAction ? 'off' : 'on',
    },
  };
};

export default function AutomationScreen() {
  const params = useLocalSearchParams<{
    compose?: string | string[];
    action?: string | string[];
    selected?: string | string[];
    tempComparator?: string | string[];
    humidityComparator?: string | string[];
    temperature?: string | string[];
    humidity?: string | string[];
    start_time?: string | string[];
    end_time?: string | string[];
    start_date?: string | string[];
    end_date?: string | string[];
  }>();
  const inputRef = useRef<TextInput>(null);
  const [activeMode, setActiveMode] = useState<'manual' | 'ai'>('manual');
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [switches, setSwitches] = useState<Record<string, boolean>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});

  const loadRules = useCallback(async () => {
    try {
      const rules = await automationAPI.getRules();
      const nextItems = rules.map(mapRuleToItem);
      const nextSwitches: Record<string, boolean> = {};

      nextItems.forEach((item) => {
        nextSwitches[item.id] = !!item.rule.is_active;
      });

      setItems(nextItems);
      setSwitches(nextSwitches);
    } catch (error) {
      Alert.alert('Cannot load automations', error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRules();
    }, [loadRules])
  );

  useEffect(() => {
    if (toSingleParam(params.compose) === '1') {
      setShowComposer(true);
      setTimeout(() => inputRef.current?.focus(), 120);
      router.setParams({
        compose: undefined,
        action: undefined,
        selected: undefined,
        tempComparator: undefined,
        humidityComparator: undefined,
        temperature: undefined,
        humidity: undefined,
        start_time: undefined,
        end_time: undefined,
        start_date: undefined,
        end_date: undefined,
      });
    }
  }, [params.compose]);

  useEffect(() => {
    setDeleteMode(false);
    setSelectedTasks({});
    setShowComposer(false);
  }, [activeMode]);

  const handleCompleteTask = async () => {
    const name = taskName.trim();
    if (!name) {
      return;
    }

    const selected = parseSelectedDevices(toSingleParam(params.selected));
    if (selected.length === 0) {
      Alert.alert('Missing devices', 'Please select at least one device before creating automation.');
      return;
    }

    const action = toSingleParam(params.action) === 'off' ? 'turn_off' : 'turn_on';
    const temperature = Number(toSingleParam(params.temperature) || '27');
    const humidity = Number(toSingleParam(params.humidity) || '5');
    const startTime = toSingleParam(params.start_time);
    const endTime = toSingleParam(params.end_time);
    const startDate = toSingleParam(params.start_date);
    const endDate = toSingleParam(params.end_date);

    try {
      await automationAPI.createRule({
        name,
        devices: selected,
        conditions: [
          {
            sensor_type: 'temperature',
            operator: toComparator(toSingleParam(params.tempComparator)),
            value: Number.isFinite(temperature) ? temperature : 27,
          },
          {
            sensor_type: 'humidity',
            operator: toComparator(toSingleParam(params.humidityComparator)),
            value: Number.isFinite(humidity) ? humidity : 5,
          },
        ],
        actions: [{ action, value: null }],
        schedule:
          startTime && endTime
            ? {
                start_time: startTime,
                end_time: endTime,
                start_date: startDate || null,
                end_date: endDate || null,
              }
            : null,
      });

      setTaskName('');
      setShowComposer(false);
      await loadRules();
    } catch (error) {
      Alert.alert('Create automation failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const toggleSelectedTask = (taskId: string) => {
    setSelectedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const enterDeleteMode = (taskId: string) => {
    setDeleteMode(true);
    setSelectedTasks((prev) => ({ ...prev, [taskId]: true }));
  };

  const deleteSelectedTasks = async () => {
    const selectedIds = Object.keys(selectedTasks).filter((id) => selectedTasks[id]);
    if (selectedIds.length === 0) {
      setDeleteMode(false);
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => automationAPI.deleteRule(id)));
      setSelectedTasks({});
      setDeleteMode(false);
      await loadRules();
    } catch (error) {
      Alert.alert('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const selectedCount = useMemo(
    () => Object.keys(selectedTasks).filter((id) => selectedTasks[id]).length,
    [selectedTasks]
  );

  const openTaskDevices = (item: AutomationItem) => {
    router.push({
      pathname: '/automation-create',
      params: {
        taskId: item.id,
        taskName: item.name,
        action: item.config?.action,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Automation</Text>
          <View style={styles.headerIcons}>
            <Image source={require('@/assets/images/Vector.png')} style={styles.headerIcon} contentFit="contain" />
            <Image source={require('@/assets/images/notifications.png')} style={styles.headerIcon} contentFit="contain" />
          </View>
        </View>

        <View style={styles.modeSwitchRow}>
          <Pressable
            style={[styles.modeChip, activeMode === 'manual' && styles.modeChipActive]}
            onPress={() => setActiveMode('manual')}>
            <Text style={[styles.modeChipText, activeMode === 'manual' && styles.modeChipTextActive]}>Manual</Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, activeMode === 'ai' && styles.modeChipActive]}
            onPress={() => setActiveMode('ai')}>
            <Text style={[styles.modeChipText, activeMode === 'ai' && styles.modeChipTextActive]}>AI</Text>
          </Pressable>
        </View>

        {activeMode === 'manual' ? (
          <>
            <View style={styles.listWrap}>
              {items.map((item) => {
                const isOn = !!switches[item.id];

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.card, selectedTasks[item.id] && styles.cardSelected]}
                    onLongPress={() => enterDeleteMode(item.id)}
                    onPress={() => {
                      if (deleteMode) {
                        toggleSelectedTask(item.id);
                        return;
                      }
                      openTaskDevices(item);
                    }}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardLeft}>
                        <Image source={item.icon} style={styles.itemIcon} contentFit="contain" />
                        <Text style={styles.cardTitle}>{item.name}</Text>
                      </View>

                      <Pressable
                        style={[styles.switchTrack, isOn && styles.switchTrackOn]}
                        onPress={(event) => {
                          event.stopPropagation();
                          setSwitches((prev) => {
                            return { ...prev, [item.id]: !prev[item.id] };
                          });
                        }}>
                        <View style={[styles.switchThumb, isOn && styles.switchThumbOn]} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {deleteMode && (
              <View style={styles.deleteRow}>
                <Text style={styles.deleteCountText}>{selectedCount} selected</Text>
                <Pressable style={styles.deleteFab} onPress={deleteSelectedTasks}>
                  <Image source={require('@/assets/images/Trash 2.png')} style={styles.deleteFabIcon} contentFit="contain" />
                </Pressable>
              </View>
            )}

            {showComposer ? (
              <View style={styles.composeCard}>
                <View style={styles.composeHandle} />
                <Text style={styles.composeTitle}>Task Name</Text>
                <TextInput
                  ref={inputRef}
                  value={taskName}
                  onChangeText={setTaskName}
                  onBlur={() => {
                    if (!taskName.trim()) {
                      setShowComposer(false);
                    }
                  }}
                  placeholder="Name your task"
                  placeholderTextColor="#7E7E83"
                  style={styles.composeInput}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => void handleCompleteTask()}
                />
              </View>
            ) : (
              <Pressable style={styles.addTaskCard} onPress={() => router.push('/automation-create')}>
                <Text style={styles.addPlus}>+</Text>
                <Text style={styles.addTaskText}>Add New Task</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.aiPanel}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
            <Text style={styles.aiTitle}>Smart suggestions coming soon</Text>
            <Text style={styles.aiSubtitle}>
              This section will generate automation ideas from device usage, sensor patterns, and your routines.
            </Text>

            <View style={styles.aiCard}>
              <Text style={styles.aiCardLabel}>Planned features</Text>
              <Text style={styles.aiCardText}>- Auto-create rules from temperature and humidity trends</Text>
              <Text style={styles.aiCardText}>- Recommend schedules based on your habits</Text>
              <Text style={styles.aiCardText}>- Build rules in natural language</Text>
            </View>

            <Pressable style={styles.aiButton} disabled>
              <Text style={styles.aiButtonText}>Backend not ready</Text>
            </Pressable>
          </View>
        )}
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
  title: {
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
  modeSwitchRow: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 10,
  },
  modeChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F2F2F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeChipActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  modeChipText: {
    color: '#5F626B',
    fontSize: 15,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  listWrap: {
    marginTop: 22,
    gap: 14,
  },
  card: {
    width: '100%',
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 118,
    paddingHorizontal: 16,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: '#A6A8AF',
    backgroundColor: '#ECEDEF',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  itemIcon: {
    width: 52,
    height: 52,
    opacity: 0.7,
  },
  cardTitle: {
    color: '#4A4A4F',
    fontSize: 40 / 2,
    lineHeight: 54 / 2,
    letterSpacing: 0.1,
    fontWeight: '700',
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
  addTaskCard: {
    marginTop: 'auto',
    marginBottom: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D3D3D6',
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  addPlus: {
    color: '#B6B7BC',
    fontSize: 52,
    lineHeight: 52,
    fontWeight: '300',
  },
  addTaskText: {
    color: '#BCBCC0',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  composeCard: {
    marginTop: 'auto',
    marginBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F0F0F1',
    borderWidth: 1,
    borderColor: '#DDDEE1',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  composeHandle: {
    alignSelf: 'center',
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#202124',
    marginBottom: 4,
  },
  composeTitle: {
    textAlign: 'center',
    color: '#141414',
    fontSize: 31 / 2,
    lineHeight: 42 / 2,
    fontWeight: '700',
    marginBottom: 8,
  },
  composeInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#F8F8F9',
    paddingHorizontal: 10,
    color: '#1F1F22',
    fontSize: 14,
    fontWeight: '500',
  },
  aiPanel: {
    marginTop: 22,
    flex: 1,
    paddingBottom: 28,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  aiTitle: {
    marginTop: 16,
    color: '#26262A',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  aiSubtitle: {
    marginTop: 10,
    color: '#7C7F86',
    fontSize: 14,
    lineHeight: 20,
  },
  aiCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#F4F4F6',
    borderWidth: 1,
    borderColor: '#E2E2E6',
    padding: 16,
  },
  aiCardLabel: {
    color: '#1F1F22',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  aiCardText: {
    color: '#5E6068',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  aiButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D7D8DC',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  aiButtonText: {
    color: '#5F626B',
    fontSize: 15,
    fontWeight: '700',
  },
});
