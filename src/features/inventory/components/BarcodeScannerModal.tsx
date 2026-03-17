/**
 * BarcodeScannerModal – scans barcode and returns result.
 * Used in Add Item flow to lookup or create items by barcode.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.scanFrame} />
          <Text style={styles.hint}>Align barcode within frame</Text>
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
  scanFrame: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '35%',
    height: 120,
    borderWidth: 2,
    borderColor: tactical.amber,
    borderRadius: 8,
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
