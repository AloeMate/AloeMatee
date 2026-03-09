import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
};

export function FormSelect({ label, value, options, onChange }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:          { marginBottom: 12 },
  label:            { marginBottom: 6, fontWeight: '600', color: '#333' },
  row:              { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:             { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  pillSelected:     { borderColor: '#4CAF50', backgroundColor: '#4CAF50' },
  pillText:         { color: '#333' },
  pillTextSelected: { color: '#fff', fontWeight: '600' },
});
