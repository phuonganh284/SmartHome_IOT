import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authAPI } from '@/services/api';

export default function ForgotPasswordNewPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; token?: string; access_token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Missing information', 'Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Confirm password does not match.');
      return;
    }

    const resetToken = params.token ?? params.access_token;
    if (!resetToken) {
      Alert.alert('Missing reset token', 'Please open the reset link from your email again.');
      router.replace('/forgot-password');
      return;
    }

    try {
      await authAPI.resetPassword(resetToken, password);
    } catch (error) {
      Alert.alert('Update password failed', error instanceof Error ? error.message : 'Cannot connect to backend.');
      return;
    }

    router.replace({
      pathname: '/forgot-password-success',
      params: { email: params.email ?? '' },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>Create a new password. Ensure it differs from previous ones for security</Text>

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            placeholder="Enter your new password"
            placeholderTextColor="#B1B1B6"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput
            placeholder="Re-enter password"
            placeholderTextColor="#B1B1B6"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Pressable style={styles.updateButton} onPress={() => void handleUpdatePassword()}>
            <Text style={styles.updateText}>Update Password</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  headerRow: {
    height: 70,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 40,
    color: '#232323',
  },
  content: {
    marginTop: 30,
  },
  title: {
    color: '#2A2A2E',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: '#A3A3A9',
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    marginTop: 16,
    color: '#2A2A2E',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D8D8DD',
    borderRadius: 10,
    backgroundColor: '#F2F2F3',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#111111',
    fontSize: 14,
  },
  updateButton: {
    marginTop: 20,
    backgroundColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  updateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
