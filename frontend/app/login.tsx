import { Image } from 'expo-image';
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

import { authAPI, setAuthToken } from '@/services/api';
import { setCurrentProfile } from '@/services/profileSession';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) return;

    try {
      const result = await authAPI.login(email.trim(), password);
      const token = result.session?.access_token;

      if (!token) {
        Alert.alert('Login failed', 'Access token was not returned by backend.');
        return;
      }

      setAuthToken(token);
      const normalizedEmail = email.trim();
      const usernameFromEmail = normalizedEmail.split('@')[0] || 'User';
      setCurrentProfile({
        username: usernameFromEmail,
        email: normalizedEmail,
        password,
      });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Cannot connect to backend.');
    }
  };

  const handleCreateAccount = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logoWrap}>
          <Image source={require('@/assets/images/Logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Sign in</Text>

          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <Pressable style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>

            <Pressable style={styles.primaryButton} onPress={handleSignIn}>
              <Text style={styles.primaryText}>Sign in</Text>
            </Pressable>
          </View>

          <Pressable style={styles.googleButton}>
            <Image
              source={require('@/assets/images/google_logo.png')}
              style={styles.googleIconImage}
              contentFit="contain"
            />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Need an account? </Text>
            <Pressable onPress={handleCreateAccount}>
              <Text style={styles.createLink}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 380,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
  },
  logoWrap: {
    position: 'absolute',
    left: -44,
    top: 26,
    width: 466,
    height: 311,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 466, height: 311 },
  content: {
    marginTop: 258,
  },
  title: {
    textAlign: 'left',
    width: 286,
    height: 44,
    color: '#232323',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.6,
    fontWeight: '700',
    marginBottom: 20,
  },
  form: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#BFC3CA',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ECECEC',
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#232323',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#111111',
    borderRadius: 9,
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  googleButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DADDE3',
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F4F4F4',
  },
  googleIconImage: {
    width: 16,
    height: 16,
  },
  googleText: { color: '#111827', fontWeight: '600', fontSize: 16 },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#7C8895',
    fontSize: 14,
  },
  createLink: {
    color: '#232323',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
