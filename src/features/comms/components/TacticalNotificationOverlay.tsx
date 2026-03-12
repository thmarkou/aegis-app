import React from 'react';
import { Text, StyleSheet, Pressable, Modal } from 'react-native';
import { tactical } from '../../../shared/tacticalStyles';

interface TacticalNotificationOverlayProps {
  message: string;
  source: string;
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Uses Modal so it never blocks the tab bar. Renders in a separate layer.
 */
export function TacticalNotificationOverlay({
  message,
  source,
  visible,
  onDismiss,
}: TacticalNotificationOverlayProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.source}>{source}</Text>
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: tactical.zinc[900],
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: tactical.amber,
    borderRadius: 12,
    padding: 16,
    shadowColor: tactical.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  source: {
    color: tactical.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Menlo',
  },
});
