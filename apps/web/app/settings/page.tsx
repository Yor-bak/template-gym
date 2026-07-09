'use client';
import { useEffect, useMemo, useState } from 'react';
import { Save, Building, Shield, CreditCard, Palette, ClipboardList } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { formatCurrency, getPaymentMethodLabel } from '@/lib/utils';

type SettingsTab = 'gym' | 'access' | 'payments' | 'appearance' | 'audit';

const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: 'gym', label: 'Gimnasio', icon: Building },
  { key: 'access', label: 'Acceso', icon: Shield },
  { key: 'payments', label: 'Métodos de pago', icon: CreditCard },
  { key: 'appearance', label: 'Apariencia', icon: Palette },
  { key: 'audit', label: 'Auditoría', icon: ClipboardList },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { gym, members, payments, updateGym } = useStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('gym');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const [paymentMethods, setPaymentMethods] = useState({
    cash: true, card: true, transfer: true, other: false,
  });

  const [primaryColor, setPrimaryColor] = useState('#16305A');
  useEffect(() => {
    if (gym?.primaryColor) setPrimaryColor(gym.primaryColor);
  }, [gym?.primaryColor]);

  const auditEvents = useMemo(() => {
    const events: { id: string; action: string; user: string; detail: string; time: string }[] = [];
    payments.forEach(p => {
      if (p.status === 'cancelled') {
        events.push({ id: `pay_cancel_${p.id}`, action: 'Cancelación de pago', user: p.cancelledBy ?? '—', detail: `${p.memberNumber} — ${formatCurrency(p.amount)}${p.cancelReason ? ` (${p.cancelReason})` : ''}`, time: p.cancelledAt ?? p.paymentDate });
      } else {
        events.push({ id: `pay_${p.id}`, action: 'Registro de pago', user: p.registeredBy, detail: `${p.memberNumber} — ${formatCurrency(p.amount)} ${getPaymentMethodLabel(p.method)}`, time: p.paymentDate });
      }
    });
    members.forEach(m => {
      events.push({ id: `new_${m.id}`, action: 'Alta de miembro', user: m.createdBy || '—', detail: `${m.memberNumber} — ${m.firstName} ${m.lastName}`, time: m.createdAt });
      if (m.blockedAt) events.push({ id: `blk_${m.id}`, action: 'Bloqueo de miembro', user: m.blockedBy ?? '—', detail: `${m.memberNumber} — ${m.blockReason ?? 'Sin motivo'}`, time: m.blockedAt });
      if (m.temporaryAccessUntil) events.push({ id: `tmp_${m.id}`, action: 'Acceso temporal', user: m.temporaryAccessBy ?? '—', detail: `${m.memberNumber} — ${m.temporaryAccessReason ?? ''}`, time: m.temporaryAccessUntil });
    });
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);
  }, [payments, members]);

  const canEdit = user?.role === 'admin';

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'gym') {
        await updateGym({ ...gymSettings, currency: gymSettings.currency as 'MXN' | 'USD' });
      } else if (activeTab === 'appearance') {
        await updateGym({ primaryColor });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const showsSaveButton = activeTab === 'gym' || activeTab === 'appearance';

  return (
    <AppShell>
      <Header
        title="Configuración"
        subtitle={gym?.name ?? ''}
        actions={canEdit && showsSaveButton && (
          <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-60 ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        )}
      />
      <div className="flex h-[calc(100vh-65px)]">
        <div className="w-48 shrink-0 border-r border-gray-200 bg-white p-3 space-y-0.5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeTab === t.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                <select value={gymSettings.currency} onChange={e => setGymSettings(prev => ({ ...prev, currency: e.target.value }))} disabled={!canEdit} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                  <option value="MXN">MXN — Peso mexicano</option>
                  <option value="USD">USD — Dólar americano</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Zona horaria</label>
                <select value={gymSettings.timezone} onChange={e => setGymSettings(prev => ({ ...prev, timezone: e.target.value }))} disabled={!canEdit} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
                    className={`relative w-11 h-6 rounded-full transition-colors ${(accessSettings as Record<string, number | boolean>)[f.key] ? 'bg-blue-600' : 'bg-gray-200'}`}
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                Ejemplo visual — el formulario de registrar pago todavía muestra los 4 métodos sin importar lo que se configure aquí.
              </div>
              {[
                { key: 'cash', label: 'Efectivo' },
                { key: 'card', label: 'Tarjeta (débito/crédito)' },
                { key: 'transfer', label: 'Transferencia bancaria' },
                { key: 'other', label: 'Otro' },
              ].map(m => (
                <div key={m.key} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-700">{m.label}</span>
                  <button
                    disabled={!canEdit}
                    onClick={() => canEdit && setPaymentMethods(prev => ({ ...prev, [m.key]: !(prev as Record<string, boolean>)[m.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${(paymentMethods as Record<string, boolean>)[m.key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(paymentMethods as Record<string, boolean>)[m.key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-lg space-y-4">
              <h2 className="font-semibold text-gray-900">Apariencia</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color principal</label>
                <div className="flex gap-3 items-center">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} disabled={!canEdit} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
                  <span className="text-sm text-gray-600 font-mono">{primaryColor}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Se guarda en la sucursal, pero el dashboard sigue usando la paleta de marca fija (azul marino) en el CSS — este valor queda disponible para cuando se lea dinámicamente.</p>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900">Historial de cambios</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Acción</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Usuario</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Detalle</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {auditEvents.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-gray-400 text-sm py-8">Sin actividad registrada todavía</td></tr>
                    ) : auditEvents.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{log.action}</td>
                        <td className="px-4 py-3 text-gray-600">{log.user}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{log.detail}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.time).toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
