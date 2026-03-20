import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

function FakeChart() {
  const bars = [36, 38, 40, 42, 40, 39, 41, 43, 42, 40];
  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartGrid}>
        {bars.map((h, idx) => (
          <View key={String(idx)} style={[styles.bar, { height: h }]} />
        ))}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Reports</Text>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Temperature</Text>
            <Text style={styles.tag}>Weekly</Text>
          </View>
          <FakeChart />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Humidity</Text>
            <Text style={styles.tag}>Weekly</Text>
          </View>
          <FakeChart />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  section: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  tag: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chartWrap: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 8, padding: 8 },
  chartGrid: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 5,
  },
  bar: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: '#60A5FA',
  },
});
