import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function ForgotPasswordSuccessScreen() {
  const params = useLocalSearchParams<{ email?: string }>();

  const handleContinue = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.iconWrap}>
            <Image source={require('@/assets/images/checkmark.png')} style={styles.iconImage} contentFit="contain" />
          </View>

          <Text style={styles.title}>Successful</Text>
          <Text style={styles.subtitle}>Congratulations! Your password has been changed. Click continue to login</Text>
        </View>

        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECECEC' },
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 28,
  },
  centerContent: {
    marginTop: 142,
    alignItems: 'center',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#26BF74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  title: {
    marginTop: 16,
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
    textAlign: 'center',
    maxWidth: 260,
  },
  continueButton: {
    marginTop: 'auto',
    backgroundColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
