import { router } from 'expo-router';
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
import { authAPI, isEmailRateLimitError } from '@/services/api';

const isValidEmail = (value: string) => /.+@.+\..+/.test(value.trim());

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendCode = async () => {
    if (isSending) return;

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsSending(true);
      await authAPI.requestPasswordReset(normalizedEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot connect to backend.';
      if (isEmailRateLimitError(error)) {
        Alert.alert(
          'Email limit reached',
          'Supabase has rate-limited password reset emails for this account. Please wait and try again later, or configure SMTP in Supabase to remove the default quota.'
        );
      } else {
        Alert.alert('Send reset email failed', message);
      }
      return;
    } finally {
      setIsSending(false);
    }

    Alert.alert('Email sent', 'Please check your inbox for the reset link.');

    router.push({
      pathname: '/forgot-password-verify',
      params: { email: normalizedEmail },
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
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we will send a password reset link.
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#A3A3A8"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={[styles.primaryButton, isSending && styles.primaryButtonDisabled]}
            onPress={() => void handleSendCode()}
            disabled={isSending}>
            <Text style={styles.primaryText}>{isSending ? 'Sending...' : 'Send Reset Link'}</Text>
          </Pressable>

          <Pressable style={styles.backToLogin} onPress={() => router.replace('/login')}>
            <Text style={styles.backToLoginText}>Back to Sign in</Text>
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
    paddingHorizontal: 16,
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
    marginTop: 28,
  },
  title: {
    color: '#232323',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 12,
    color: '#8A8D94',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#D3D5DA',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F6F6F7',
    color: '#1F1F22',
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: '#111111',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backToLogin: {
    marginTop: 24,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#5B5F68',
    fontSize: 14,
    fontWeight: '600',
  },
});
