'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { CustomerSupportSection } from '@/components/settings/CustomerSupportSection';
import { getCustomerSupportSettings } from '@/lib/data/customerSupport';
import { useAuth } from '@/lib/auth';
import { isDemoMode } from '@/lib/data/config';
import { useStore } from '@/lib/store';

// Sección principal (antes vivía dentro de una pestaña de Configuración).
// Reutiliza el mismo componente/fuente de datos — no se duplica nada, solo
// cambia dónde se monta.
export default function CustomerSupportPage() {
  const { user } = useAuth();
  const { gym } = useStore();
  const canEdit = user?.role === 'admin';

  return (
    <AppShell>
      <Header title="Atención al cliente" subtitle="Datos de contrato y soporte de Template Gym" />
      <div className="p-6">
        <CustomerSupportSection
          settings={getCustomerSupportSettings(gym?.customerNumber)}
          showContractualInfo={canEdit}
          isDemo={isDemoMode()}
        />
      </div>
    </AppShell>
  );
}
