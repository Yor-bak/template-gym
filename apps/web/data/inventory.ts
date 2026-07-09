import { InventoryItem } from '@/types';

export const inventory: InventoryItem[] = [
  // ── Cardio ──────────────────────────────────────────────
  { id: 'inv_001', gymId: 'gym_001', area: 'cardio', name: 'Caminadora eléctrica', brand: 'Life Fitness', model: 'T5 Track', serialNumber: 'LF-T5-8842', quantity: 6, status: 'operating', purchaseDate: '2024-02-10', purchasePrice: 58000, repairPrice: 0, lastMaintenance: '2026-05-20', nextMaintenance: '2026-08-20', notes: 'Uso intensivo en horario pico' },
  { id: 'inv_002', gymId: 'gym_001', area: 'cardio', name: 'Elíptica profesional', brand: 'Precor', model: 'EFX 245', serialNumber: 'PR-EFX-1290', quantity: 4, status: 'maintenance', purchaseDate: '2023-11-05', purchasePrice: 42000, repairPrice: 2500, lastMaintenance: '2026-06-15', nextMaintenance: '2026-07-15', notes: 'Pedal derecho con juego, en revisión' },
  { id: 'inv_003', gymId: 'gym_001', area: 'cardio', name: 'Bicicleta de spinning', brand: 'Schwinn', model: 'IC4', serialNumber: 'SW-IC4-3301', quantity: 12, status: 'operating', purchaseDate: '2024-08-22', purchasePrice: 18500, repairPrice: 0, lastMaintenance: '2026-06-01', nextMaintenance: '2026-09-01' },
  { id: 'inv_004', gymId: 'gym_001', area: 'cardio', name: 'Remadora', brand: 'Concept2', model: 'Model D', serialNumber: 'C2-MD-7715', quantity: 3, status: 'out_of_service', purchaseDate: '2022-09-14', purchasePrice: 24000, repairPrice: 3800, lastMaintenance: '2026-04-10', nextMaintenance: '2026-07-10', notes: 'Cadena rota, esperando refacción' },

  // ── Fuerza (peso integrado) ─────────────────────────────
  { id: 'inv_005', gymId: 'gym_001', area: 'fuerza', name: 'Prensa de piernas 45°', brand: 'Hammer Strength', model: 'HS-LP', serialNumber: 'HS-LP-5540', quantity: 2, status: 'operating', purchaseDate: '2023-05-18', purchasePrice: 46000, repairPrice: 0, lastMaintenance: '2026-05-30', nextMaintenance: '2026-08-30' },
  { id: 'inv_006', gymId: 'gym_001', area: 'fuerza', name: 'Multifuncional de poleas', brand: 'Technogym', model: 'Selection 900', serialNumber: 'TG-S900-2218', quantity: 1, status: 'operating', purchaseDate: '2024-01-30', purchasePrice: 89000, repairPrice: 0, lastMaintenance: '2026-06-10', nextMaintenance: '2026-09-10' },
  { id: 'inv_007', gymId: 'gym_001', area: 'fuerza', name: 'Máquina Smith', brand: 'Matrix', model: 'Magnum MG-A', serialNumber: 'MX-MGA-6603', quantity: 2, status: 'maintenance', purchaseDate: '2023-07-12', purchasePrice: 52000, repairPrice: 1800, lastMaintenance: '2026-06-25', nextMaintenance: '2026-07-25', notes: 'Cambio de baleros en guías' },
  { id: 'inv_008', gymId: 'gym_001', area: 'fuerza', name: 'Extensión de cuádriceps', brand: 'Cybex', model: 'VR3', serialNumber: 'CX-VR3-4471', quantity: 1, status: 'operating', purchaseDate: '2022-12-01', purchasePrice: 38000, repairPrice: 0, lastMaintenance: '2026-05-15', nextMaintenance: '2026-08-15' },

  // ── Peso libre y accesorios ─────────────────────────────
  { id: 'inv_009', gymId: 'gym_001', area: 'peso_libre', name: 'Mancuernas (par)', sku: 'PL-MAN-10', unitMeasure: '10 kg', quantity: 6, location: 'Zona peso libre', status: 'operating', purchaseDate: '2024-03-05', purchasePrice: 1400, notes: 'Ninguna' },
  { id: 'inv_010', gymId: 'gym_001', area: 'peso_libre', name: 'Mancuernas (par)', sku: 'PL-MAN-20', unitMeasure: '20 kg', quantity: 4, location: 'Zona peso libre', status: 'maintenance', purchaseDate: '2023-10-18', purchasePrice: 2600, repairPrice: 400, notes: 'Requiere retape de caucho' },
  { id: 'inv_011', gymId: 'gym_001', area: 'peso_libre', name: 'Barra olímpica', sku: 'PL-BAR-OL', unitMeasure: '20 kg', quantity: 8, location: 'Rack de barras', status: 'operating', purchaseDate: '2024-06-11', purchasePrice: 3200, notes: 'Ninguna' },
  { id: 'inv_012', gymId: 'gym_001', area: 'peso_libre', name: 'Disco bumper', sku: 'PL-DIS-25', unitMeasure: '25 kg', quantity: 10, location: 'Zona peso libre', status: 'operating', purchaseDate: '2024-06-11', purchasePrice: 1900, notes: 'Ninguna' },
  { id: 'inv_013', gymId: 'gym_001', area: 'peso_libre', name: 'Kettlebell', sku: 'PL-KET-16', unitMeasure: '16 kg', quantity: 5, location: 'Zona funcional', status: 'out_of_service', purchaseDate: '2023-04-22', purchasePrice: 950, repairPrice: 0, notes: '1 pieza con asa fisurada, retirada' },

  // ── Tiendita (stock de venta) ───────────────────────────
  { id: 'inv_014', gymId: 'gym_001', area: 'tienda', name: 'Proteína Whey 1kg (Vainilla)', sku: 'SUP-PRO-01', quantity: 12, minStock: 5, status: 'operating', purchaseDate: '2026-06-20', purchasePrice: 450, salePrice: 750, supplier: 'Distribuidora Fit' },
  { id: 'inv_015', gymId: 'gym_001', area: 'tienda', name: 'Creatina 300g', sku: 'SUP-CRE-02', quantity: 3, minStock: 6, status: 'operating', purchaseDate: '2026-06-28', purchasePrice: 280, salePrice: 480, supplier: 'Distribuidora Fit', notes: 'Bajo mínimo, reordenar' },
  { id: 'inv_016', gymId: 'gym_001', area: 'tienda', name: 'Botella deportiva 750ml', sku: 'ACC-BOT-01', quantity: 24, minStock: 10, status: 'operating', purchaseDate: '2026-05-15', purchasePrice: 45, salePrice: 120, supplier: 'ImportGym MX' },
  { id: 'inv_017', gymId: 'gym_001', area: 'tienda', name: 'Guantes de entrenamiento', sku: 'ACC-GUA-02', quantity: 8, minStock: 4, status: 'operating', purchaseDate: '2026-06-01', purchasePrice: 90, salePrice: 220, supplier: 'ImportGym MX' },
  { id: 'inv_018', gymId: 'gym_001', area: 'tienda', name: 'Barra energética (caja 12)', sku: 'SUP-BAR-03', quantity: 2, minStock: 4, status: 'operating', purchaseDate: '2026-06-30', purchasePrice: 180, salePrice: 300, supplier: 'NutriMayoreo', notes: 'Bajo mínimo' },
];
