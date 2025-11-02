import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithOTP } from '../api/client';

export default function OTPScreen({ navigation }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // responsive input sizing
  const { width: windowWidth } = Dimensions.get('window');
  const INPUT_COUNT = digits.length;
  const sidePadding = 24 * 2; // container padding left + right
  const gap = 8 * (INPUT_COUNT - 1); // gaps between inputs
  const calculated = Math.floor((windowWidth - sidePadding - gap) / INPUT_COUNT);
  const BOX_WIDTH = Math.min(52, Math.max(36, calculated)); // clamp between 36 and 52
  const BOX_HEIGHT = Math.round(BOX_WIDTH * 1.12);

  const setDigit = (i, v) => {
    const val = v.replace(/[^0-9]/g, '');
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < INPUT_COUNT - 1) inputs.current[i + 1]?.focus();
  };

  const onKeyPress = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const onVerify = async () => {
    const otp = digits.join('');
    const phone = await AsyncStorage.getItem('phone');
    const dialCode = (await AsyncStorage.getItem('dial_code')) || '+91';
    if (!phone) return;
    try {
      const res = await loginWithOTP(phone, otp, dialCode);
      const get = typeof res?.headers?.get === 'function' ? (k) => res.headers.get(k) : () => '';
      const headerToken = get('authorization') || get('token') || get('bearer') || get('x-auth-token') || '';
      const tokenRaw = res?.data?.token || res?.data?.data?.token || headerToken;
      const token = tokenRaw ? String(tokenRaw).replace(/^Bearer\s+/i, '') : '';
      if (token) await AsyncStorage.setItem('token', token);
      navigation.reset({ index: 0, routes: [{ name: 'Restaurants' }] });
    } catch (e) {
      alert('Invalid OTP. Try 123456.');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome back! Glad to see you, Again!</Text>
        <Text style={styles.subtitle}>Enter the verification code we just sent on your Mobile Number.</Text>

        <View style={[styles.otpRow, { marginTop: 24 }]}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={ref => (inputs.current[i] = ref)}
              style={[
                styles.otpBox,
                {
                  width: BOX_WIDTH,
                  height: BOX_HEIGHT,
                  marginHorizontal: 4,
                },
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={v => setDigit(i, v)}
              onKeyPress={e => onKeyPress(i, e)}
            />
          ))}
        </View>

        <TouchableOpacity onPress={onVerify} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Verify</Text>
        </TouchableOpacity>
        <Text style={styles.resend}>Didn’t receive code? Resend</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  // center everything and use responsive spacing
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, color: '#1E232C', fontFamily: 'Urbanist_700Bold', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#838BA1', fontFamily: 'Urbanist_500Medium', textAlign: 'center', maxWidth: 360 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  otpBox: {
    backgroundColor: '#F7F8F9',
    borderColor: '#E8ECF4',
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    color: '#1E232C',
  },
  primaryBtn: { marginTop: 28, width: '100%', maxWidth: 340, height: 56, backgroundColor: '#FF6D6A', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Urbanist_600SemiBold' },
  resend: { marginTop: 12, textAlign: 'center', fontSize: 15, letterSpacing: 0.01, color: '#1E232C', fontFamily: 'Urbanist_500Medium' },
});
