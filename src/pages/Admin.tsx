import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Truck, MapPin, Shield, TrendingUp, Search, Trash2, UserCog, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminCredits from '@/components/admin/AdminCredits';

type AdminTab = 'users' | 'vehicles' | 'trips' | 'credits' | 'stats';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  role?: string;
  email?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast.error('Acesso negado. Área restrita a administradores.');
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    
    if (activeTab === 'users') {
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: roles } = await supabase.from('user_roles').select('*');
      
      const usersWithRoles = profiles?.map(p => ({
        ...p,
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'user',
      })) || [];
      
      setUsers(usersWithRoles);
    } else if (activeTab === 'vehicles') {
      const { data } = await supabase.from('vehicles').select('*');
      setVehicles(data || []);
    } else if (activeTab === 'trips') {
      const { data } = await supabase.from('trip_history').select('*').order('created_at', { ascending: false });
      setTrips(data || []);
    } else if (activeTab === 'stats') {
      const { data: vehiclesCount } = await supabase.from('vehicles').select('id', { count: 'exact' });
      const { data: tripsCount } = await supabase.from('trip_history').select('id', { count: 'exact' });
      const { data: usersCount } = await supabase.from('profiles').select('id', { count: 'exact' });
      const { data: tripsData } = await supabase.from('trip_history').select('net_profit, total_freight_income');
      
      const totalProfit = tripsData?.reduce((acc, t) => acc + (t.net_profit || 0), 0) || 0;
      const totalRevenue = tripsData?.reduce((acc, t) => acc + (t.total_freight_income || 0), 0) || 0;
      
      setStats({
        users: usersCount?.length || 0,
        vehicles: vehiclesCount?.length || 0,
        trips: tripsCount?.length || 0,
        totalProfit,
        totalRevenue,
      });
    }
    
    setLoading(false);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);
    
    if (error) {
      toast.error('Erro ao atualizar role');
    } else {
      toast.success(`Usuário ${newRole === 'admin' ? 'promovido a admin' : 'rebaixado a usuário'}`);
      fetchData();
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Excluir este veículo?')) return;
    
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Veículo excluído');
      fetchData();
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Excluir esta viagem?')) return;
    
    const { error } = await supabase.from('trip_history').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Viagem excluída');
      fetchData();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'vehicles', label: 'Veículos', icon: Truck },
    { id: 'trips', label: 'Viagens', icon: MapPin },
    { id: 'credits', label: 'Créditos', icon: Coins },
    { id: 'stats', label: 'Estatísticas', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={24} />
            <h1 className="text-xl font-bold">Painel Administrativo</h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-[hsl(var(--border))] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4">
        {/* Search Bar */}
        {activeTab !== 'stats' && (
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-12 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[hsl(var(--secondary))]">
                      <tr>
                        <th className="text-left p-4 font-semibold">Nome</th>
                        <th className="text-left p-4 font-semibold">Empresa</th>
                        <th className="text-left p-4 font-semibold">Telefone</th>
                        <th className="text-left p-4 font-semibold">Role</th>
                        <th className="text-left p-4 font-semibold">Criado em</th>
                        <th className="text-left p-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => 
                          u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((u) => (
                          <tr key={u.id} className="border-t border-[hsl(var(--border))]">
                            <td className="p-4">{u.full_name || '-'}</td>
                            <td className="p-4">{u.company_name || '-'}</td>
                            <td className="p-4">{u.phone || '-'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {u.role === 'admin' ? 'Admin' : 'Usuário'}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
                              {format(new Date(u.created_at), 'dd/MM/yyyy')}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleRole(u.user_id, u.role || 'user')}
                                className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors"
                                title={u.role === 'admin' ? 'Remover admin' : 'Promover a admin'}
                              >
                                <UserCog size={18} className={u.role === 'admin' ? 'text-purple-600' : 'text-gray-600'} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vehicles Tab */}
            {activeTab === 'vehicles' && (
              <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[hsl(var(--secondary))]">
                      <tr>
                        <th className="text-left p-4 font-semibold">Placa</th>
                        <th className="text-left p-4 font-semibold">Modelo</th>
                        <th className="text-left p-4 font-semibold">Consumo</th>
                        <th className="text-left p-4 font-semibold">Eixos</th>
                        <th className="text-left p-4 font-semibold">Capacidade</th>
                        <th className="text-left p-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles
                        .filter(v => 
                          v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.model_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((v) => (
                          <tr key={v.id} className="border-t border-[hsl(var(--border))]">
                            <td className="p-4 font-medium">{v.license_plate}</td>
                            <td className="p-4">{v.model_name || '-'}</td>
                            <td className="p-4">{v.fuel_consumption} km/l</td>
                            <td className="p-4">{v.axles}</td>
                            <td className="p-4">{v.cargo_capacity} ton</td>
                            <td className="p-4">
                              <button
                                onClick={() => handleDeleteVehicle(v.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Trips Tab */}
            {activeTab === 'trips' && (
              <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[hsl(var(--secondary))]">
                      <tr>
                        <th className="text-left p-4 font-semibold">Placa</th>
                        <th className="text-left p-4 font-semibold">Distância</th>
                        <th className="text-left p-4 font-semibold">Receita</th>
                        <th className="text-left p-4 font-semibold">Lucro</th>
                        <th className="text-left p-4 font-semibold">Viabilidade</th>
                        <th className="text-left p-4 font-semibold">Data</th>
                        <th className="text-left p-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips
                        .filter(t => 
                          t.license_plate?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((t) => (
                          <tr key={t.id} className="border-t border-[hsl(var(--border))]">
                            <td className="p-4 font-medium">{t.license_plate || '-'}</td>
                            <td className="p-4">{t.total_distance_km} km</td>
                            <td className="p-4">{formatCurrency(t.total_freight_income)}</td>
                            <td className={`p-4 font-semibold ${t.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(t.net_profit)}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                t.viability_score === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                t.viability_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {t.viability_score === 'high' ? 'Alta' : t.viability_score === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
                              {format(new Date(t.created_at), 'dd/MM/yyyy')}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleDeleteTrip(t.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Credits Tab */}
            {activeTab === 'credits' && (
              <AdminCredits searchTerm={searchTerm} />
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  icon={Users}
                  label="Total de Usuários"
                  value={stats.users}
                  color="blue"
                />
                <StatCard
                  icon={Truck}
                  label="Veículos Cadastrados"
                  value={stats.vehicles}
                  color="emerald"
                />
                <StatCard
                  icon={MapPin}
                  label="Viagens Calculadas"
                  value={stats.trips}
                  color="purple"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Receita Total"
                  value={formatCurrency(stats.totalRevenue)}
                  color="amber"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Lucro Total Calculado"
                  value={formatCurrency(stats.totalProfit)}
                  color="emerald"
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[hsl(var(--border))]">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon size={28} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
