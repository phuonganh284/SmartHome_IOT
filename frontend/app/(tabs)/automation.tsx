import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { automationAPI, deviceAPI, type AutomationRule, type AutomationRulePayload, type Device } from '@/services/api';

type RuleCategory = 'light' | 'fan';

type DeviceLookup = Record<number, Device>;

type AutomationItem = {
  id: string;
  name: string;
  icon: any;
  category: RuleCategory;
  isAiRule: boolean;
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

const getRuleCategoryFromType = (value?: string): RuleCategory => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('fan') || normalized.includes('ac') || normalized.includes('air')) {
    return 'fan';
  }
  return 'light';
};

const getRuleCategoryPrefix = (value?: string) => {
  if (getRuleCategoryFromType(value) === 'fan') {
    return 'fan rule';
  }
  return 'light rule';
};

const isAiRule = (rule: AutomationRule): boolean => {
  if (typeof rule.is_ai === 'boolean') return rule.is_ai;
  return (rule.name || '').toLowerCase().startsWith('ai');
};

const getNextRuleNumber = (rules: AutomationRule[], prefix: string) => {
  const pattern = new RegExp(`^${prefix}\\s+(\\d+)$`, 'i');
  let max = 0;

  rules.forEach((rule) => {
    const match = (rule.name || '').trim().match(pattern);
    if (!match) return;

    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  });

  return max + 1;
};

const buildRuleConditions = (
  category: RuleCategory,
  tempComparator: string,
  humidityComparator: string,
  temperature: string,
  humidity: string
) => {
  if (category === 'light') {
    return [];
  }

  const nextTemperature = Number(temperature);
  const nextHumidity = Number(humidity);

  return [
    {
      sensor_type: 'temperature',
      operator: toComparator(tempComparator),
      value: Number.isFinite(nextTemperature) ? nextTemperature : 27,
    },
    {
      sensor_type: 'humidity',
      operator: toComparator(humidityComparator),
      value: Number.isFinite(nextHumidity) ? nextHumidity : 5,
    },
  ];
};

const toRulePayload = (rule: AutomationRule, name: string): AutomationRulePayload => ({
  name,
  devices: rule.devices || [],
  conditions: (rule.conditions || []).map((item) => ({
    sensor_type: item.sensor_type,
    operator: item.operator,
    value: item.value,
  })),
  actions: (rule.actions || []).map((item) => ({
    action: item.action,
    value: item.value ?? null,
  })),
  schedule: rule.schedules?.[0]
    ? {
        start_time: rule.schedules[0].start_time ?? null,
        end_time: rule.schedules[0].end_time ?? null,
        start_date: rule.schedules[0].start_date ?? null,
        end_date: rule.schedules[0].end_date ?? null,
      }
    : null,
});

const mapRuleToItem = (rule: AutomationRule, devicesById: DeviceLookup): AutomationItem => {
  const firstDevice = rule.devices?.[0] ? devicesById[rule.devices[0]] : undefined;
  const category = getRuleCategoryFromType(firstDevice?.type);
  const aiRule = isAiRule(rule);

  return {
    id: String(rule.id),
    name: rule.name || `Rule #${rule.id}`,
    icon: category === 'fan' ? require('@/assets/images/Frame.png') : require('@/assets/images/Light.png'),
    category,
    isAiRule: aiRule,
    rule,
    config: {
      action: rule.actions?.[0]?.action?.toLowerCase().includes('off') ? 'off' : 'on',
    },
  };
};

