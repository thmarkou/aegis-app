/**
 * BarcodeScannerModal – scans barcode and returns result.
 * Used in Add Item flow to lookup or create items by barcode.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { tactical } from '../../../shared/tacticalStyles';

export type BarcodeScanResult = {
  barcode: string;
  type?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (result: BarcodeScanResult) => void;
};

export function BarcodeScannerModal({ visible, onClose, onScan }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!visible) setScanned(false);
  }, [visible]);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Camera permission required to scan barcodes.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const handleBarCodeScanned = ({ data, type }: { data: string; type?: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onScan({ barcode: data, type });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.targetOverlay} pointerEvents="none">
            <View style={styles.targetFrame}>
              <View style={[styles.targetCorner, styles.targetTopLeft]} />
              <View style={[styles.targetCorner, styles.targetTopRight]} />
              <View style={[styles.targetCorner, styles.targetBottomLeft]} />
              <View style={[styles.targetCorner, styles.targetBottomRight]} />
            </View>
          </View>
          <Text style={styles.hint}>Align barcode within target</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrap: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  targetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 220,
    height: 120,
    position: 'relative',
  },
  targetCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: tactical.amber,
    borderWidth: 3,
  },
  targetTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  targetTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  targetBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  targetBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  hint: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: tactical.amber,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    padding: 12,
  },
  permissionBox: {
    backgroundColor: tactical.zinc[700],
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    margin: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: tactical.amber,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: tactical.black,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: tactical.zinc[400],
    fontSize: 14,
  },
});
