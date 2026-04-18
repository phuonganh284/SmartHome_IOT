import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

const extractFromUrl = (url?: string | null) => {
  if (!url) {
    return { token: '', email: '' };
  }

  const [base, hash = ''] = url.split('#');
  const queryPart = base.includes('?') ? base.split('?')[1] ?? '' : '';

  const query = new URLSearchParams(queryPart);
  const fragment = new URLSearchParams(hash);

  const token =
    fragment.get('access_token') ||
    fragment.get('token') ||
    query.get('access_token') ||
    query.get('token') ||
    '';

  const email = fragment.get('email') || query.get('email') || '';
  return { token, email };
};

export default function ResetPasswordDeepLinkScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    token?: string;
    email?: string;
  }>();

  useEffect(() => {
    const resolveResetLink = (url?: string | null) => {
      let token = params.access_token || params.token;
      let email = params.email || '';

      if (!token && url) {
        const extracted = extractFromUrl(url);
        token = extracted.token;
        email = email || extracted.email;
      }

      if (token) {
        router.replace({
          pathname: '/forgot-password-new-password',
          params: {
            token,
            email,
          },
        });
        return true;
      }

      return false;
    };

    const handleInitialLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!resolveResetLink(initialUrl)) {
        router.replace('/forgot-password-verify');
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!resolveResetLink(url)) {
        router.replace('/forgot-password-verify');
      }
    });

    void handleInitialLink();

    return () => {
      subscription.remove();
    };
  }, [params.access_token, params.token, params.email]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.text}>Preparing password reset...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  text: {
    color: '#4A4A4F',
    fontSize: 15,
    fontWeight: '500',
  },
});
