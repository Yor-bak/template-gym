'use client';
import { useState, useMemo } from 'react';
import { Boxes, Plus, Package, Wrench, AlertTriangle, DollarSign, Pencil, Trash2, HeartPulse, Dumbbell, ShoppingCart, ScanBarcode } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MetricCard } from '@/components/shared/MetricCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { BarcodeScannerModal } from '@/components/inventory/BarcodeScannerModal';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { InventoryArea, InventoryStatus, InventoryItem } from '@/types';

const AREA_TABS: { key: InventoryArea; label: string; icon: typeof Boxes }[] = [
  { key: 'cardio', label: 'Cardio', icon: HeartPulse },
  { key: 'fuerza', label: 'Fuerza', icon: Dumbbell },
  { key: 'peso_libre', label: 'Peso libre', icon: Boxes },
  { key: 'tienda', label: 'Tiendita', icon: ShoppingCart },
];

const STATUS_OPTIONS = [
  { value: 'operating', label: 'Operando' },
  { value: 'maintenance', label: 'En mantenimiento' },
  { value: 'out_of_service', label: 'Fuera de servicio' },
];

const isEquipment = (a: InventoryArea) => a === 'cardio' || a === 'fuerza';

interface FormState {
  area: InventoryArea;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  sku: string;
  unitMeasure: string;
  quantity: string;
  minStock: string;
  location: string;
  status: InventoryStatus;
  purchaseDate: string;
  purchasePrice: string;
  repairPrice: string;
  salePrice: string;
  supplier: string;
  lastMaintenance: string;
  nextMaintenance: string;
  notes: string;
}

const emptyForm = (area: InventoryArea): FormState => ({
  area, name: '', brand: '', model: '', serialNumber: '', sku: '', unitMeasure: '',
  quantity: '', minStock: '', location: '', status: 'operating', purchaseDate: '',
  purchasePrice: '', repairPrice: '', salePrice: '', supplier: '',
  lastMaintenance: '', nextMaintenance: '', notes: '',
});

const s = (n?: number) => (n === undefined || n === null ? '' : String(n));
const fromItem = (i: InventoryItem): FormState => ({
  area: i.area, name: i.name, brand: i.brand ?? '', model: i.model ?? '', serialNumber: i.serialNumber ?? '',
  sku: i.sku ?? '', unitMeasure: i.unitMeasure ?? '', quantity: s(i.quantity), minStock: s(i.minStock),
  location: i.location ?? '', status: i.status, purchaseDate: i.purchaseDate ?? '',
  purchasePrice: s(i.purchasePrice), repairPrice: s(i.repairPrice), salePrice: s(i.salePrice),
  supplier: i.supplier ?? '', lastMaintenance: i.lastMaintenance ?? '', nextMaintenance: i.nextMaintenance ?? '',
  notes: i.notes ?? '',
});

