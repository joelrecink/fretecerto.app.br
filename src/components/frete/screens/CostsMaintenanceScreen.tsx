import React, { useState } from 'react';
import { Wrench, Car, CircleDollarSign, Droplets, Users, Shield, ArrowLeft, ArrowRight, Percent, Check } from 'lucide-react';

interface CostsData {
  licensePlate?: string;
  assetValue?: number;
  annualDepreciationRate?: number;
  insuranceYearly?: number;
  registrationYearly?: number;
  driverSalaryMonthly?: number;
  driverSalaryInclude13th?: boolean;
  refTirePriceNew?: number;
  refTireLifespanNew?: number;
  refTirePriceRemold?: number;
  refTireLifespanRemold?: number;
  tireSteerQtyNew?: number;
  tireSteerQtyRemold?: number;
  tireDriveQtyNew?: number;
  tireDriveQtyRemold?: number;
  tireTrailerQtyNew?: number;
  tireTrailerQtyRemold?: number;
  lastOilChangeCost?: number;
  oilChangeIntervalKm?: number;
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;
}

interface CostsMaintenanceScreenProps {
  data: CostsData;
  onUpdate: (field: string, value: number | string | boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

const CostsMaintenanceScreen: React.FC<CostsMaintenanceScreenProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
}) => {
  const [tireMode, setTireMode] = useState<'new' | 'remold'>('new');

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    onUpdate(field, numValue);
  };

  const formatCurrency = (val: number | undefined) => {
    if (!val) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Calculate tire cost per km
  const calcTireCostPerKm = () => {
    const priceNew = data.refTirePriceNew || 0;
    const lifeNew = data.refTireLifespanNew || 1;
    const priceRemold = data.refTirePriceRemold || 0;
    const lifeRemold = data.refTireLifespanRemold || 1;
    const totalNew = (data.tireSteerQtyNew || 0) + (data.tireDriveQtyNew || 0) + (data.tireTrailerQtyNew || 0);
    const totalRemold = (data.tireSteerQtyRemold || 0) + (data.tireDriveQtyRemold || 0) + (data.tireTrailerQtyRemold || 0);
    return (totalNew * priceNew / lifeNew) + (totalRemold * priceRemold / lifeRemold);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Custos & Manutenção</h1>
              <p className="text-sm text-white/70">Considere custos fixos, pneus e manutenção</p>
            </div>
          </div>
        </div>

        {/* Veículo & Resumo */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Car size={18} />
              <span className="font-medium">Veículo & Resumo</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">Aba principal</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Placa do Veículo (Obrigatório)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.licensePlate || ''}
                onChange={(e) => onUpdate('licensePlate', e.target.value.toUpperCase())}
                placeholder="ABC-1234"
                className="flex-1 px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <button className="px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Salvar
              </button>
            </div>
          </div>

          {/* Cost Summary Cards */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-[hsl(var(--secondary))] rounded-xl p-4">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Custo de Pneu/km</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(calcTireCostPerKm())}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Novos + Remold + Recape</p>
            </div>
            <div className="bg-[hsl(var(--secondary))] rounded-xl p-4">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Pneus (Instalados)</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(0)}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Novos + Remold + Recape</p>
            </div>
          </div>
        </div>

        {/* Seção de Pneus */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--border))] flex items-center gap-2">
            <span className="text-xl">🛞</span>
            <span className="font-medium">Seção de Pneus</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setTireMode('new')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tireMode === 'new'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              🟢 PNEU NOVO
            </button>
            <button
              onClick={() => setTireMode('remold')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tireMode === 'remold'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              🟡 PNEU REMOLD
            </button>
          </div>

          <div className="p-4 space-y-4">
            {tireMode === 'new' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Preço Médio (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data.refTirePriceNew || ''}
                        onChange={(e) => handleInputChange('refTirePriceNew', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Vida Útil (KM)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={data.refTireLifespanNew || ''}
                      onChange={(e) => handleInputChange('refTireLifespanNew', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                    />
                  </div>
                </div>

                {/* Tire positions */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Eixo Direcional</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">x{data.tireSteerQtyNew || 0} pneus</p>
                    <p className="font-bold text-sm text-blue-600">R$ 0,00</p>
                    <button className="mt-2 text-xs text-blue-600 hover:underline">+ Adicionar Pneus</button>
                  </div>
                  <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Eixo Tração</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">x{data.tireDriveQtyNew || 0} pneus</p>
                    <p className="font-bold text-sm text-blue-600">R$ 0,00</p>
                    <button className="mt-2 text-xs text-blue-600 hover:underline">+ Adicionar Pneus</button>
                  </div>
                  <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Carreta / Reboque</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">x{data.tireTrailerQtyNew || 0} pneus</p>
                    <p className="font-bold text-sm text-blue-600">R$ 0,00</p>
                    <button className="mt-2 text-xs text-blue-600 hover:underline">+ Adicionar Pneus</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Preço Médio (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data.refTirePriceRemold || ''}
                        onChange={(e) => handleInputChange('refTirePriceRemold', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Vida Útil (KM)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={data.refTireLifespanRemold || ''}
                      onChange={(e) => handleInputChange('refTireLifespanRemold', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Valor e Depreciação */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <CircleDollarSign size={18} />
              <span className="font-medium">Valor e Depreciação</span>
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs font-medium rounded-full">Opcional</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Valor do Veículo (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.assetValue || ''}
                  onChange={(e) => handleInputChange('assetValue', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Depreciação Anual (%)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.annualDepreciationRate || ''}
                  onChange={(e) => handleInputChange('annualDepreciationRate', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lubrificação & Manutenção */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Droplets size={18} />
            <span className="font-medium">Lubrificação & Manutenção</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Km de Intervalo</label>
              <input
                type="text"
                inputMode="decimal"
                value={data.oilChangeIntervalKm || ''}
                onChange={(e) => handleInputChange('oilChangeIntervalKm', e.target.value)}
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo de Troca (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.lastOilChangeCost || ''}
                  onChange={(e) => handleInputChange('lastOilChangeCost', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo do Kit (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.lastFilterChangeCost || ''}
                  onChange={(e) => handleInputChange('lastFilterChangeCost', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Motorista & Salário */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Users size={18} />
            <span className="font-medium">Motorista & Salário</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Salário Base Mensal (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.driverSalaryMonthly || ''}
                  onChange={(e) => handleInputChange('driverSalaryMonthly', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Comissão Adicional (%)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.annualDepreciationRate || ''}
                  onChange={(e) => handleInputChange('annualDepreciationRate', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                  placeholder="% do Frete Bruto"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onUpdate('driverSalaryInclude13th', !data.driverSalaryInclude13th)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              data.driverSalaryInclude13th
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              data.driverSalaryInclude13th ? 'border-blue-500 bg-blue-500' : 'border-[hsl(var(--border))]'
            }`}>
              {data.driverSalaryInclude13th && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm">Incluir proporcional de 13º e férias</span>
          </button>
        </div>

        {/* Seguro & Licenciamento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Shield size={18} />
              <span className="font-medium text-sm">Seguro Veicular</span>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo Anual (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.insuranceYearly || ''}
                  onChange={(e) => handleInputChange('insuranceYearly', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Car size={18} />
              <span className="font-medium text-sm">IPVA & Licenciamento</span>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo Anual (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={data.registrationYearly || ''}
                  onChange={(e) => handleInputChange('registrationYearly', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] p-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={onBack}
            className="w-14 h-14 rounded-xl border-2 border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Próximo <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostsMaintenanceScreen;
