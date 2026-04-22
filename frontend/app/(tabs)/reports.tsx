import React, { useEffect, useState } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text as RNText, 
  View, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions,
  SafeAreaView 
} from 'react-native';
import { Svg, Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { sensorAPI } from '../../services/api';

const RANGES = ['1h', '24h', '1w', 'all'];

function SensorChart({ points, color, unit, range }: { points: Array<{ x: number; y: number }>, color: string, unit: string, range: string }) {
  const width = Dimensions.get('window').width - 64; 
  const height = 240; // Tăng thêm một chút để biểu đồ thoáng hơn
  const paddingLeft = 45; 
  const paddingBottom = 40; 
  const paddingTop = 30;
  const paddingRight = 15;

  if (!points || points.length === 0) {
    return (
      <View style={[styles.chartWrap, { height: height, justifyContent: 'center' }]}>
        <RNText style={{ textAlign: 'center', color: '#9CA3AF' }}>No data available</RNText>
      </View>
    );
  }

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  
  // Cập nhật dải trục Y từ 0 đến 100
  const minY = 0;
  const maxY = 100;
  const yTicks = [0, 20, 40, 60, 80, 100]; // Các mốc hiển thị

  const scaleX = (v: number) => {
    if (maxX === minX) return paddingLeft + (width - paddingLeft - paddingRight) / 2;
    return paddingLeft + ((v - minX) / (maxX - minX)) * (width - paddingLeft - paddingRight);
  };

  const scaleY = (v: number) => {
    // Ép giá trị v không vượt quá 0-100 để tránh vẽ tràn ra ngoài Svg
    const clampedV = Math.max(minY, Math.min(maxY, v));
    return paddingTop + (1 - (clampedV - minY) / (maxY - minY)) * (height - paddingTop - paddingBottom);
  };

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
    .join(' ');

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        {/* Đơn vị đo */}
        <SvgText x={paddingLeft - 10} y={paddingTop - 15} fontSize="12" fill="#374151" fontWeight="bold">{unit}</SvgText>

        {/* Trục Y và Grid lines */}
        {yTicks.map((tick) => (
          <React.Fragment key={tick}>
            <SvgText
              x={paddingLeft - 15}
              y={scaleY(tick) + 5}
              fontSize="12"
              fill={tick === 0 ? "#000" : "#9CA3AF"}
              textAnchor="end"
              fontWeight={tick === 0 ? "bold" : "normal"}
            >
              {tick}
            </SvgText>
            <Line
              x1={paddingLeft}
              y1={scaleY(tick)}
              x2={width - paddingRight}
              y2={scaleY(tick)}
              stroke={tick === 0 ? "#000" : "#E5E7EB"}
              strokeWidth={tick === 0 ? 1.5 : 1}
              strokeDasharray={tick === 0 ? "0" : "4, 4"}
            />
          </React.Fragment>
        ))}

        {/* Đường biểu đồ */}
        <Path d={d} fill="none" stroke={color} strokeWidth={2.5} />

        {/* Điểm dữ liệu */}
        {points.map((p, i) => (
          <Circle key={i} cx={scaleX(p.x)} cy={scaleY(p.y)} r={3} fill={color} />
        ))}

        {/* Nhãn trục X */}
        {
          (() => {
            let leftLabel = '';
            let rightLabel = '';
            if (range === '1h') leftLabel = 'Hour';
            else if (range === '24h') leftLabel = 'Day';
            else if (range === '1w') { leftLabel = 'Week'; }

            return (
              <>
                {leftLabel ? (
                  <SvgText x={paddingLeft} y={height - 15} fontSize="11" fill="#4B5563">{leftLabel}</SvgText>
                ) : null}
                {rightLabel ? (
                  <SvgText x={width - 40} y={height - 15} fontSize="11" fill="#4B5563">{rightLabel}</SvgText>
                ) : null}
              </>
            );
          })()
        }
      </Svg>
    </View>
  );
}

export default function ReportsScreen() {
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [pointsBySensor, setPointsBySensor] = useState<Record<number, any>>({});

  const sensors = [
    { id: 1, label: 'Temperature', color: '#f6893b', unit: '°C' },
    { id: 2, label: 'Humidity', color: '#1fa233', unit: '%' },
    { id: 3, label: 'Light', color: '#f5f567', unit: 'Lux' },
  ];

  const fetchAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        sensors.map(async (s) => {
          const data = await sensorAPI.getSensorReadings(s.id, range);
          const pts = (data || [])
            .map((r: any) => ({ 
              x: new Date(r.created_at).getTime(), 
              y: Number(r.value) 
            }))
            .sort((a: any, b: any) => a.x - b.x);
          return { id: s.id, pts };
        })
      );
      const map: Record<number, any> = {};
      results.forEach((r) => (map[r.id] = r.pts));
      setPointsBySensor(map);
    } catch (err) {
      console.warn('Failed to load sensor readings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [range]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <RNText style={styles.headerTitle}>Reports</RNText>

        {sensors.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <RNText style={styles.sensorTitle}>{s.label}</RNText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RANGES.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setRange(opt)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: range === opt ? '#2563EB' : '#111827',
                    }}
                  >
                    <RNText style={{ color: '#FFF', fontSize: 12 }}>{opt === 'all' ? 'All' : opt}</RNText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color="#2563EB" style={{ marginVertical: 40 }} />
            ) : (
              <SensorChart 
                points={pointsBySensor[s.id] || []} 
                color={s.color}
                unit={s.unit}
                range={range}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 16, paddingTop: 45 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1F2937', marginTop: 10, marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15 
  },
  sensorTitle: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  dropdownBtn: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center'
  },
  dropdownText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  chartWrap: { marginTop: 5 },
}); 
