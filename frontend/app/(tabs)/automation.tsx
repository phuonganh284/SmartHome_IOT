import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

type AutomationItem = {
  id: string;
  name: string;
  icon: any;
  config?: {
    action?: 'on' | 'off';
  };
};

const automationItems: AutomationItem[] = [
  { id: 'lights', name: 'Turn on all the lights', icon: require('@/assets/images/Light.png') },
  { id: 'energy', name: 'Energy saver mode', icon: require('@/assets/images/Frame.png') },
];

const initialSwitches: Record<string, boolean> = {
  lights: false,
  energy: false,
};

let runtimeItems: AutomationItem[] = [...automationItems];
let runtimeSwitches: Record<string, boolean> = { ...initialSwitches };

export default function AutomationScreen() {
  const params = useLocalSearchParams<{ compose?: string; action?: string }>();
  const inputRef = useRef<TextInput>(null);
  const [items, setItems] = useState<AutomationItem[]>(runtimeItems);
  const [switches, setSwitches] = useState<Record<string, boolean>>(runtimeSwitches);
  const [showComposer, setShowComposer] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (params.compose === '1') {
      setShowComposer(true);
      setTimeout(() => inputRef.current?.focus(), 120);
      router.setParams({ compose: undefined, action: undefined });
    }
  }, [params.compose]);

  const handleCompleteTask = () => {
    const name = taskName.trim();
    if (!name) {
      return;
    }

    const newId = `task-${Date.now()}`;
    const newItem: AutomationItem = {
      id: newId,
      name,
      icon: require('@/assets/images/Light.png'),
      config: {
        action: params.action === 'off' ? 'off' : 'on',
      },
    };

    setItems((prev) => {
      const nextItems = [newItem, ...prev];
      runtimeItems = nextItems;
      return nextItems;
    });
    setSwitches((prev) => {
      const nextSwitches = { ...prev, [newId]: true };
      runtimeSwitches = nextSwitches;
      return nextSwitches;
    });
    setTaskName('');
    setShowComposer(false);
  };

  const toggleSelectedTask = (taskId: string) => {
    setSelectedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const enterDeleteMode = (taskId: string) => {
    setDeleteMode(true);
    setSelectedTasks((prev) => ({ ...prev, [taskId]: true }));
  };

  const deleteSelectedTasks = () => {
    const selectedIds = Object.keys(selectedTasks).filter((id) => selectedTasks[id]);
    if (selectedIds.length === 0) {
      setDeleteMode(false);
      return;
    }

    setItems((prev) => {
      const nextItems = prev.filter((task) => !selectedIds.includes(String(task.id)));
      runtimeItems = nextItems;
      return nextItems;
    });
    setSwitches((prev) => {
      const nextSwitches = { ...prev };
      selectedIds.forEach((id) => {
        delete nextSwitches[id];
      });
      runtimeSwitches = nextSwitches;
      return nextSwitches;
    });
    setSelectedTasks({});
    setDeleteMode(false);
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
                        const nextSwitches = { ...prev, [item.id]: !prev[item.id] };
                        runtimeSwitches = nextSwitches;
                        return nextSwitches;
                      });
                    }}
                    >
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
              onSubmitEditing={handleCompleteTask}
            />
          </View>
        ) : (
          <Pressable style={styles.addTaskCard} onPress={() => router.push('/automation-create')}>
            <Text style={styles.addPlus}>+</Text>
            <Text style={styles.addTaskText}>Add New Task</Text>
          </Pressable>
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
  listWrap: {
    marginTop: 50,
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
});
