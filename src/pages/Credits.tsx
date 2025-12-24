import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Package, History, CreditCard, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCredits, CreditPackage, CreditTransaction } from '@/hooks/useCredits';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Credits = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { balance, packages, transactions, loading, purchasePackage, refreshBalance, refreshTransactions } = useCredits();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Handle success/cancel from Stripe
    if (searchParams.get('success') === 'true') {
      toast.success('Pagamento realizado com sucesso! Seus créditos foram adicionados.');
      refreshBalance();
      refreshTransactions();
      window.history.replaceState({}, '', '/credits');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Pagamento cancelado.');
      window.history.replaceState({}, '', '/credits');
    }
  }, [searchParams, refreshBalance, refreshTransactions]);

  const handlePurchase = async (pkg: CreditPackage) => {
    try {
      setPurchaseLoading(pkg.id);
      await purchasePackage(pkg.id);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Erro ao iniciar compra. Tente novamente.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: CreditTransaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
            <CheckCircle size={12} />
            Concluído
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
            <Clock size={12} />
            Processando
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
            <XCircle size={12} />
            Falhou
          </span>
        );
      case 'refunded':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            Reembolsado
          </span>
        );
    }
  };

  const getTypeBadge = (type: CreditTransaction['type']) => {
    switch (type) {
      case 'purchase':
        return <span className="text-emerald-600">Compra</span>;
      case 'usage':
        return <span className="text-blue-600">Uso</span>;
      case 'refund':
        return <span className="text-amber-600">Reembolso</span>;
      case 'bonus':
        return <span className="text-purple-600">Bônus</span>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Coins size={24} />
            <h1 className="text-xl font-bold">Créditos</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
            <Sparkles size={18} />
            <span className="font-bold text-lg">{balance}</span>
            <span className="text-sm opacity-80">créditos</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-[hsl(var(--border))] sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'packages'
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <Package size={18} />
              Comprar Créditos
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <History size={18} />
              Histórico
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'packages' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-amber-800 mb-2">Como funcionam os créditos?</h2>
              <p className="text-amber-700">
                Cada análise de rota com IA consome 1 crédito. Compre pacotes de créditos e economize!
              </p>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-4 mb-6">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle size={24} />
                <div>
                  <h3 className="font-semibold">Pagamento Seguro via Stripe</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Cartão de crédito em até 12x • Créditos liberados instantaneamente após pagamento
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.id}
                  className={`relative bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-transform hover:scale-105 ${
                    index === 1 ? 'border-amber-500 ring-2 ring-amber-200' : 'border-[hsl(var(--border))]'
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-center text-xs font-semibold py-1">
                      MAIS POPULAR
                    </div>
                  )}
                  <div className={`p-6 ${index === 1 ? 'pt-10' : ''}`}>
                    <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-bold text-amber-600">{pkg.credits}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">créditos</span>
                    </div>
                    <div className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
                      {formatCurrency(pkg.price_cents)}
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                      {formatCurrency(Math.round(pkg.price_cents / pkg.credits))} por crédito
                    </div>
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchaseLoading !== null}
                      className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                        index === 1
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/80 text-[hsl(var(--foreground))]'
                      } disabled:opacity-50`}
                    >
                      {purchaseLoading === pkg.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CreditCard size={18} />
                          Comprar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <p>🔒 Pagamento seguro processado pelo Stripe • Créditos liberados automaticamente</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      <Coins size={20} className={tx.amount > 0 ? 'text-emerald-600' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tx.description || tx.package_name || getTypeBadge(tx.type)}</span>
                      </div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        {format(new Date(tx.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} créditos
                      </div>
                      {tx.package_price_cents && (
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                          {formatCurrency(tx.package_price_cents)}
                        </div>
                      )}
                    </div>
                    <div>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Credits;
