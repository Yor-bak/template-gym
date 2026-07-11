import { AccessLog } from '@/types';
import { members } from './members';

// Historial generado (no hardcodeado) de ~365 días para poder alimentar el
// Histórico de horas pico de Reportes en todos sus periodos (7 días a 1 año).
// Patrón horario realista: pico de mañana (6-8h) y de noche (18-20h), valle
// al mediodía, entre semana; fin de semana con pico media mañana y sin pico
// nocturno. Se generan mayormente accesos exitosos (autorizado/por
// vencer/temporal) y una porción menor de rechazados (vencido/bloqueado/QR
// inválido) para que Historial de accesos y las KPIs de "rechazados" sigan
// teniendo variedad — el filtrado a "solo accesos exitosos de entrada" para
// el cálculo de horas pico ocurre en components/reports/PeakHoursReport.tsx,
// no aquí.

const WEEKDAY_PATTERN: Record<number, number> = {
  5: 1, 6: 2, 7: 4, 8: 3, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 2, 18: 4, 19: 5, 20: 3, 21: 2, 22: 1,
};
const WEEKEND_PATTERN: Record<number, number> = {
  7: 1, 8: 2, 9: 4, 10: 5, 11: 4, 12: 2, 13: 1, 16: 1, 17: 2, 18: 2, 19: 1,
};

// PRNG determinista (mismo resultado en cada carga, no depende de Math.random).
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const activeMembers = members.filter((m) => m.status !== 'archived' && m.status !== 'pending_activation');

function buildAccessLogs(): AccessLog[] {
  const logs: AccessLog[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let counter = 1;

  for (let dayOffset = 364; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const pattern = isWeekend ? WEEKEND_PATTERN : WEEKDAY_PATTERN;

    for (const [hourStr, base] of Object.entries(pattern)) {
      const hour = Number(hourStr);
      const daySeed = dayOffset * 97 + hour * 13;
      const jitter = 0.7 + seededRandom(daySeed) * 0.6; // 0.7x - 1.3x
      const count = Math.max(0, Math.round(base * jitter));

      for (let i = 0; i < count; i++) {
        const slotSeed = daySeed + i * 3.7;
        const minute = Math.floor(seededRandom(slotSeed) * 59);
        const member = activeMembers[Math.floor(seededRandom(slotSeed + 0.31) * activeMembers.length) % activeMembers.length];
        const ts = new Date(date);
        ts.setHours(hour, minute, 0, 0);

        const roll = seededRandom(slotSeed + 0.62);
        const result: AccessLog['result'] =
          roll < 0.90 ? 'authorized' : roll < 0.94 ? 'expiring_soon' : roll < 0.97 ? 'temporary_access' : roll < 0.99 ? 'expired' : 'blocked';

        logs.push({
          id: `acc_gen_${counter++}`,
          gymId: 'gym_001',
          memberId: member.id,
          memberNumber: member.memberNumber,
          memberName: `${member.firstName} ${member.lastName}`,
          result,
          timestamp: ts.toISOString(),
          reader: 'Entrada principal',
          ...(result === 'blocked' ? { blockReason: 'Conducta inapropiada con personal' } : {}),
        });

        // Un pequeño porcentaje de QR inválidos sueltos, sin miembro asociado.
        if (seededRandom(slotSeed + 0.85) < 0.03) {
          const invalidTs = new Date(ts);
          invalidTs.setMinutes(invalidTs.getMinutes() + 1);
          logs.push({
            id: `acc_gen_${counter++}`,
            gymId: 'gym_001',
            result: 'invalid_qr',
            timestamp: invalidTs.toISOString(),
            reader: 'Entrada principal',
            rawQrCode: `QR-INVALIDO-${Math.floor(seededRandom(slotSeed + 0.91) * 9000 + 1000)}`,
          });
        }
      }
    }
  }

  return logs;
}

export const accessLogs: AccessLog[] = buildAccessLogs();
