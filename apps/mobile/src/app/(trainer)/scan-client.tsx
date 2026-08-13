import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useAssignClientFromScan } from '@/hooks/use-gym-data';

// Misma identidad visual oscura que el resto de la app.
const colors = Colors.dark;

type ScanState = { kind: 'scanning' } | { kind: 'result'; message: string; success: boolean };

export default function ScanClientScreen() {
  const { profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const { mutateAsync, isPending } = useAssignClientFromScan(profile?.id);
  const [state, setState] = useState<ScanState>({ kind: 'scanning' });
  // El callback de la cámara puede disparar varias veces mientras el QR
  // sigue en cuadro — se bloquea tras la primera lectura hasta "escanear de nuevo".
  const lockRef = useRef(false);

  async function handleScanned({ data }: { data: string }) {
    if (lockRef.current) return;
    lockRef.current = true;

    const result = await mutateAsync(data);
    if (result.status === 'assigned') {
      setState({ kind: 'result', message: `Cliente asignado: ${result.clientName}`, success: true });
    } else {
      setState({
        kind: 'result',
        message: 'Código inválido o expirado. Pide al cliente que abra su QR de nuevo.',
        success: false,
      });
    }
  }

  function scanAgain() {
    lockRef.current = false;
    setState({ kind: 'scanning' });
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionSafeArea}>
          <Text style={styles.title}>Escanear cliente</Text>
          <Text style={styles.permissionText}>
            Se necesita acceso a la cámara para leer el QR de acceso del cliente y asignártelo.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Dar permiso</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {state.kind === 'scanning' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScanned}
        />
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Escanear cliente</Text>
          <View style={styles.closeButton} />
        </View>

        {state.kind === 'scanning' ? (
          <View style={styles.centerContent}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hint}>{isPending ? 'Verificando…' : 'Apunta al QR de acceso del cliente'}</Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <View style={styles.resultCard}>
              <Text style={[styles.resultText, { color: state.success ? '#3DDC6B' : colors.danger }]}>
                {state.message}
              </Text>
              <Pressable style={styles.primaryButton} onPress={state.success ? () => router.back() : scanAgain}>
                <Text style={styles.primaryButtonText}>{state.success ? 'Listo' : 'Escanear de nuevo'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionSafeArea: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  hint: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    marginHorizontal: Spacing.four,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
