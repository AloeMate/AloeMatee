import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface GlobalErrorProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function GlobalError({ message, onRetry, onDismiss }: GlobalErrorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.errorCard}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.buttonContainer}>
          {onRetry && (
            <TouchableOpacity
              style={[styles.button, styles.retryButton]}
              onPress={onRetry}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
          
          {onDismiss && (
            <TouchableOpacity
              style={[styles.button, styles.dismissButton]}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#2E7D32',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
