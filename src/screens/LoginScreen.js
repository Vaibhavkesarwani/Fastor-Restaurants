import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPhone } from '../api/client';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const dialCode = '+91';
  const onRegister = async () => {
    if (!phone) return;
    try {
      const res = await registerPhone(phone.trim(), dialCode);
      const ok = res?.status === 200 || res?.data?.status_code === 200 || res?.data?.status === 'Success' || (typeof res?.data === 'string' && res.data.toLowerCase().includes('otp'));
      if (!ok) {
        const msg = res?.data?.message || 'Could not send OTP. Please try again.';
        alert(msg);
        return;
      }
      await AsyncStorage.setItem('phone', phone.trim());
      await AsyncStorage.setItem('dial_code', dialCode);
      navigation.navigate('OTP');
    } catch (e) {
      const msg = e?.message || 'Failed to request OTP. Please try again.';
      alert(msg);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back! Glad to see you, Again!</Text>
          <Text style={styles.subtitle}>We will send you the 6 digit verification code</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Enter mobile number"
              placeholderTextColor="#8391A1"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              maxLength={10}
            />
          </View>
          <TouchableOpacity onPress={onRegister} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Send Code</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  // center content vertically and allow keyboard avoiding
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'center' },
  title: { fontSize: 26, color: '#1E232C', fontFamily: 'Urbanist_700Bold', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#8391A1', fontFamily: 'Urbanist_500Medium', textAlign: 'center' },
  inputWrapper: { marginTop: 24, height: 56, backgroundColor: '#F7F8F9', borderColor: '#DADADA', borderWidth: 1, borderRadius: 8, justifyContent: 'center' },
  input: { paddingHorizontal: 16, color: '#1E232C', fontSize: 15, fontFamily: 'Urbanist_500Medium' },
  primaryBtn: { marginTop: 20, height: 56, backgroundColor: '#FF6D6A', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Urbanist_600SemiBold' },
});
