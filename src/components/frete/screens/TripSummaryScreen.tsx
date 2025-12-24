import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Navigation, ArrowLeft, Calculator, Edit3, Sparkles, RotateCcw, Info, Coins, LogIn } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface RoutePoint {
  id: string;
  address: string;
  value: number;
  weight?: number;
}

interface TripSummaryScreenProps {
  vehicleInfo: {
    licensePlate?: string;
    axles: number;
    driverName: string;
    fuelConsumption: number;
    fuelPrice: number;
  };
  pickups: RoutePoint[];
  deliveries: RoutePoint[];
  totalFreight: number;
  estimatedDistance?: number;
  onCalculate: (includeReturn: boolean, returnCost: number) => void;
  onBack: () => void;
  onEditVehicle: () => void;
  loading?: boolean;
  userCredits?: number;
  isLoggedIn?: boolean;
}

const TripSummaryScreen: React.FC<TripSummaryScreenProps> = ({
  vehicleInfo,
  pickups,
  deliveries,
  totalFreight,
  estimatedDistance,
  onCalculate,
  onBack,
  onEditVehicle,
  loading = false,
  userCredits = 0,
  isLoggedIn = false,
}) => {
  const navigate = useNavigate();
  const [includeReturn, setIncludeReturn] = useState(false);
  const [estimatedReturnCost, setEstimatedReturnCost] = useState(0);

  // Calculate estimated return cost when toggle is enabled
  useEffect(() => {
    if (includeReturn && estimatedDistance && vehicleInfo.fuelConsumption && vehicleInfo.fuelPrice) {
      // Estimate return cost: fuel + estimated maintenance
      const fuelCost = (estimatedDistance / vehicleInfo.fuelConsumption) * vehicleInfo.fuelPrice;
      const maintenanceCost = estimatedDistance * 0.20; // R$0.20/km
      setEstimatedReturnCost(fuelCost + maintenanceCost);
    } else {
      setEstimatedReturnCost(0);
    }
  }, [includeReturn, estimatedDistance, vehicleInfo.fuelConsumption, vehicleInfo.fuelPrice]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const hasInsufficientCredits = userCredits < 1;

  const handleCalculateClick = () => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }
    
    if (hasInsufficientCredits) {
      navigate('/credits');
      return;
    }
    
    onCalculate(includeReturn, estimatedReturnCost);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">CONFIRMAÇÃO FINAL</span>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Resumo da Viagem</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Confira os detalhes antes de calcular com IA</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Frete estimado</span>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalFreight)}</p>
          </div>
        </div>

        {/* AI Credits Info */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Sparkles size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-violet-800">Análise com IA</p>
                <p className="text-sm text-violet-600">Custo: 1 crédito</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Seus créditos</p>
              {isLoggedIn ? (
                <p className={`text-xl font-bold ${hasInsufficientCredits ? 'text-red-600' : 'text-violet-600'}`}>
                  {userCredits}
                </p>
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Faça login</p>
              )}
            </div>
          </div>
          {!isLoggedIn && (
            <div className="mt-3 bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                🔐 Faça login ou cadastre-se para usar a análise com IA
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <LogIn size={16} className="mr-2" />
                Entrar ou Cadastrar
              </Button>
            </div>
          )}
          {isLoggedIn && hasInsufficientCredits && (
            <div className="mt-3 bg-amber-50 p-3 rounded-lg">
              <p className="text-sm text-amber-700 mb-2">
                ⚠️ Créditos insuficientes. Adquira mais créditos para usar a análise com IA.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/credits')}
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <Coins size={16} className="mr-2" />
                Comprar Créditos
              </Button>
            </div>
          )}
        </div>

        {/* Vehicle Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-[hsl(var(--muted-foreground))]" />
              <span className="font-medium text-[hsl(var(--muted-foreground))]">Dados do Veículo</span>
            </div>
            <button
              onClick={onEditVehicle}
              className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
            >
              <Edit3 size={14} />
              Editar
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))]">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Placa</p>
              <p className="font-bold text-[hsl(var(--foreground))]">{vehicleInfo.licensePlate || 'Não informada'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Eixos</p>
              <p className="font-bold text-[hsl(var(--foreground))]">{vehicleInfo.axles || '-'} Eixo(s)</p>
            </div>
          </div>
        </div>

        {/* Route Points Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-[hsl(var(--muted-foreground))]" />
            <span className="font-medium text-[hsl(var(--muted-foreground))]">Pontos da Rota</span>
          </div>

          {/* Pickups */}
          {pickups.map((pickup, index) => (
            <div key={pickup.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase">
                  Coleta {pickups.length > 1 ? index + 1 : ''}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">ORIGEM / COLETA</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--secondary))]">
                <MapPin size={18} className="text-emerald-600" />
                <div className="flex-1">
                  <p className={`font-medium ${pickup.address ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}>
                    {pickup.address || 'Endereço não informado'}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Deliveries */}
          {deliveries.map((delivery, index) => (
            <div key={delivery.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase">
                  Entrega {deliveries.length > 1 ? index + 1 : ''}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">DESTINO / ENTREGA</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--secondary))]">
                <MapPin size={18} className="text-blue-600" />
                <div className="flex-1">
                  <p className={`font-medium ${delivery.address ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}>
                    {delivery.address || 'Endereço não informado'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Return Toggle Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <RotateCcw size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[hsl(var(--foreground))]">Incluir retorno vazio</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info size={14} className="text-[hsl(var(--muted-foreground))]" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Se não houver carga de retorno, inclua os custos de voltar vazio no cálculo.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Considerar custo de retorno sem carga
                </p>
              </div>
            </div>
            <Switch
              checked={includeReturn}
              onCheckedChange={setIncludeReturn}
            />
          </div>

          {/* Return Cost Estimate */}
          {includeReturn && (
            <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
              <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl">
                <div>
                  <p className="text-sm text-amber-800 font-medium">Custo estimado de retorno</p>
                  <p className="text-xs text-amber-600">
                    Combustível + manutenção ({estimatedDistance?.toLocaleString('pt-BR') || '—'} km)
                  </p>
                </div>
                <p className="text-xl font-bold text-amber-700">
                  {formatCurrency(estimatedReturnCost)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Features */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />
            A análise com IA inclui:
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Score de viabilidade
            </div>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Margem de lucro
            </div>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Alertas de prejuízo
            </div>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Dicas de otimização
            </div>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
              Análise de mercado
            </div>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Valor sugerido
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
            onClick={handleCalculateClick}
            disabled={loading}
            className={`flex-1 font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98] ${
              !isLoggedIn 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                : hasInsufficientCredits
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analisando com IA...
              </>
            ) : !isLoggedIn ? (
              <>
                <LogIn size={20} />
                Entrar para Calcular
              </>
            ) : hasInsufficientCredits ? (
              <>
                <Coins size={20} />
                Comprar Créditos
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Calcular com IA
                <span className="text-sm opacity-80">(1 crédito)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripSummaryScreen;
