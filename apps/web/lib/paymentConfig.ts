'use client';
// Configuración de métodos de pago habilitados, persistida en localStorage y
// reactiva entre componentes (Settings ⇄ modales de cobro) vía un evento
// personalizado. Los 4 métodos son los válidos del tipo PaymentMethod; "Otro"
// admite una etiqueta personalizada para poder "agregar" un método propio.
import { useCallback, useEffect, useState } from 'react';
import type { PaymentMethod } from '@/types';

const KEY = 'payment_methods_config_v1';
const EVENT = 'payment-config-changed';

const BASE_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

const METHOD_ORDER: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];

export interface PaymentConfig {
  enabled: Record<PaymentMethod, boolean>;
  otherLabel: string;
}

const DEFAULT_CONFIG: PaymentConfig = {
  enabled: { cash: true, card: true, transfer: true, other: false },
  otherLabel: 'Otro',
};

function readConfig(): PaymentConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PaymentConfig>;
    return {
      enabled: { ...DEFAULT_CONFIG.enabled, ...parsed.enabled },
      otherLabel: parsed.otherLabel?.trim() || 'Otro',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function writeConfig(config: PaymentConfig) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // no-op
  }
}

export function labelForMethod(method: PaymentMethod, config: PaymentConfig): string {
  return method === 'other' ? config.otherLabel || 'Otro' : BASE_LABELS[method];
}

export function enabledMethodOptions(config: PaymentConfig): { value: PaymentMethod; label: string }[] {
  return METHOD_ORDER.filter(m => config.enabled[m]).map(m => ({ value: m, label: labelForMethod(m, config) }));
}

export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(readConfig());
    const sync = () => setConfig(readConfig());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setEnabled = useCallback((method: PaymentMethod, value: boolean) => {
    setConfig(prev => {
      const next = { ...prev, enabled: { ...prev.enabled, [method]: value } };
      writeConfig(next);
      return next;
    });
  }, []);

  const setOtherLabel = useCallback((label: string) => {
    setConfig(prev => {
      const next = { ...prev, otherLabel: label };
      writeConfig(next);
      return next;
    });
  }, []);

  return { config, setEnabled, setOtherLabel, options: enabledMethodOptions(config) };
}
