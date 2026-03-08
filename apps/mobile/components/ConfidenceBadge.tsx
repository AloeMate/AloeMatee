import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface BadgeProps {
  status: 'High' | 'Medium' | 'Low';
  confidence?: number;
  onInfoPress?: () => void;
}

export default function ConfidenceBadge({ status, confidence, onInfoPress }: BadgeProps) {
  const getColor = () => {
    switch (status) {
      case 'High':
        return '#4CAF50';
      case 'Medium':
        return '#FF9800';
      case 'Low':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'High':
        return '✓';
      case 'Medium':
        return '!';
      case 'Low':
        return '?';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: getColor() }]}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.text}>
          {status} Confidence
          {confidence !== undefined && ` (${(confidence * 100).toFixed(0)}%)`}
        </Text>
      </View>
      {onInfoPress && (
        <TouchableOpacity 
          onPress={onInfoPress} 
          style={styles.infoButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  icon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
  },
});
