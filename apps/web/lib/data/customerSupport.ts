import type { CustomerSupportSettings } from '@/types';
import { normalizePhone } from '@/lib/utils';

// Datos de contacto y cobro de la propia plataforma Template Gym (J2EC) —
// son los mismos para cualquier gimnasio cliente, a diferencia del
// customerNumber (que sí es por gimnasio, ver types/gym.ts). Todavía no
// existe una tabla real de "configuración de plataforma" en Supabase para
// esto — el teléfono/horario admiten override por variable de entorno
// pública para poder actualizarlos sin redeploy; el resto queda como
// constante documentada hasta que exista ese backend.
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+52 55 0000 0000';
const SUPPORT_HOURS = process.env.NEXT_PUBLIC_SUPPORT_HOURS || 'Lunes a viernes, 9:00 a 18:00';

export function getCustomerSupportSettings(customerNumber?: string): CustomerSupportSettings {
  return {
    customerNumber: customerNumber ?? 'Pendiente de asignación',
    paymentAccount: {
      holderName: 'J2EC',
      bankName: 'BBVA',
      type: 'clabe',
      value: '012345678901234567',
    },
    support: {
      phone: SUPPORT_PHONE,
      whatsappUrl: `https://wa.me/${normalizePhone(SUPPORT_PHONE)}`,
      businessHours: SUPPORT_HOURS,
    },
  };
}
