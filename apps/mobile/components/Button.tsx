import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'gradient';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: string;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  style,
  icon
}: ButtonProps) {
  const buttonStyles = [
    styles.button,
    variant !== 'gradient' && styles[variant],
    disabled && styles.disabled,
    style
  ];

  const content = (
    <View style={styles.buttonContent}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
          <Text style={styles.buttonText}>{title}</Text>
        </>
      )}
    </View>
  );

  if (variant === 'gradient' && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.button, style]}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={buttonStyles} 
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    minHeight: 56,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonIcon: {
    fontSize: 20,
  },
  primary: {
    backgroundColor: '#4CAF50',
    padding: 16,
  },
  secondary: {
    backgroundColor: '#2196F3',
    padding: 16,
  },
  success: {
    backgroundColor: '#4CAF50',
    padding: 16,
  },
  warning: {
    backgroundColor: '#FF9800',
    padding: 16,
  },
  danger: {
    backgroundColor: '#F44336',
    padding: 16,
  },
  disabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
    padding: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
