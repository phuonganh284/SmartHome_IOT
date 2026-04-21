import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { notificationAPI, type Notification } from '@/services/api';

export default function NotificationsModal() {
	const params = useLocalSearchParams<{ refresh?: string }>();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const loadNotifications = useCallback(async () => {
		try {
			setLoading(true);
			setLoadError('');
			const data = await notificationAPI.getNotifications(50);
			setNotifications(data);

			try {
				await notificationAPI.markAllAsRead();
			} catch (err) {
				console.warn('Failed to mark all as read:', err);
			}
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : 'Failed to load notifications');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadNotifications();
	}, [loadNotifications, params.refresh]);

	const handleDeleteNotification = async (id: number) => {
		try {
			await notificationAPI.deleteNotification(id);
			setNotifications((prev) => prev.filter((n) => n.id !== id));
		} catch (error) {
			Alert.alert('Delete failed', error instanceof Error ? error.message : 'Failed to delete notification');
		}
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString();
	};

	const renderNotification = ({ item }: { item: Notification }) => (
		<View style={styles.notificationItem}>
			<View style={styles.notificationContent}>
				<Text style={styles.notificationMessage}>{item.message}</Text>
				<Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
			</View>
			<Pressable onPress={() => void handleDeleteNotification(item.id)} style={styles.deleteButton}>
				<Image
					source={require('@/assets/images/Trash 2.png')}
					style={styles.deleteIcon}
					contentFit="contain"
				/>
			</Pressable>
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.headerRow}>
					<Pressable onPress={() => router.back()} hitSlop={8}>
						<Text style={styles.backArrow}>{'←'}</Text>
					</Pressable>
					<Text style={styles.title}>Notifications</Text>
					<View style={styles.headerRight} />
				</View>

				{loading ? (
					<Text style={styles.statusText}>Loading notifications...</Text>
				) : notifications.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Image
							source={require('@/assets/images/notifications.png')}
							style={styles.emptyIcon}
							contentFit="contain"
						/>
						<Text style={styles.emptyText}>No notifications yet</Text>
					</View>
				) : (
					<FlatList
						data={notifications}
						renderItem={renderNotification}
						keyExtractor={(item) => String(item.id)}
						contentContainerStyle={styles.listContent}
						scrollEnabled={true}
					/>
				)}

				{!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
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
	},
	headerRight: {
		width: 32,
	},
	statusText: {
		marginTop: 60,
		textAlign: 'center',
		color: '#8D8F96',
		fontSize: 15,
		fontWeight: '600',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyIcon: {
		width: 64,
		height: 64,
		marginBottom: 16,
		opacity: 0.5,
	},
	emptyText: {
		color: '#8D8F96',
		fontSize: 16,
		fontWeight: '600',
	},
	listContent: {
		paddingVertical: 12,
		gap: 12,
	},
	notificationItem: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E8E8EB',
		padding: 14,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	notificationContent: {
		flex: 1,
		paddingRight: 12,
	},
	notificationMessage: {
		color: '#333333',
		fontSize: 14,
		fontWeight: '600',
		lineHeight: 20,
	},
	notificationTime: {
		color: '#999999',
		fontSize: 12,
		fontWeight: '400',
		marginTop: 4,
	},
	deleteButton: {
		width: 32,
		height: 32,
		borderRadius: 6,
		backgroundColor: '#F5F5F5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	deleteIcon: {
		width: 16,
		height: 16,
		opacity: 0.6,
	},
	errorText: {
		marginTop: 10,
		textAlign: 'center',
		color: '#B43D3D',
		fontSize: 13,
		fontWeight: '600',
	},
});
