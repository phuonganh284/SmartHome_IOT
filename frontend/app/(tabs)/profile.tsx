import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { profileAPI, setAuthToken } from '@/services/api';
import {
  clearCurrentProfile,
  getCurrentProfile,
  patchCurrentProfile,
  setCurrentProfile,
  subscribeProfile,
} from '@/services/profileSession';

export default function ProfileScreen() {
  const [username, setUsername] = useState(getCurrentProfile().username);
  const [email, setEmail] = useState(getCurrentProfile().email);
  const [password, setPassword] = useState(getCurrentProfile().password);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeProfile(() => {
      const profile = getCurrentProfile();
      setUsername(profile.username);
      setEmail(profile.email);
      setPassword(profile.password);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const response = await profileAPI.getProfile();
        const nextName = response.profile?.name?.trim() || 'User';
        const nextEmail = response.profile?.email?.trim() || '';

        setCurrentProfile({
          username: nextName,
          email: nextEmail,
          password: getCurrentProfile().password,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Cannot load profile.';
        const lower = message.toLowerCase();

        if (lower.includes('no token') || lower.includes('invalid token') || lower.includes('401')) {
          Alert.alert('Session expired', 'Please sign in again to continue.', [
            {
              text: 'OK',
              onPress: () => {
                setAuthToken('');
                clearCurrentProfile();
                router.replace('/login');
              },
            },
          ]);
          return;
        }

        Alert.alert('Profile load failed', message);
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, []);

  const handleSave = () => {
    patchCurrentProfile({ username: username.trim(), email: email.trim(), password });
  };

  const handleSignOut = () => {
    setAuthToken('');
    clearCurrentProfile();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300' }}
            style={styles.avatar}
          />
          <View style={styles.cameraBadge}>
            <Image source={require('@/assets/images/user.png')} style={styles.cameraIcon} contentFit="contain" />
          </View>
        </View>

        <View style={styles.formBlock}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput value={username} onChangeText={setUsername} style={styles.fieldInput} editable={!loadingProfile} />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.fieldInput}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loadingProfile}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} style={styles.fieldInput} editable={!loadingProfile} secureTextEntry />

          <Pressable style={[styles.saveButton, loadingProfile && styles.buttonDisabled]} onPress={handleSave} disabled={loadingProfile}>
            <Text style={styles.saveText}>{loadingProfile ? 'Loading...' : 'Save Profile'}</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleSignOut}>
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: { paddingBottom: 28 },
  header: {
    backgroundColor: '#2B2D3C',
    paddingHorizontal: 14,
    paddingTop: 55,
    paddingBottom: 126,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
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
  headerRight: {
    width: 24,
    height: 24,
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
    opacity: 1,
  },
  avatarWrap: {
    marginTop: -36,
    alignSelf: 'center',
    width: 96,
    height: 96,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  formBlock: {
    marginTop: 18,
    paddingHorizontal: 14,
  },
  fieldLabel: {
    color: '#B8B8BC',
    fontSize: 12,
    marginBottom: 2,
  },
  fieldInput: {
    color: '#4A4A4F',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#CFCFD3',
    paddingBottom: 6,
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#111111',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D3D8',
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  logoutText: { color: '#232323', fontWeight: '700', fontSize: 14 },
});