export default function InventoryPage() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [area, setArea] = useState<InventoryArea>('cardio');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('cardio'));
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const areaItems = useMemo(
    () => inventory.filter(i => i.area === area),
    [inventory, area],
  );

  const filtered = useMemo(() => {
    let list = areaItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.brand ?? '').toLowerCase().includes(q) ||
        (i.model ?? '').toLowerCase().includes(q) ||
        (i.sku ?? '').toLowerCase().includes(q) ||
        (i.serialNumber ?? '').toLowerCase().includes(q));
    }
    if (statusFilter) list = list.filter(i => i.status === statusFilter);
    return list;
  }, [areaItems, search, statusFilter]);

  const totalValue = areaItems.reduce((sum, i) => sum + (i.purchasePrice ?? 0) * i.quantity, 0);
  const operatingCount = areaItems.filter(i => i.status === 'operating').length;
  const maintenanceCount = areaItems.filter(i => i.status === 'maintenance').length;
  const outCount = areaItems.filter(i => i.status === 'out_of_service').length;
  const lowStockCount = areaItems.filter(i => i.minStock !== undefined && i.quantity <= i.minStock).length;

  const openAdd = () => { setEditing(null); setForm(emptyForm(area)); setModalOpen(true); };
  const openEdit = (item: InventoryItem) => { setEditing(item); setForm(fromItem(item)); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleBarcodeDetected = (code: string) => {
    setScannerOpen(false);
    const existing = inventory.find(i => i.area === 'tienda' && i.sku === code);
    if (existing) {
      openEdit(existing);
    } else {
      setEditing(null);
      setForm({ ...emptyForm('tienda'), sku: code });
      setModalOpen(true);
    }
  };

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
    const item: InventoryItem = {
      id: editing?.id ?? `inv_${Date.now()}`,
      gymId: 'gym_001',
      area: form.area,
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      sku: form.sku.trim() || undefined,
      quantity: num(form.quantity) ?? 0,
      minStock: num(form.minStock),
      unitMeasure: form.unitMeasure.trim() || undefined,
      location: form.location.trim() || undefined,
      status: form.status,
      purchaseDate: form.purchaseDate || undefined,
      // Los campos de precio solo los edita el admin; para recepcionista se conservan.
      purchasePrice: isAdmin ? num(form.purchasePrice) : editing?.purchasePrice,
      repairPrice: isAdmin ? num(form.repairPrice) : editing?.repairPrice,
      salePrice: isAdmin ? num(form.salePrice) : editing?.salePrice,
      supplier: form.supplier.trim() || undefined,
      lastMaintenance: form.lastMaintenance || undefined,
      nextMaintenance: form.nextMaintenance || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) updateInventoryItem(editing.id, item);
    else addInventoryItem(item);
    closeModal();
  };

  const equipment = isEquipment(area);

  return (
    <AppShell>
      <Header
        title="Inventario"
        subtitle="Control de activos, equipo y stock"
        actions={
          <div className="flex gap-2">
            {area === 'tienda' && (
              <button onClick={() => setScannerOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">
                <ScanBarcode className="w-4 h-4" /> Escanear
              </button>
            )}
            <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        }
      />
      <div className="p-6 space-y-5">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isAdmin ? (
            <MetricCard title="Valor de inventario" value={formatCurrency(totalValue)} icon={DollarSign} iconColor="text-green-600" subtitle="Precio de compra × cantidad" />
          ) : (
            <MetricCard title="Total de ítems" value={areaItems.reduce((n, i) => n + i.quantity, 0)} icon={Package} iconColor="text-blue-600" subtitle={`${areaItems.length} registros`} />
          )}
          <MetricCard title="Operando" value={operatingCount} icon={Package} iconColor="text-green-600" />
          <MetricCard title="En mantenimiento" value={maintenanceCount} icon={Wrench} iconColor="text-yellow-600" />
          {area === 'tienda' ? (
            <MetricCard title="Bajo stock" value={lowStockCount} icon={AlertTriangle} iconColor="text-orange-600" />
          ) : (
            <MetricCard title="Fuera de servicio" value={outCount} icon={AlertTriangle} iconColor="text-red-600" />
          )}
        </div>

        {/* Area tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {AREA_TABS.map(t => (
            <button key={t.key} onClick={() => setArea(t.key)} className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-colors ${area === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <FilterBar
          search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por nombre, marca, modelo o SKU..."
          filters={[{ key: 'status', label: 'Estado', value: statusFilter, options: STATUS_OPTIONS, onChange: setStatusFilter }]}
          onClear={() => { setSearch(''); setStatusFilter(''); }}
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Boxes} title="Sin artículos" description="No hay artículos en esta área con los filtros actuales." action={{ label: 'Agregar artículo', onClick: openAdd }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {equipment && <>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Descripción / Modelo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Marca</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Núm. serie</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Últ. compra</th>
                      {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Precio compra</th>}
                      {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Precio reparación</th>}
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Mantenimiento</th>
                    </>}
                    {area === 'peso_libre' && <>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID Artículo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Elemento</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Peso / Medida</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ubicación</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Últ. compra</th>
                      {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Precio compra</th>}
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notas</th>
                    </>}
                    {area === 'tienda' && <>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SKU</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Producto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stock actual</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stock mín.</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Últ. compra</th>
                      {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Precio costo</th>}
                      {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Precio venta</th>}
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Proveedor</th>
                    </>}
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(i => {
                    const low = i.minStock !== undefined && i.quantity <= i.minStock;
                    return (
                      <tr key={i.id} className="hover:bg-gray-50">
                        {equipment && <>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{i.name}</p>
                            {i.model && <p className="text-xs text-gray-400">{i.model}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{i.brand ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{i.serialNumber ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-900">{i.quantity}</td>
                          <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                          <td className="px-4 py-3 text-gray-600">{i.purchaseDate ? formatDate(i.purchaseDate) : '—'}</td>
                          {isAdmin && <td className="px-4 py-3 font-semibold text-gray-900">{i.purchasePrice !== undefined ? formatCurrency(i.purchasePrice) : '—'}</td>}
                          {isAdmin && <td className="px-4 py-3 text-gray-600">{i.repairPrice ? formatCurrency(i.repairPrice) : '—'}</td>}
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {i.lastMaintenance ? formatDate(i.lastMaintenance) : '—'}
                            {i.nextMaintenance && <span className="block text-gray-400">→ {formatDate(i.nextMaintenance)}</span>}
                          </td>
                        </>}
                        {area === 'peso_libre' && <>
                          <td className="px-4 py-3 text-gray-500 text-xs font-medium">{i.sku ?? '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                          <td className="px-4 py-3 text-gray-600">{i.unitMeasure ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-900">{i.quantity}</td>
                          <td className="px-4 py-3 text-gray-600">{i.location ?? '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                          <td className="px-4 py-3 text-gray-600">{i.purchaseDate ? formatDate(i.purchaseDate) : '—'}</td>
                          {isAdmin && <td className="px-4 py-3 font-semibold text-gray-900">{i.purchasePrice !== undefined ? formatCurrency(i.purchasePrice) : '—'}</td>}
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-40">{i.notes ?? '—'}</td>
                        </>}
                        {area === 'tienda' && <>
                          <td className="px-4 py-3 text-gray-500 text-xs font-medium">{i.sku ?? '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900">{i.quantity}</span>
                            {low && <StatusBadge status="low_stock" className="ml-2" />}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{i.minStock ?? '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                          <td className="px-4 py-3 text-gray-600">{i.purchaseDate ? formatDate(i.purchaseDate) : '—'}</td>
                          {isAdmin && <td className="px-4 py-3 text-gray-600">{i.purchasePrice !== undefined ? formatCurrency(i.purchasePrice) : '—'}</td>}
                          {isAdmin && <td className="px-4 py-3 font-semibold text-gray-900">{i.salePrice !== undefined ? formatCurrency(i.salePrice) : '—'}</td>}
                          <td className="px-4 py-3 text-gray-600">{i.supplier ?? '—'}</td>
                        </>}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openEdit(i)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteTarget(i)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar artículo' : 'Agregar artículo'}</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Área">
                <select value={form.area} onChange={e => set('area', e.target.value)} className="input">
                  {AREA_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              <Field label={form.area === 'tienda' ? 'Producto' : 'Nombre / Descripción'} required className="sm:col-span-2">
                <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="Ej. Caminadora eléctrica" />
              </Field>

              {isEquipment(form.area) && <>
                <Field label="Marca"><input value={form.brand} onChange={e => set('brand', e.target.value)} className="input" /></Field>
                <Field label="Modelo"><input value={form.model} onChange={e => set('model', e.target.value)} className="input" /></Field>
                <Field label="Núm. de serie"><input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} className="input" /></Field>
              </>}

              {(form.area === 'peso_libre' || form.area === 'tienda') && (
                <Field label={form.area === 'tienda' ? 'SKU / Código' : 'ID Artículo'}><input value={form.sku} onChange={e => set('sku', e.target.value)} className="input" /></Field>
              )}
              {form.area === 'peso_libre' && <>
                <Field label="Peso / Medida"><input value={form.unitMeasure} onChange={e => set('unitMeasure', e.target.value)} className="input" placeholder="Ej. 20 kg" /></Field>
                <Field label="Ubicación"><input value={form.location} onChange={e => set('location', e.target.value)} className="input" /></Field>
              </>}

              <Field label={form.area === 'tienda' ? 'Stock actual' : 'Cantidad'} required><input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="input" /></Field>
              {form.area === 'tienda' && <Field label="Stock mínimo"><input type="number" min="0" value={form.minStock} onChange={e => set('minStock', e.target.value)} className="input" /></Field>}

              <Field label={form.area === 'tienda' ? 'Fecha última compra' : 'Fecha de compra'}><input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className="input" /></Field>
              {form.area === 'tienda' && <Field label="Proveedor"><input value={form.supplier} onChange={e => set('supplier', e.target.value)} className="input" /></Field>}

              {isEquipment(form.area) && <>
                <Field label="Último mantenimiento"><input type="date" value={form.lastMaintenance} onChange={e => set('lastMaintenance', e.target.value)} className="input" /></Field>
                <Field label="Próximo mantenimiento"><input type="date" value={form.nextMaintenance} onChange={e => set('nextMaintenance', e.target.value)} className="input" /></Field>
              </>}

              {/* Precios — solo admin */}
              {isAdmin && <>
                <Field label={form.area === 'tienda' ? 'Precio costo' : 'Precio de compra'}><input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} className="input" /></Field>
                {isEquipment(form.area) && <Field label="Precio de reparación"><input type="number" min="0" step="0.01" value={form.repairPrice} onChange={e => set('repairPrice', e.target.value)} className="input" /></Field>}
                {form.area === 'tienda' && <Field label="Precio de venta"><input type="number" min="0" step="0.01" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} className="input" /></Field>}
              </>}

              <Field label="Notas" className="sm:col-span-2">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="input resize-none" />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{editing ? 'Guardar cambios' : 'Agregar'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Eliminar artículo"
        description={`¿Seguro que deseas eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { if (deleteTarget) deleteInventoryItem(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {scannerOpen && (
        <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setScannerOpen(false)} />
      )}
    </AppShell>
  );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}
