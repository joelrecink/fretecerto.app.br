import React, { useState, useEffect } from 'react';
import { Coins, Package, Settings, Plus, Edit2, Trash2, Save, X, Key, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
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

interface PixConfig {
  id: string;
  pix_key: string;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  beneficiary_name: string;
  is_active: boolean;
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

interface UserProfile {
  user_id: string;
  full_name: string | null;
}

interface AdminCreditsProps {
  searchTerm: string;
}

const AdminCredits: React.FC<AdminCreditsProps> = ({ searchTerm }) => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [pendingPixTransactions, setPendingPixTransactions] = useState<CreditTransaction[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'packages' | 'pix' | 'pending' | 'transactions'>('pending');
  
  // Edit states
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [newPackage, setNewPackage] = useState<Partial<CreditPackage> | null>(null);
  const [editingPix, setEditingPix] = useState(false);
  const [pixForm, setPixForm] = useState<Partial<PixConfig>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [packagesRes, pixRes, transactionsRes, profilesRes] = await Promise.all([
      supabase.from('credit_packages').select('*').order('sort_order'),
      supabase.from('pix_config').select('*').eq('is_active', true).single(),
      supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('user_id, full_name'),
    ]);

    setPackages((packagesRes.data as CreditPackage[]) || []);
    setPixConfig((pixRes.data as PixConfig) || null);
    
    const allTransactions = (transactionsRes.data as CreditTransaction[]) || [];
    setTransactions(allTransactions);
    
    // Filter pending PIX transactions (type purchase, status pending)
    const pending = allTransactions.filter(tx => 
      tx.type === 'purchase' && tx.status === 'pending'
    );
    setPendingPixTransactions(pending);
    
    setUserProfiles((profilesRes.data as UserProfile[]) || []);
    
    if (pixRes.data) {
      setPixForm(pixRes.data as PixConfig);
    }
    
    setLoading(false);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
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

  // PIX handlers
  const handleSavePix = async () => {
    if (!pixForm.pix_key || !pixForm.pix_key_type || !pixForm.beneficiary_name) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Deactivate existing config
    if (pixConfig) {
      await supabase.from('pix_config').update({ is_active: false }).eq('id', pixConfig.id);
    }

    // Create new config
    const { error } = await supabase.from('pix_config').insert({
      pix_key: pixForm.pix_key,
      pix_key_type: pixForm.pix_key_type,
      beneficiary_name: pixForm.beneficiary_name,
      is_active: true,
    });

    if (error) {
      toast.error('Erro ao salvar configuração PIX');
    } else {
      toast.success('Configuração PIX salva com segurança');
      setEditingPix(false);
      fetchData();
    }
  };

  const maskPixKey = (key: string, type: string) => {
    if (type === 'cpf') return key.replace(/(\d{3})\d{5}(\d{3})/, '$1*****$2');
    if (type === 'cnpj') return key.replace(/(\d{2})\d{6}(\d{4})/, '$1******$2');
    if (type === 'email') {
      const [name, domain] = key.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    if (type === 'phone') return key.replace(/(\d{2})\d{5}(\d{4})/, '($1)*****-$2');
    return key.slice(0, 8) + '***';
  };

  const getUserName = (userId: string) => {
    const profile = userProfiles.find(p => p.user_id === userId);
    return profile?.full_name || 'Usuário desconhecido';
  };

  // Confirm PIX payment handler
  const handleConfirmPixPayment = async (transaction: CreditTransaction) => {
    if (!confirm(`Confirmar pagamento PIX de ${formatCurrency(transaction.package_price_cents || 0)} para ${getUserName(transaction.user_id)}?\n\nIsso adicionará ${transaction.amount} créditos ao usuário.`)) {
      return;
    }

    setConfirmingPayment(transaction.id);

    try {
      // Use the add_user_credits function to add credits and update transaction status
      const { data, error } = await supabase.rpc('add_user_credits', {
        _user_id: transaction.user_id,
        _amount: transaction.amount,
        _type: 'purchase',
        _description: `PIX confirmado: ${transaction.package_name}`,
        _package_name: transaction.package_name,
        _package_price_cents: transaction.package_price_cents,
      });

      if (error) {
        throw error;
      }

      // Update the original pending transaction status to completed
      const { error: updateError } = await supabase
        .from('credit_transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Error updating transaction status:', updateError);
      }

      toast.success(`Pagamento confirmado! ${transaction.amount} créditos adicionados.`);
      fetchData();
    } catch (error) {
      console.error('Error confirming PIX payment:', error);
      toast.error('Erro ao confirmar pagamento');
    } finally {
      setConfirmingPayment(null);
    }
  };

  // Reject PIX payment handler
  const handleRejectPixPayment = async (transactionId: string) => {
    if (!confirm('Rejeitar este pagamento PIX? A transação será marcada como falha.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('credit_transactions')
        .update({ status: 'failed' })
        .eq('id', transactionId);

      if (error) {
        throw error;
      }

      toast.success('Pagamento rejeitado');
      fetchData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Erro ao rejeitar pagamento');
    }
  };

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
          onClick={() => setSubTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors relative ${
            subTab === 'pending' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Clock size={18} />
          PIX Pendentes
          {pendingPixTransactions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingPixTransactions.length}
            </span>
          )}
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
          onClick={() => setSubTab('pix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            subTab === 'pix' ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Key size={18} />
          Configuração PIX
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
      </div>

      {/* Pending PIX Payments Tab */}
      {subTab === 'pending' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
            <h3 className="font-semibold flex items-center gap-2 text-emerald-800">
              <Clock size={18} />
              Pagamentos PIX Pendentes
            </h3>
            <p className="text-sm text-emerald-600 mt-1">
              Confirme os pagamentos após verificar o recebimento no extrato bancário
            </p>
          </div>
          
          {pendingPixTransactions.length === 0 ? (
            <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
              <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-emerald-500" />
              <p>Nenhum pagamento PIX pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {pendingPixTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock size={24} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="font-medium">{getUserName(tx.user_id)}</span>
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      {tx.package_name} • {tx.amount} créditos
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-lg font-bold text-emerald-600">
                      {formatCurrency(tx.package_price_cents || 0)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmPixPayment(tx)}
                      disabled={confirmingPayment === tx.id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      {confirmingPayment === tx.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleRejectPixPayment(tx.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <X size={16} />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* PIX Config Tab */}
      {subTab === 'pix' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Key size={18} className="text-amber-600" />
              Configuração da Conta PIX
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Configure a chave PIX para recebimento dos pagamentos. Dados armazenados com segurança.
            </p>
          </div>

          <div className="p-4">
            {!editingPix && pixConfig ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Settings size={18} />
                    PIX Configurado
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Beneficiário:</span>{' '}
                      <span className="font-medium">{pixConfig.beneficiary_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tipo de Chave:</span>{' '}
                      <span className="font-medium uppercase">{pixConfig.pix_key_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Chave (mascarada):</span>{' '}
                      <span className="font-medium">{maskPixKey(pixConfig.pix_key, pixConfig.pix_key_type)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPixForm(pixConfig);
                    setEditingPix(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <Edit2 size={16} />
                  Alterar Configuração
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                  <strong>⚠️ Segurança:</strong> A chave PIX será armazenada de forma segura no banco de dados com acesso restrito apenas a administradores.
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome do Beneficiário</label>
                    <input
                      type="text"
                      value={pixForm.beneficiary_name || ''}
                      onChange={(e) => setPixForm({ ...pixForm, beneficiary_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      placeholder="Nome completo ou razão social"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Chave PIX</label>
                    <select
                      value={pixForm.pix_key_type || ''}
                      onChange={(e) => setPixForm({ ...pixForm, pix_key_type: e.target.value as PixConfig['pix_key_type'] })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Chave PIX</label>
                    <input
                      type="text"
                      value={pixForm.pix_key || ''}
                      onChange={(e) => setPixForm({ ...pixForm, pix_key: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      placeholder="Digite a chave PIX"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSavePix}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <Save size={16} />
                    Salvar Configuração
                  </button>
                  {pixConfig && (
                    <button
                      onClick={() => {
                        setEditingPix(false);
                        setPixForm(pixConfig);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X size={16} />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )}
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