export default function AutomationScreen() {
  const params = useLocalSearchParams<{
    autoCreate?: string | string[];
    autoUpdate?: string | string[];
    ruleId?: string | string[];
    ruleName?: string | string[];
    action?: string | string[];
    selected?: string | string[];
    selectedType?: string | string[];
    category?: string | string[];
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
  const [mode, setMode] = useState<'ai' | 'manual'>('manual');
  const [manualCategory, setManualCategory] = useState<RuleCategory>('light');
  const [aiCategory, setAiCategory] = useState<RuleCategory>('light');
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [switches, setSwitches] = useState<Record<string, boolean>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [renameRuleId, setRenameRuleId] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [updatingSwitches, setUpdatingSwitches] = useState<Record<string, boolean>>({});
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'idle' | 'pending' | 'running'>('idle');
  const [deleteDotCount, setDeleteDotCount] = useState(1);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const processedAutoCreateKeyRef = useRef<string>('');
  const processedAutoUpdateKeyRef = useRef<string>('');
  const suppressCardPressUntilRef = useRef<Record<string, number>>({});
  const isResolvingConflictRef = useRef(false);
  const deleteCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteDotsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setRuleActiveByType = useCallback((item: AutomationItem, is_active: boolean) => {
    if (item.isAiRule) {
      return automationAPI.toggleAIRuleActive(item.id, is_active);
    }
    return automationAPI.setRuleActive(item.id, is_active);
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const [manualRules, aiRules, devices] = await Promise.all([
        automationAPI.getRules(),
        automationAPI.getAIRules(),
        deviceAPI.getDevices(),
      ]);
      const rules = [
        ...manualRules.map((rule) => ({ ...rule, is_ai: false })),
        ...aiRules.map((rule) => ({ ...rule, is_ai: true })),
      ];
      const devicesById: DeviceLookup = {};
      devices.forEach((device) => {
        devicesById[device.id] = device;
      });
      const nextItems = rules.map((rule) => mapRuleToItem(rule, devicesById));

      const hasActiveAiRule = nextItems.some((item) => item.isAiRule && item.rule.is_active);
      const hasActiveManualRule = nextItems.some((item) => !item.isAiRule && item.rule.is_active);

      if (hasActiveAiRule && hasActiveManualRule && !isResolvingConflictRef.current) {
        try {
          isResolvingConflictRef.current = true;
          const activeRules = nextItems.filter((item) => item.rule.is_active);
          await Promise.all(activeRules.map((item) => setRuleActiveByType(item, false)));

          Alert.alert(
            'Automation conflict',
            'AI and manual rules were active at the same time. All rules have been turned off.'
          );

          const [resetManualRules, resetAiRules] = await Promise.all([
            automationAPI.getRules(),
            automationAPI.getAIRules(),
          ]);
          const resetRules = [
            ...resetManualRules.map((rule) => ({ ...rule, is_ai: false })),
            ...resetAiRules.map((rule) => ({ ...rule, is_ai: true })),
          ];
          const resetItems = resetRules.map((rule) => mapRuleToItem(rule, devicesById));
          const resetSwitches: Record<string, boolean> = {};

          resetItems.forEach((item) => {
            resetSwitches[item.id] = !!item.rule.is_active;
          });

          setItems(resetItems);
          setSwitches(resetSwitches);
          return;
        } catch (error) {
          Alert.alert('Conflict handling failed', error instanceof Error ? error.message : 'Unknown error');
        } finally {
          isResolvingConflictRef.current = false;
        }
      }

      const nextSwitches: Record<string, boolean> = {};

      nextItems.forEach((item) => {
        nextSwitches[item.id] = !!item.rule.is_active;
      });

      setItems(nextItems);
      setSwitches(nextSwitches);

      const hasLight = nextItems.some((item) => item.category === 'light');
      const hasFan = nextItems.some((item) => item.category === 'fan');
      setManualCategory((prev) => {
        if (prev === 'light' && !hasLight && hasFan) return 'fan';
        if (prev === 'fan' && !hasFan && hasLight) return 'light';
        return prev;
      });

      const hasAiLight = nextItems.some((item) => item.isAiRule && item.category === 'light');
      const hasAiFan = nextItems.some((item) => item.isAiRule && item.category === 'fan');
      setAiCategory((prev) => {
        if (prev === 'light' && !hasAiLight && hasAiFan) return 'fan';
        if (prev === 'fan' && !hasAiFan && hasAiLight) return 'light';
        return prev;
      });
    } catch (error) {
      Alert.alert('Cannot load automations', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [setRuleActiveByType]);

  useFocusEffect(
    useCallback(() => {
      void loadRules();
    }, [loadRules])
  );

  useEffect(() => {
    if (toSingleParam(params.autoCreate) !== '1') {
      return;
    }

    const action = toSingleParam(params.action) || '';
    const selected = toSingleParam(params.selected) || '';
    const selectedType = toSingleParam(params.selectedType) || toSingleParam(params.category) || '';
    const tempComparator = toSingleParam(params.tempComparator) || '<';
    const humidityComparator = toSingleParam(params.humidityComparator) || '<';
    const temperature = toSingleParam(params.temperature) || '27';
    const humidity = toSingleParam(params.humidity) || '5';
    const startTime = toSingleParam(params.start_time) || '';
    const endTime = toSingleParam(params.end_time) || '';
    const startDate = toSingleParam(params.start_date) || '';
    const endDate = toSingleParam(params.end_date) || '';

    const createKey = [
      action,
      selected,
      selectedType,
      tempComparator,
      humidityComparator,
      temperature,
      humidity,
      startTime,
      endTime,
      startDate,
      endDate,
    ].join('|');

    if (!createKey || processedAutoCreateKeyRef.current === createKey) {
      return;
    }

    processedAutoCreateKeyRef.current = createKey;

    const createRuleNow = async () => {
      const selectedDevices = parseSelectedDevices(selected);
      if (selectedDevices.length === 0) {
        Alert.alert('Missing devices', 'Please select at least one device before creating automation.');
        return;
      }

      const nextAction = action === 'off' ? 'turn_off' : 'turn_on';
      const ruleCategory = getRuleCategoryFromType(selectedType);
      const nextConditions = buildRuleConditions(
        ruleCategory,
        tempComparator,
        humidityComparator,
        temperature,
        humidity
      );

      try {
        setIsAutoCreating(true);
        const existingRules = await automationAPI.getRules();
        const prefix = getRuleCategoryPrefix(selectedType);
        const defaultName = `${prefix} ${getNextRuleNumber(existingRules, prefix)}`;

        const created = await automationAPI.createRule({
          name: defaultName,
          devices: selectedDevices,
          conditions: nextConditions,
          actions: [{ action: nextAction, value: null }],
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

        await loadRules();
        setRenameRuleId(String(created.id));
        setTaskName(defaultName);
        setShowComposer(true);
        setTimeout(() => inputRef.current?.focus(), 120);

        router.setParams({
          autoCreate: undefined,
          action: undefined,
          selected: undefined,
          selectedType: undefined,
          category: undefined,
          tempComparator: undefined,
          humidityComparator: undefined,
          temperature: undefined,
          humidity: undefined,
          start_time: undefined,
          end_time: undefined,
          start_date: undefined,
          end_date: undefined,
        });
      } catch (error) {
        Alert.alert('Create automation failed', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsAutoCreating(false);
      }
    };

    void createRuleNow();
  }, [
    params.autoCreate,
    params.action,
    params.selected,
    params.selectedType,
    params.category,
    params.tempComparator,
    params.humidityComparator,
    params.temperature,
    params.humidity,
    params.start_time,
    params.end_time,
    params.start_date,
    params.end_date,
    loadRules,
  ]);

  useEffect(() => {
    if (toSingleParam(params.autoUpdate) !== '1') {
      return;
    }

    const ruleId = toSingleParam(params.ruleId) || '';
    const action = toSingleParam(params.action) || '';
    const selected = toSingleParam(params.selected) || '';
    const selectedType = toSingleParam(params.selectedType) || toSingleParam(params.category) || '';
    const tempComparator = toSingleParam(params.tempComparator) || '<';
    const humidityComparator = toSingleParam(params.humidityComparator) || '<';
    const temperature = toSingleParam(params.temperature) || '27';
    const humidity = toSingleParam(params.humidity) || '5';
    const startTime = toSingleParam(params.start_time) || '';
    const endTime = toSingleParam(params.end_time) || '';
    const startDate = toSingleParam(params.start_date) || '';
    const endDate = toSingleParam(params.end_date) || '';

    const updateKey = [
      ruleId,
      action,
      selected,
      selectedType,
      tempComparator,
      humidityComparator,
      temperature,
      humidity,
      startTime,
      endTime,
      startDate,
      endDate,
    ].join('|');

    if (!ruleId || processedAutoUpdateKeyRef.current === updateKey) {
      return;
    }

    processedAutoUpdateKeyRef.current = updateKey;

    const updateRuleNow = async () => {
      const selectedDevices = parseSelectedDevices(selected);
      if (selectedDevices.length === 0) {
        Alert.alert('Missing devices', 'Please select at least one device before updating automation.');
        return;
      }

      const nextAction = action === 'off' ? 'turn_off' : 'turn_on';
      const ruleCategory = getRuleCategoryFromType(selectedType);
      const nextConditions = buildRuleConditions(
        ruleCategory,
        tempComparator,
        humidityComparator,
        temperature,
        humidity
      );
      const current = items.find((item) => item.id === ruleId)?.rule;
      const fallbackName =
        toSingleParam(params.ruleName) || current?.name || `${getRuleCategoryPrefix(selectedType)} ${ruleId}`;

      try {
        await automationAPI.updateRule(ruleId, {
          name: fallbackName,
          devices: selectedDevices,
          conditions: nextConditions,
          actions: [{ action: nextAction, value: null }],
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

        await loadRules();
        router.setParams({
          autoUpdate: undefined,
          ruleId: undefined,
          ruleName: undefined,
          action: undefined,
          selected: undefined,
          selectedType: undefined,
          category: undefined,
          tempComparator: undefined,
          humidityComparator: undefined,
          temperature: undefined,
          humidity: undefined,
          start_time: undefined,
          end_time: undefined,
          start_date: undefined,
          end_date: undefined,
        });
      } catch (error) {
        Alert.alert('Update automation failed', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    void updateRuleNow();
  }, [
    params.autoUpdate,
    params.ruleId,
    params.ruleName,
    params.action,
    params.selected,
    params.selectedType,
    params.category,
    params.tempComparator,
    params.humidityComparator,
    params.temperature,
    params.humidity,
    params.start_time,
    params.end_time,
    params.start_date,
    params.end_date,
    items,
    loadRules,
  ]);

  useEffect(() => {
    if (deleteCommitTimerRef.current) {
      clearTimeout(deleteCommitTimerRef.current);
      deleteCommitTimerRef.current = null;
    }
    if (deleteDotsTimerRef.current) {
      clearInterval(deleteDotsTimerRef.current);
      deleteDotsTimerRef.current = null;
    }

    setDeleteMode(false);
    setSelectedTasks({});
    setShowComposer(false);
    setEditMode(false);
    setDeletePhase('idle');
    setDeleteDotCount(1);
  }, [mode, manualCategory, aiCategory]);

  useEffect(() => {
    return () => {
      if (deleteCommitTimerRef.current) {
        clearTimeout(deleteCommitTimerRef.current);
      }
      if (deleteDotsTimerRef.current) {
        clearInterval(deleteDotsTimerRef.current);
      }
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (mode === 'ai') {
      return items.filter((item) => item.isAiRule && item.category === aiCategory);
    }
    return items.filter((item) => item.category === manualCategory && !item.isAiRule);
  }, [items, mode, manualCategory, aiCategory]);

  const handleSaveName = async () => {
    const ruleId = renameRuleId;
    const nextName = taskName.trim();

    if (!ruleId) {
      setShowComposer(false);
      return;
    }

    if (!nextName) {
      Alert.alert('Name required', 'Please enter a name for this rule.');
      return;
    }

    const targetRule = items.find((item) => item.id === ruleId)?.rule;
    if (!targetRule) {
      Alert.alert('Rule not found', 'Cannot rename this rule right now. Please refresh and try again.');
      return;
    }

    if (isAiRule(targetRule)) {
      Alert.alert('Cannot Rename', 'AI rules cannot be edited.');
      return;
    }

    try {
      setIsSavingName(true);
      await automationAPI.updateRule(ruleId, toRulePayload(targetRule, nextName));
      await loadRules();
      setShowComposer(false);
      setRenameRuleId(null);
      setTaskName('');
    } catch (error) {
      Alert.alert('Rename failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleKeepDefaultName = () => {
    setShowComposer(false);
    setRenameRuleId(null);
    setTaskName('');
  };

  const toggleSelectedTask = (taskId: string) => {
    setSelectedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const enterDeleteMode = (taskId: string) => {
    const item = items.find((i) => i.id === taskId);
    if (item && item.isAiRule) {
      Alert.alert('Cannot Delete', 'AI rules cannot be deleted.');
      return;
    }
    setDeleteMode(true);
    setSelectedTasks((prev) => ({ ...prev, [taskId]: true }));
  };

  const deleteSelectedTasks = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      setDeleteMode(false);
      setDeletePhase('idle');
      return;
    }

    try {
      setDeletePhase('running');
      await Promise.all(selectedIds.map((id) => automationAPI.deleteRule(id)));
      setSelectedTasks({});
      setDeleteMode(false);
      await loadRules();
    } catch (error) {
      Alert.alert('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDeletePhase('idle');
      setDeleteDotCount(1);
      if (deleteDotsTimerRef.current) {
        clearInterval(deleteDotsTimerRef.current);
        deleteDotsTimerRef.current = null;
      }
      if (deleteCommitTimerRef.current) {
        clearTimeout(deleteCommitTimerRef.current);
        deleteCommitTimerRef.current = null;
      }
    }
  };

  const handleDeleteFabPress = () => {
    if (deletePhase === 'running') {
      return;
    }

    if (deletePhase === 'pending') {
      if (deleteCommitTimerRef.current) {
        clearTimeout(deleteCommitTimerRef.current);
        deleteCommitTimerRef.current = null;
      }
      if (deleteDotsTimerRef.current) {
        clearInterval(deleteDotsTimerRef.current);
        deleteDotsTimerRef.current = null;
      }
      setDeletePhase('idle');
      setDeleteDotCount(1);
      return;
    }

    const selectedIds = Object.keys(selectedTasks).filter((id) => selectedTasks[id]);
    if (selectedIds.length === 0) {
      setDeleteMode(false);
      return;
    }

    setDeletePhase('pending');
    setDeleteDotCount(1);
    deleteDotsTimerRef.current = setInterval(() => {
      setDeleteDotCount((prev) => (prev % 3) + 1);
    }, 280);

    deleteCommitTimerRef.current = setTimeout(() => {
      void deleteSelectedTasks(selectedIds);
    }, 900);
  };

  const selectedCount = useMemo(
    () => Object.keys(selectedTasks).filter((id) => selectedTasks[id]).length,
    [selectedTasks]
  );

  const openTaskDevices = (item: AutomationItem) => {
    if (item.isAiRule) {
      Alert.alert('Cannot Edit', 'AI rules cannot be edited.');
      return;
    }

    const conditionTemp = item.rule.conditions.find((condition) => condition.sensor_type === 'temperature');
    const conditionHumidity = item.rule.conditions.find((condition) => condition.sensor_type === 'humidity');
    const schedule = item.rule.schedules?.[0];

    router.push({
      pathname: '/automation-create',
      params: {
        taskId: item.id,
        taskName: item.name,
        action: item.config?.action,
        selected: (item.rule.devices || []).join(','),
        selectedType: item.category,
        category: item.category,
        tempComparator: conditionTemp?.operator || '<',
        humidityComparator: conditionHumidity?.operator || '<',
        temperature: String(conditionTemp?.value ?? 27),
        humidity: String(conditionHumidity?.value ?? 5),
        start_time: schedule?.start_time ?? '',
        end_time: schedule?.end_time ?? '',
        start_date: schedule?.start_date ?? '',
        end_date: schedule?.end_date ?? '',
      },
    });
  };

  const runToggleRuleActive = async (
    item: AutomationItem,
    next: boolean,
    oppositeActiveRules: AutomationItem[]
  ) => {
    const updatingIds = [item.id, ...oppositeActiveRules.map((entry) => entry.id)];
    const previousActiveById = new Map(items.map((entry) => [entry.id, !!entry.rule.is_active]));
    const previousSwitchById: Record<string, boolean> = {};
    updatingIds.forEach((id) => {
      previousSwitchById[id] = !!switches[id];
    });

    // Update UI immediately so switch feels responsive.
    setSwitches((prev) => {
      const nextState = { ...prev, [item.id]: next };
      oppositeActiveRules.forEach((entry) => {
        nextState[entry.id] = false;
      });
      return nextState;
    });
    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id === item.id) {
          return { ...entry, rule: { ...entry.rule, is_active: next } };
        }
        if (oppositeActiveRules.some((opposite) => opposite.id === entry.id)) {
          return { ...entry, rule: { ...entry.rule, is_active: false } };
        }
        return entry;
      })
    );

    setUpdatingSwitches((prev) => {
      const nextState = { ...prev };
      updatingIds.forEach((id) => {
        nextState[id] = true;
      });
      return nextState;
    });

    try {
      const requests: Array<Promise<unknown>> = [setRuleActiveByType(item, next)];

      if (next && oppositeActiveRules.length > 0) {
        oppositeActiveRules.forEach((entry) => {
          requests.push(setRuleActiveByType(entry, false));
        });
      }

      await Promise.all(requests);
    } catch (error) {
      // Restore previous state if any API call fails.
      setSwitches((prev) => {
        const nextState = { ...prev };
        updatingIds.forEach((id) => {
          nextState[id] = previousSwitchById[id];
        });
        return nextState;
      });
      setItems((prev) =>
        prev.map((entry) => {
          const wasActive = previousActiveById.get(entry.id);
          if (typeof wasActive !== 'boolean') {
            return entry;
          }

          if (updatingIds.includes(entry.id)) {
            return { ...entry, rule: { ...entry.rule, is_active: wasActive } };
          }
          return entry;
        })
      );
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setUpdatingSwitches((prev) => {
        const nextState = { ...prev };
        updatingIds.forEach((id) => {
          nextState[id] = false;
        });
        return nextState;
      });
    }
  };

  const handleToggleRuleActive = async (item: AutomationItem) => {
    if (editMode) {
      Alert.alert('Edit mode is on', 'Cannot turn rules on or off while editing. Turn off Edit to control switches.');
      return;
    }

    if (updatingSwitches[item.id]) {
      return;
    }

    const current = !!switches[item.id];
    const next = !current;

    const oppositeActiveRules = next
      ? items.filter(
          (entry) =>
            entry.id !== item.id &&
            entry.rule.is_active &&
            (item.isAiRule ? !entry.isAiRule : entry.isAiRule)
        )
      : [];

    if (next && oppositeActiveRules.length > 0) {
      Alert.alert(
        'Mode conflict',
        'You already have active rules in the other mode. Continuing will turn those rules off.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              void runToggleRuleActive(item, next, oppositeActiveRules);
            },
          },
        ]
      );
      return;
    }

    await runToggleRuleActive(item, next, oppositeActiveRules);
  };

  const cycleMode = () => {
    setMode((prev) => (prev === 'ai' ? 'manual' : 'ai'));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Automation</Text>
          <View style={styles.headerIcons}>
            <Pressable
              style={[styles.editToggle, editMode && styles.editToggleActive]}
              onPress={() => setEditMode((prev) => !prev)}
            >
              <Text style={[styles.editToggleText, editMode && styles.editToggleTextActive]}>Edit</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.modeHero} onPress={cycleMode}>
          <View style={styles.modeHeroBottomRow}>
            <Text style={styles.modeHeroTitle}>{mode === 'ai' ? 'AI Mode' : 'Manual Mode'}</Text>
            <Text style={[styles.modeHeroArrow, styles.modeHeroArrowLeft]}>{'<'}</Text>
            <Text style={[styles.modeHeroArrow, styles.modeHeroArrowRight]}>{'>'}</Text>
          </View>
        </Pressable>

        {mode === 'manual' ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              style={[styles.modeChip, manualCategory === 'light' && styles.modeChipActive]}
              onPress={() => setManualCategory('light')}
            >
              <Text style={[styles.modeChipText, manualCategory === 'light' && styles.modeChipTextActive]}>Light rule</Text>
            </Pressable>
            <Pressable
              style={[styles.modeChip, manualCategory === 'fan' && styles.modeChipActive]}
              onPress={() => setManualCategory('fan')}
            >
              <Text style={[styles.modeChipText, manualCategory === 'fan' && styles.modeChipTextActive]}>Fan rule</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              style={[styles.modeChip, aiCategory === 'light' && styles.modeChipActive]}
              onPress={() => setAiCategory('light')}
            >
              <Text style={[styles.modeChipText, aiCategory === 'light' && styles.modeChipTextActive]}>Light rule</Text>
            </Pressable>
            <Pressable
              style={[styles.modeChip, aiCategory === 'fan' && styles.modeChipActive]}
              onPress={() => setAiCategory('fan')}
            >
              <Text style={[styles.modeChipText, aiCategory === 'fan' && styles.modeChipTextActive]}>Fan rule</Text>
            </Pressable>
          </View>
        )}

          <>
            <View style={styles.listWrap}>
                {filteredItems.map((item) => {
                const isOn = !!switches[item.id];

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.card, selectedTasks[item.id] && styles.cardSelected]}
                    onLongPress={() => enterDeleteMode(item.id)}
                    onPress={() => {
                      const suppressUntil = suppressCardPressUntilRef.current[item.id] || 0;
                      if (Date.now() < suppressUntil) {
                        return;
                      }

                      if (deleteMode) {
                        toggleSelectedTask(item.id);
                        return;
                      }

                      if (!editMode) {
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
                        onPressIn={() => {
                          suppressCardPressUntilRef.current[item.id] = Date.now() + 450;
                        }}
                        onPress={(event) => {
                          event.stopPropagation();
                          suppressCardPressUntilRef.current[item.id] = Date.now() + 450;
                          void handleToggleRuleActive(item);
                        }}
                        disabled={updatingSwitches[item.id]}>
                        <View style={[styles.switchThumb, isOn && styles.switchThumbOn]} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}

              {filteredItems.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateText}>
                    {mode === 'ai' ? 'No AI rules yet.' : `No ${manualCategory} rules yet.`}
                  </Text>
                </View>
              ) : null}
            </View>

            {deleteMode && (
              <View style={styles.deleteRow}>
                <Text style={styles.deleteCountText}>
                  {deletePhase === 'idle' ? `${selectedCount} selected` : `Deleting${'.'.repeat(deleteDotCount)}`}
                </Text>
                <Pressable style={styles.deleteFab} onPress={handleDeleteFabPress}>
                  <Image source={require('@/assets/images/Trash 2.png')} style={styles.deleteFabIcon} contentFit="contain" />
                </Pressable>
              </View>
            )}

            {showComposer ? (
              <View style={styles.composeCard}>
                <View style={styles.composeHandle} />
                <Text style={styles.composeTitle}>Rule Name</Text>
                <TextInput
                  ref={inputRef}
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="Name your rule"
                  placeholderTextColor="#7E7E83"
                  style={styles.composeInput}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => void handleSaveName()}
                />

                <View style={styles.composeActionsRow}>
                  <Pressable style={styles.composeGhostButton} onPress={handleKeepDefaultName}>
                    <Text style={styles.composeGhostText}>Keep default</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.composeSaveButton, (isSavingName || isAutoCreating) && styles.composeSaveButtonDisabled]}
                    onPress={() => void handleSaveName()}
                    disabled={isSavingName || isAutoCreating}>
                    <Text style={styles.composeSaveText}>{isSavingName ? 'Saving...' : 'Save name'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.addTaskCard}
                onPress={() => {
                  if (mode === 'ai') {
                    router.push({
                      pathname: '/automation-create',
                      params: {
                        aiMode: '1',
                        category: aiCategory,
                      },
                    });
                    return;
                  }
                  router.push({ pathname: '/automation-create', params: { category: manualCategory } });
                }}
              >
                <Text style={styles.addPlus}>+</Text>
                <Text style={styles.addTaskText}>Add New Task</Text>
              </Pressable>
            )}
          </>
      </ScrollView>
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
  editToggle: {
    minWidth: 58,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D0D2D8',
    backgroundColor: '#EEEEF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  editToggleActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  editToggleText: {
    color: '#666A73',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },
  modeHero: {
    marginTop: 20,
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  modeHeroBottomRow: {
    position: 'relative',
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  modeHeroTitle: {
    color: '#4A4A4F',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  modeHeroArrow: {
    position: 'absolute',
    color: '#4A4A4F',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 26,
  },
  modeHeroArrowLeft: {
    left: 0,
  },
  modeHeroArrowRight: {
    right: 0,
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
  emptyStateCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8D9DE',
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F8',
  },
  emptyStateText: {
    color: '#7C7F86',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  composeActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  composeGhostButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9CAD0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F8',
  },
  composeGhostText: {
    color: '#555962',
    fontSize: 14,
    fontWeight: '600',
  },
  composeSaveButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  composeSaveButtonDisabled: {
    opacity: 0.65,
  },
  composeSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
