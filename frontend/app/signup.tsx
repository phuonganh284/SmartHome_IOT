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

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCreateAccount = async () => {
    if (!username || !email || !password) return;

    try {
      await authAPI.register(username.trim(), email.trim(), password);

      const loginResult = await authAPI.login(email.trim(), password);
      const token = loginResult.session?.access_token;

      if (!token) {
        Alert.alert('Account created', 'Please sign in manually to continue.');
        router.replace('/login');
        return;
      }

      setAuthToken(token);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Create account failed', error instanceof Error ? error.message : 'Cannot connect to backend.');
    }
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
          <Text style={styles.title}>Create Account</Text>

          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              placeholder="Username"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <Pressable style={styles.primaryButton} onPress={handleCreateAccount}>
              <Text style={styles.primaryText}>Create Account</Text>
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
  floatingLabel: {
    fontSize: 11,
    color: '#111111',
    marginBottom: -7,
    marginLeft: 10,
    zIndex: 2,
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    paddingHorizontal: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BFC3CA',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ECECEC',
    fontSize: 14,
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
});
