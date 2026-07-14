'use client';
import { useState } from 'react';
import { Copy, Check, MessageCircle, Building2, Headset, IdCard, Sparkles } from 'lucide-react';
import type { CustomerSupportSettings, PaymentAccountType } from '@/types';

const ACCOUNT_TYPE_LABELS: Record<PaymentAccountType, string> = {
  clabe: 'CLABE',
  account: 'Cuenta',
  card: 'Tarjeta',
  reference: 'Referencia',
};

interface CustomerSupportSectionProps {
  settings: CustomerSupportSettings;
  /** Admin/Super Admin ven todo; Recepcionista solo Soporte. */
  showContractualInfo: boolean;
  isDemo: boolean;
}

function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      // Clipboard no disponible (contexto no seguro, permiso denegado) — no es crítico.
    }
  };
  return { copiedKey, copy };
}

function CopyButton({ active, onClick, label = 'Copiar' }: { active: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        active ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {active ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {active ? 'Copiado' : label}
    </button>
  );
}

// Resumen contractual de solo lectura — nunca inputs editables. El gimnasio
// no puede cambiar su número de cliente ni los datos de cobro de J2EC desde
// aquí (eso es justo lo que este componente debe evitar).
export function CustomerSupportSection({ settings, showContractualInfo, isDemo }: CustomerSupportSectionProps) {
  const { copiedKey, copy } = useCopyFeedback();

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">Atención al cliente</h2>
          <p className="text-sm text-gray-500 mt-0.5">Identificación, cobro del servicio Template Gym y soporte. Información de solo lectura.</p>
        </div>
        {isDemo && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-1 rounded">
            <Sparkles className="w-3 h-3" /> Datos de ejemplo (modo demo)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showContractualInfo && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-500">
              <IdCard className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Número de cliente</span>
            </div>
            <p className="font-mono text-lg font-semibold text-gray-900">{settings.customerNumber}</p>
            <p className="text-xs text-gray-400">Identificador de este gimnasio dentro de Template Gym. Asignado por la plataforma — no editable.</p>
            <CopyButton active={copiedKey === 'customer'} onClick={() => copy('customer', settings.customerNumber)} label="Copiar" />
            {copiedKey === 'customer' && <p className="text-xs text-green-600 -mt-2">Número de cliente copiado.</p>}
          </div>
        )}

        {showContractualInfo && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pago del servicio Template Gym</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-400">Titular:</span> <span className="font-medium text-gray-900">{settings.paymentAccount.holderName}</span></p>
              {settings.paymentAccount.bankName && <p><span className="text-gray-400">Banco:</span> <span className="font-medium text-gray-900">{settings.paymentAccount.bankName}</span></p>}
              <p><span className="text-gray-400">{ACCOUNT_TYPE_LABELS[settings.paymentAccount.type]}:</span> <span className="font-mono font-medium text-gray-900">{settings.paymentAccount.value}</span></p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              Utiliza estos datos para pagar la mensualidad de tu servicio Template Gym. No corresponden a las cuentas bancarias de tu gimnasio.
            </div>
            <CopyButton
              active={copiedKey === 'payment'}
              onClick={() => copy('payment', `Titular: ${settings.paymentAccount.holderName}${settings.paymentAccount.bankName ? `\nBanco: ${settings.paymentAccount.bankName}` : ''}\n${ACCOUNT_TYPE_LABELS[settings.paymentAccount.type]}: ${settings.paymentAccount.value}`)}
              label="Copiar datos"
            />
            {copiedKey === 'payment' && <p className="text-xs text-green-600 -mt-2">Datos de pago copiados.</p>}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Headset className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Soporte Template Gym</span>
          </div>
          <p className="font-mono text-lg font-semibold text-gray-900">{settings.support.phone}</p>
          {settings.support.businessHours && <p className="text-sm text-gray-500">{settings.support.businessHours}</p>}
          <p className="text-xs text-gray-400">¿Dudas o problemas con el sistema? Contáctanos por este medio.</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton active={copiedKey === 'support'} onClick={() => copy('support', settings.support.phone)} label="Copiar número" />
            {settings.support.whatsappUrl && (
              <a
                href={settings.support.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
              </a>
            )}
          </div>
          {copiedKey === 'support' && <p className="text-xs text-green-600">Teléfono de soporte copiado.</p>}
        </div>

        {!showContractualInfo && (
          <div className="lg:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center text-sm text-gray-500">
            La información contractual y de cobro solo está disponible para el Super Admin y el Administrador del gimnasio.
          </div>
        )}
      </div>
    </div>
  );
}
