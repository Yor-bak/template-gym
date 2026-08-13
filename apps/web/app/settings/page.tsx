'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Building, Shield, CreditCard, Palette, RotateCcw, Camera } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { ScannerViewport } from '@/components/camera/ScannerViewport';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { DEMO_ACCESS_CODES } from '@/lib/data/mock/scannerDemo';
import { isStaffAdmin, useAuth } from '@/lib/auth';
import { isDemoMode } from '@/lib/data/config';
import { useStore } from '@/lib/store';
import { usePaymentConfig } from '@/lib/paymentConfig';
import { applyPrimaryColor, persistPrimaryColor, loadPrimaryColor, THEME_COLOR_KEY } from '@/lib/theme';

type SettingsTab = 'gym' | 'access' | 'payments' | 'appearance' | 'camera';

const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: 'gym', label: 'Gimnasio', icon: Building },
  { key: 'access', label: 'Acceso', icon: Shield },
  { key: 'payments', label: 'Métodos de pago', icon: CreditCard },
  { key: 'camera', label: 'Cámara y lectores', icon: Camera },
  { key: 'appearance', label: 'Apariencia', icon: Palette },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { gym, updateGym, resetDemoData } = useStore();
  const camera = useCamera();
  const scanner = useScanner();

  // ALTA-02 (QA_AUDIT_REPORT_GYM.md): guard temporal client-side — /settings
  // no tiene backend real todavía (datos de useStore son mock), así que no
  // hay nada que rechazar server-side. El fix definitivo llega cuando este
  // módulo se conecte a un endpoint de apps/api con AuthzService.
  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard');
  }, [user, router]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('gym');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const demoMode = isDemoMode();

  const [autoActivate, setAutoActivate] = useState(false);
  useEffect(() => {
    try {
      setAutoActivate(window.localStorage.getItem('scanner_auto_activate') === 'true');
    } catch {
      // no-op
    }
  }, []);
  const toggleAutoActivate = (v: boolean) => {
    setAutoActivate(v);
    try {
      window.localStorage.setItem('scanner_auto_activate', String(v));
    } catch {
      // no-op
    }
  };

  const handleResetDemoData = () => {
    if (!window.confirm('¿Restablecer todos los datos demo a su estado inicial? Se perderán los cambios locales.')) return;
    resetDemoData();
    window.alert('Datos demo restablecidos.');
    window.location.reload();
  };

  const [gymSettings, setGymSettings] = useState({
    name: '', address: '', phone: '', email: '', timezone: 'America/Mexico_City', currency: 'MXN', memberPrefix: '',
  });

  // Se sincroniza una vez que llegan los datos reales de la sucursal — no en
  // cada render, para no pisar lo que el admin esté escribiendo.
  useEffect(() => {
    if (!gym) return;
    setGymSettings({
      name: gym.name, address: gym.address, phone: gym.phone, email: gym.email,
      timezone: gym.timezone, currency: gym.currency, memberPrefix: gym.memberPrefix,
    });
  }, [gym]);

  // Acceso y Métodos de pago todavía no tienen nada en la app que los lea de
  // verdad (ej. el popup de acceso tiene su tiempo de cierre fijo en código),
  // así que se quedan como ejemplo visual hasta que exista un consumidor real.
  const [accessSettings, setAccessSettings] = useState({
    expirationWarningDays: 7, toleranceDays: 3, allowTemporaryAccess: true,
    maxTemporaryHours: 24, popupAutoCloseSecs: 6, requireVisualConfirmation: false,
    blockConsecutiveAccess: false,
  });

  const { config: paymentConfig, setEnabled: setMethodEnabled, setOtherLabel } = usePaymentConfig();

  const [primaryColor, setPrimaryColor] = useState('#c6ff3d');
  useEffect(() => {
    const saved = loadPrimaryColor();
    if (saved) setPrimaryColor(saved);
    else if (gym?.primaryColor) setPrimaryColor(gym.primaryColor);
  }, [gym?.primaryColor]);

  // Vista previa en vivo: al mover el selector, el color se aplica al instante.
  const handleColorChange = (hex: string) => {
    setPrimaryColor(hex);
    applyPrimaryColor(hex);
  };

  const handleResetColor = () => {
    try { window.localStorage.removeItem(THEME_COLOR_KEY); } catch {}
    setPrimaryColor('#c6ff3d');
    applyPrimaryColor('#c6ff3d');
  };

  const canEdit = isStaffAdmin(user?.role);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'gym') {
        await updateGym({ ...gymSettings, currency: gymSettings.currency as 'MXN' | 'USD' });
      } else if (activeTab === 'appearance') {
        persistPrimaryColor(primaryColor);
        applyPrimaryColor(primaryColor);
        await updateGym({ primaryColor });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const showsSaveButton = activeTab === 'gym' || activeTab === 'appearance';

  if (!user || user.role !== 'admin') return null;

  return (
    <AppShell>
      <Header
        title="Configuración"
        subtitle={gym?.name ?? ''}
        actions={canEdit && showsSaveButton && (
          <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-60 ${saved ? 'bg-green-600 text-[#141311]' : 'btn-primary'}`}>
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        )}
      />
      <div className="flex h-[calc(100vh-65px)]">
        <div className="w-48 shrink-0 border-r border-gray-200 bg-white p-3 flex flex-col justify-between">
          <div className="space-y-0.5">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeTab === t.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <t.icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
          {demoMode && (
            <button
              onClick={handleResetDemoData}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              Restablecer datos demo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'gym' && (
            <div className="max-w-lg space-y-4">
              <h2 className="font-semibold text-gray-900">Datos del gimnasio</h2>
              {[
                { key: 'name', label: 'Nombre del gimnasio' },
                { key: 'address', label: 'Dirección' },
                { key: 'phone', label: 'Teléfono' },
                { key: 'email', label: 'Correo de contacto' },
                { key: 'memberPrefix', label: 'Prefijo de número de miembro' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    value={(gymSettings as Record<string, string>)[f.key]}
                    onChange={e => setGymSettings(prev => ({ ...prev, [f.key]: e.target.value }))}
                    disabled={!canEdit}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                <select value={gymSettings.currency} onChange={e => setGymSettings(prev => ({ ...prev, currency: e.target.value }))} disabled={!canEdit} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50">
                  <option value="MXN">MXN — Peso mexicano</option>
                  <option value="USD">USD — Dólar americano</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Zona horaria</label>
                <select value={gymSettings.timezone} onChange={e => setGymSettings(prev => ({ ...prev, timezone: e.target.value }))} disabled={!canEdit} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50">
                  <option value="America/Mexico_City">America/Mexico_City (CDMX)</option>
                  <option value="America/Monterrey">America/Monterrey</option>
                  <option value="America/Mazatlan">America/Mazatlan</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="max-w-lg space-y-5">
              <h2 className="font-semibold text-gray-900">Configuración de acceso</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                Estos valores todavía no los usa ninguna pantalla de la app — son un ejemplo de lo que se podría configurar. Conectarlos requiere además cablear cada pantalla que debería leerlos.
              </div>
              {[
                { key: 'expirationWarningDays', label: 'Días para mostrar advertencia de vencimiento' },
                { key: 'toleranceDays', label: 'Días de tolerancia después del vencimiento' },
                { key: 'maxTemporaryHours', label: 'Duración máxima de acceso temporal (horas)' },
                { key: 'popupAutoCloseSecs', label: 'Tiempo de cierre automático del popup (segundos)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type="number" value={(accessSettings as Record<string, number | boolean>)[f.key] as number}
                    onChange={e => setAccessSettings(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                    disabled={!canEdit}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50"
                  />
                </div>
              ))}
              {[
                { key: 'allowTemporaryAccess', label: 'Permitir accesos temporales' },
                { key: 'requireVisualConfirmation', label: 'Requerir confirmación visual del recepcionista' },
                { key: 'blockConsecutiveAccess', label: 'Bloquear múltiples accesos consecutivos' },
              ].map(f => (
                <div key={f.key} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700">{f.label}</span>
                  <button
                    disabled={!canEdit}
                    onClick={() => canEdit && setAccessSettings(prev => ({ ...prev, [f.key]: !(prev as Record<string, number | boolean>)[f.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${(accessSettings as Record<string, number | boolean>)[f.key] ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(accessSettings as Record<string, number | boolean>)[f.key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="max-w-lg space-y-4">
              <h2 className="font-semibold text-gray-900">Métodos de pago habilitados</h2>
              <p className="text-sm text-gray-500">
                Los métodos activados son los únicos que aparecen al registrar un ingreso de membresía o una venta de tienda.
              </p>
              {([
                { key: 'cash', label: 'Efectivo' },
                { key: 'card', label: 'Tarjeta (débito/crédito)' },
                { key: 'transfer', label: 'Transferencia bancaria' },
                { key: 'other', label: 'Otro método (personalizado)' },
              ] as { key: 'cash' | 'card' | 'transfer' | 'other'; label: string }[]).map(m => (
                <div key={m.key}>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-700">{m.label}</span>
                    <button
                      disabled={!canEdit}
                      onClick={() => canEdit && setMethodEnabled(m.key, !paymentConfig.enabled[m.key])}
                      className={`relative w-11 h-6 rounded-full transition-colors ${paymentConfig.enabled[m.key] ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${paymentConfig.enabled[m.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  {m.key === 'other' && paymentConfig.enabled.other && (
                    <div className="pt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del método personalizado</label>
                      <input
                        value={paymentConfig.otherLabel}
                        onChange={e => setOtherLabel(e.target.value)}
                        disabled={!canEdit}
                        placeholder="Ej. Vales de despensa, Criptomoneda…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="max-w-2xl space-y-5">
              <h2 className="font-semibold text-gray-900">Cámara y lectores</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ScannerViewport size="sm" onActivate={camera.requestAccess} />
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cámara predeterminada</label>
                    <select
                      value={camera.selectedDeviceId ?? ''}
                      onChange={e => camera.switchDevice(e.target.value)}
                      disabled={camera.devices.length === 0}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50"
                    >
                      {camera.devices.length === 0 && <option value="">Sin cámaras detectadas</option>}
                      {camera.devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Resolución</p>
                    <p className="text-sm text-gray-500">1280×720 (ideal) — se ajusta automáticamente a lo que soporte la cámara.</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">Activar cámara al iniciar sesión</span>
                  <button onClick={() => toggleAutoActivate(!autoActivate)} className={`relative w-11 h-6 rounded-full transition-colors ${autoActivate ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoActivate ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">Sonido de lectura</span>
                  <button onClick={() => scanner.setSoundEnabled(!scanner.soundEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${scanner.soundEnabled ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scanner.soundEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">Vibración (dispositivos compatibles)</span>
                  <button onClick={() => scanner.setVibrationEnabled(!scanner.vibrationEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${scanner.vibrationEnabled ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scanner.vibrationEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">Lector USB activado</span>
                  <button onClick={() => scanner.setUsbEnabled(!scanner.usbEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${scanner.usbEnabled ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scanner.usbEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tiempo de bloqueo entre lecturas: {(scanner.lockMs / 1000).toFixed(1)}s
                </label>
                <input
                  type="range" min={1000} max={5000} step={500}
                  value={scanner.lockMs}
                  onChange={e => scanner.setLockMs(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => scanner.scanCode(DEMO_ACCESS_CODES[0]?.code ?? 'AF-00001', 'manual', 'qr_code')}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Prueba de escaneo
                </button>
                <button
                  onClick={() => { scanner.resetSettings(); toggleAutoActivate(false); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  <RotateCcw className="w-4 h-4" /> Restablecer configuración
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-lg space-y-4">
              <h2 className="font-semibold text-gray-900">Apariencia</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color principal</label>
                <div className="flex gap-3 items-center flex-wrap">
                  <input type="color" value={primaryColor} onChange={e => handleColorChange(e.target.value)} disabled={!canEdit} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
                  <span className="text-sm text-gray-600 font-mono">{primaryColor}</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>Vista previa</span>
                  {canEdit && (
                    <button onClick={handleResetColor} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                      <RotateCcw className="w-3.5 h-3.5" /> Restablecer
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">El color se aplica al instante como vista previa y se fija en todo el panel (botones, acentos y enlaces activos) al guardar. Se conserva al recargar.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
