import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkinService } from '../services/api';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [pendingScans, setPendingScans] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
    loadPendingScans();
  }, []);

  const loadPendingScans = async () => {
    try {
      const scansStr = await AsyncStorage.getItem('pendingScans');
      if (scansStr) {
        setPendingScans(JSON.parse(scansStr));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    // Parse data (assume it's JSON from QR, e.g., { ticketId: '123' })
    let payload = data;
    try { payload = JSON.parse(data); } catch (e) { payload = { ticketId: data }; }
    
    const newScan = { ...payload, scannedAt: new Date().toISOString(), status: 'PENDING_SYNC' };
    const newPendingScans = [...pendingScans, newScan];
    
    setPendingScans(newPendingScans);
    await AsyncStorage.setItem('pendingScans', JSON.stringify(newPendingScans));
    
    alert(`Scanned: ${data}. Saved offline.`);
  };

  const handleSync = async () => {
    if (pendingScans.length === 0) {
      alert('No pending scans to sync.');
      return;
    }
    
    setIsSyncing(true);
    try {
      await checkinService.syncCheckins(pendingScans);
      await AsyncStorage.removeItem('pendingScans');
      setPendingScans([]);
      alert('Sync successful!');
    } catch (e) {
      alert('Sync failed. Are you online?');
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
      )}
      
      <View style={styles.syncBox}>
        <Text style={styles.syncText}>Pending: {pendingScans.length}</Text>
        <Button title={isSyncing ? 'Syncing...' : 'Sync Now'} onPress={handleSync} disabled={isSyncing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  syncBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  syncText: { fontWeight: 'bold' }
});
