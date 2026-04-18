import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { authAPI, isEmailRateLimitError } from '@/services/api';

const maskEmail = (email: string) => {
  const normalized = email.trim();
  const [name, domain] = normalized.split('@');

  if (!name || !domain) return 'your email';
  const keep = Math.min(5, name.length);
  return `${name.slice(0, keep)}...@${domain}`;
};

export default function ForgotPasswordVerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [isResending, setIsResending] = useState(false);

  const displayEmail = useMemo(() => maskEmail(params.email ?? ''), [params.email]);

  const handleResend = async () => {
    if (isResending) {
      return;
    }

    const email = (params.email ?? '').trim();
    if (!email) {
      Alert.alert('Missing email', 'Please go back and enter your email again.');
      return;
    }

    try {
      setIsResending(true);
      await authAPI.requestPasswordReset(email);
      Alert.alert('Email sent', `A new reset link was sent to ${email}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot connect to backend.';
      if (isEmailRateLimitError(error)) {
        Alert.alert(
          'Email limit reached',
          'Supabase has rate-limited password reset emails. Wait a bit before trying again, or set up SMTP in Supabase to use your own mail provider.'
        );
      } else {
        Alert.alert('Resend failed', message);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Check you email</Text>
          <Text style={styles.subtitle}>We sent a reset link to {displayEmail}</Text>
          <Text style={styles.subtitle}>Open that link to continue setting your new password.</Text>

          <Pressable style={styles.verifyButton} onPress={() => router.replace('/login')}>
            <Text style={styles.verifyText}>Back to Sign in</Text>
          </Pressable>

          <View style={styles.resendRow}>
            <Text style={styles.resendMuted}>Haven&apos;t got the email yet? </Text>
            <Pressable onPress={() => void handleResend()} disabled={isResending}>
              <Text style={[styles.resendLink, isResending && styles.resendLinkDisabled]}>
                {isResending ? 'Sending...' : 'Resend email'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: '#A3A3A9',
    fontSize: 14,
    lineHeight: 20,
  },
  verifyButton: {
    marginTop: 30,
    backgroundColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
  },
  verifyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendMuted: {
    color: '#A4A4A8',
    fontSize: 14,
  },
  resendLink: {
    color: '#303035',
    fontSize: 14,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
});
