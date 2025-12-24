import React, { useState, useEffect } from 'react';
import { Coins, Package, Plus, Edit2, Trash2, Save, X, Settings, Users, Gift, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

interface UserCredit {
  id: string;
  user_id: string;
  balance: number;
  free_credits: number;
  free_credits_last_reset: string | null;
  email?: string;
  full_name?: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  package_name: string | null;
  package_price_cents: number | null;
  status: string;
  created_at: string;
}

interface AdminCreditsProps {
  searchTerm: string;
}

const AdminCredits: React.FC<AdminCreditsProps> = ({ searchTerm }) => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'users' | 'packages' | 'settings' | 'transactions'>('users');
  
  // Edit states
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [newPackage, setNewPackage] = useState<Partial<CreditPackage> | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [addCreditsModal, setAddCreditsModal] = useState<{ userId: string; userName: string } | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState({ premium: 0, free: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [packagesRes, settingsRes, creditsRes, transactionsRes] = await Promise.all([
      supabase.from('credit_packages').select('*').order('sort_order'),
      supabase.from('system_settings').select('*'),
      supabase.from('user_credits').select('*'),
      supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    setPackages((packagesRes.data as CreditPackage[]) || []);
    setSettings((settingsRes.data as SystemSetting[]) || []);
    setTransactions((transactionsRes.data as CreditTransaction[]) || []);
    
    // Fetch user emails for credits
    if (creditsRes.data && creditsRes.data.length > 0) {
      const userIds = creditsRes.data.map((c: UserCredit) => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      setUserCredits(creditsRes.data.map((c: UserCredit) => ({
        ...c,
        full_name: profileMap.get(c.user_id) || 'Usuário'
      })));
    } else {
      setUserCredits([]);
    }
    
    setLoading(false);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getSetting = (key: string) => settings.find(s => s.key === key)?.value || '';
  
  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('system_settings')
      .update({ value })
      .eq('key', key);
    
    if (error) {
      toast.error('Erro ao atualizar configuração');
    } else {
      toast.success('Configuração atualizada');
      fetchData();
    }
  };

  // Package handlers
  const handleSavePackage = async (pkg: Partial<CreditPackage>) => {
    if (!pkg.name || !pkg.credits || !pkg.price_cents) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (pkg.id) {
      const { error } = await supabase
        .from('credit_packages')
        .update({ name: pkg.name, credits: pkg.credits, price_cents: pkg.price_cents, is_active: pkg.is_active })
        .eq('id', pkg.id);
      
      if (error) {
        toast.error('Erro ao atualizar pacote');
      } else {
        toast.success('Pacote atualizado');
        setEditingPackage(null);
        fetchData();
      }
    } else {
      const maxOrder = Math.max(...packages.map(p => p.sort_order), 0);
      const { error } = await supabase
        .from('credit_packages')
        .insert({ 
          name: pkg.name, 
          credits: pkg.credits, 
          price_cents: pkg.price_cents,
          sort_order: maxOrder + 1,
        });
      
      if (error) {
        toast.error('Erro ao criar pacote');
      } else {
        toast.success('Pacote criado');
        setNewPackage(null);
        fetchData();
      }
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Excluir este pacote?')) return;
    
    const { error } = await supabase.from('credit_packages').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Pacote excluído');
      fetchData();
    }
  };

  // User credit handlers
  const handleAddCredits = async () => {
    if (!addCreditsModal) return;
    
    const { error } = await supabase
      .from('user_credits')
      .update({ 
        balance: supabase.rpc ? undefined : undefined,
      })
      .eq('user_id', addCreditsModal.userId);
    
    // Use direct update for simplicity
    const currentUser = userCredits.find(u => u.user_id === addCreditsModal.userId);
    if (currentUser) {
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          balance: currentUser.balance + creditsToAdd.premium,
          free_credits: currentUser.free_credits + creditsToAdd.free
        })
        .eq('user_id', addCreditsModal.userId);
      
      if (updateError) {
        toast.error('Erro ao adicionar créditos');
      } else {
        // Record transaction if adding premium credits
        if (creditsToAdd.premium > 0) {
          await supabase.from('credit_transactions').insert({
            user_id: addCreditsModal.userId,
            amount: creditsToAdd.premium,
            type: 'bonus',
            description: 'Créditos adicionados pelo administrador',
            status: 'completed'
          });
        }
        
        toast.success('Créditos adicionados com sucesso');
        setAddCreditsModal(null);
        setCreditsToAdd({ premium: 0, free: 0 });
        fetchData();
      }
    }
  };

  const handleResetFreeCredits = async (userId: string) => {
    const dailyAmount = parseInt(getSetting('daily_free_credits')) || 1;
    
    const { error } = await supabase
      .from('user_credits')
      .update({ 
        free_credits: dailyAmount,
        free_credits_last_reset: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      toast.error('Erro ao resetar créditos');
    } else {
      toast.success('Créditos gratuitos resetados');
      fetchData();
    }
  };

  const filteredUsers = userCredits.filter(u => 
    u.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.user_id.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            subTab === 'users' ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users size={18} />
          Usuários
        </button>
        <button
          onClick={() => setSubTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            subTab === 'transactions' ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Coins size={18} />
          Transações
        </button>
        <button
          onClick={() => setSubTab('packages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            subTab === 'packages' ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package size={18} />
          Pacotes
        </button>
        <button
          onClick={() => setSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            subTab === 'settings' ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings size={18} />
          Configurações
        </button>
      </div>

      {/* Users Tab */}
      {subTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center gap-4">
            <h3 className="font-semibold">Créditos por Usuário</h3>
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Buscar usuário..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[hsl(var(--secondary))]">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Usuário</th>
                  <th className="text-left p-3 text-sm font-semibold">Premium</th>
                  <th className="text-left p-3 text-sm font-semibold">Gratuitos</th>
                  <th className="text-left p-3 text-sm font-semibold">Total</th>
                  <th className="text-left p-3 text-sm font-semibold">Último Reset</th>
                  <th className="text-left p-3 text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{user.full_name || 'Usuário'}</div>
                      <div className="text-xs text-gray-500">{user.user_id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-amber-600">{user.balance}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-emerald-600">{user.free_credits}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold">{user.balance + user.free_credits}</span>
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {user.free_credits_last_reset 
                        ? format(new Date(user.free_credits_last_reset), 'dd/MM/yyyy HH:mm')
                        : '-'
                      }
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAddCreditsModal({ userId: user.user_id, userName: user.full_name || 'Usuário' })}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200"
                        >
                          <Plus size={12} />
                          Adicionar
                        </button>
                        <button
                          onClick={() => handleResetFreeCredits(user.user_id)}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200"
                        >
                          <Gift size={12} />
                          Reset Diário
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {subTab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings size={18} className="text-amber-600" />
              Configurações de Créditos
            </h3>
          </div>
          
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h4 className="font-medium">Créditos Gratuitos Diários</h4>
                <p className="text-sm text-gray-500">Habilitar/desabilitar créditos gratuitos diários para todos os usuários</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={getSetting('daily_free_credits_enabled') === 'true'}
                  onChange={(e) => updateSetting('daily_free_credits_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Quantidade de Créditos Diários</h4>
                  <p className="text-sm text-gray-500">Quantos créditos gratuitos cada usuário recebe por dia</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={getSetting('daily_free_credits') || '1'}
                  onChange={(e) => updateSetting('daily_free_credits', e.target.value)}
                  className="w-24 px-4 py-2 border rounded-lg text-center font-medium"
                />
                <span className="text-gray-500">créditos por dia</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packages Tab */}
      {subTab === 'packages' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Pacotes de Créditos</h3>
            <button
              onClick={() => setNewPackage({ name: '', credits: 0, price_cents: 0, is_active: true, sort_order: 0 })}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Plus size={16} />
              Novo Pacote
            </button>
          </div>
          
          <div className="divide-y">
            {newPackage && (
              <PackageForm
                pkg={newPackage}
                onSave={handleSavePackage}
                onCancel={() => setNewPackage(null)}
              />
            )}
            
            {packages.map((pkg) => (
              editingPackage?.id === pkg.id ? (
                <PackageForm
                  key={pkg.id}
                  pkg={editingPackage}
                  onSave={handleSavePackage}
                  onCancel={() => setEditingPackage(null)}
                />
              ) : (
                <div key={pkg.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pkg.name}</span>
                      {!pkg.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inativo</span>
                      )}
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      {pkg.credits} créditos por {formatCurrency(pkg.price_cents)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPackage(pkg)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {subTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Histórico de Transações</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[hsl(var(--secondary))]">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Data</th>
                  <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                  <th className="text-left p-3 text-sm font-semibold">Descrição</th>
                  <th className="text-left p-3 text-sm font-semibold">Créditos</th>
                  <th className="text-left p-3 text-sm font-semibold">Valor</th>
                  <th className="text-left p-3 text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter(tx => 
                    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    tx.package_name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="p-3 text-sm">
                        {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          tx.type === 'purchase' ? 'bg-emerald-100 text-emerald-700' :
                          tx.type === 'usage' ? 'bg-blue-100 text-blue-700' :
                          tx.type === 'refund' ? 'bg-amber-100 text-amber-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {tx.type === 'purchase' ? 'Compra' :
                           tx.type === 'usage' ? 'Uso' :
                           tx.type === 'refund' ? 'Reembolso' : 'Bônus'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{tx.description || tx.package_name || '-'}</td>
                      <td className={`p-3 font-medium ${tx.amount > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </td>
                      <td className="p-3 text-sm">
                        {tx.package_price_cents ? formatCurrency(tx.package_price_cents) : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          tx.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.status === 'completed' ? 'Concluído' :
                           tx.status === 'pending' ? 'Pendente' :
                           tx.status === 'failed' ? 'Falhou' : 'Reembolsado'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Credits Modal */}
      {addCreditsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Créditos</h3>
            <p className="text-gray-600 mb-4">Usuário: <strong>{addCreditsModal.userName}</strong></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Créditos Premium</label>
                <input
                  type="number"
                  min="0"
                  value={creditsToAdd.premium}
                  onChange={(e) => setCreditsToAdd({ ...creditsToAdd, premium: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Créditos comprados, não expiram</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Créditos Gratuitos</label>
                <input
                  type="number"
                  min="0"
                  value={creditsToAdd.free}
                  onChange={(e) => setCreditsToAdd({ ...creditsToAdd, free: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Resetam diariamente</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddCredits}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setAddCreditsModal(null);
                  setCreditsToAdd({ premium: 0, free: 0 });
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Package Form Component
const PackageForm: React.FC<{
  pkg: Partial<CreditPackage>;
  onSave: (pkg: Partial<CreditPackage>) => void;
  onCancel: () => void;
}> = ({ pkg, onSave, onCancel }) => {
  const [form, setForm] = useState(pkg);

  return (
    <div className="p-4 bg-amber-50">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Nome</label>
          <input
            type="text"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Ex: Básico"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Créditos</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.credits !== undefined ? String(form.credits) : ''}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setForm({ ...form, credits: val ? parseInt(val, 10) : 0 });
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Preço (centavos)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.price_cents !== undefined ? String(form.price_cents) : ''}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setForm({ ...form, price_cents: val ? parseInt(val, 10) : 0 });
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="5000 = R$50"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-1 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm"
          >
            <Save size={14} />
            Salvar
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCredits;