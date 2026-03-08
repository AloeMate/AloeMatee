import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
}

export default function ProgressBar({ current, total, color = '#4CAF50' }: ProgressBarProps) {
  const percentage = (current / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Progress</Text>
        <Text style={styles.fraction}>{current}/{total}</Text>
      </View>
      <View style={styles.barContainer}>
        <View 
          style={[
            styles.barFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fraction: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
