import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Package, History, CreditCard, CheckCircle, XCircle, Clock, Sparkles, QrCode, Copy, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCredits, CreditPackage, CreditTransaction } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PixPaymentData {
  pixCode: string;
  qrCodeUrl: string;
  transactionId: string;
  transactionDbId: string;
  amount: number;
  credits: number;
  packageName: string;
  beneficiaryName: string;
  expiresAt: string;
}

const Credits = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { balance, packages, transactions, loading, purchasePackage, refreshBalance, refreshTransactions } = useCredits();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('pix');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    if (paymentMethod === 'card') {
      try {
        setPurchaseLoading(pkg.id);
        await purchasePackage(pkg.id);
      } catch (error) {
        console.error('Purchase error:', error);
        toast.error('Erro ao iniciar compra. Tente novamente.');
      } finally {
        setPurchaseLoading(null);
      }
    } else {
      // PIX payment
      await handlePixPayment(pkg);
    }
  };

  const handlePixPayment = async (pkg: CreditPackage) => {
    try {
      setPixLoading(true);
      setPurchaseLoading(pkg.id);

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: { packageId: pkg.id },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      setPixData(data);
      setPixModalOpen(true);
      toast.success('PIX gerado com sucesso!');
    } catch (error) {
      console.error('PIX error:', error);
      toast.error('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setPixLoading(false);
      setPurchaseLoading(null);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixData?.pixCode) return;
    
    try {
      await navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const handleConfirmPayment = () => {
    toast.info('Após o pagamento, seus créditos serão adicionados automaticamente em até 5 minutos.');
    setPixModalOpen(false);
    refreshBalance();
    refreshTransactions();
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
            Pendente
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
                Cada cálculo de rota consome 1 crédito. Compre pacotes de créditos e economize!
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-4 mb-6">
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-3">Forma de Pagamento</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'pix'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-[hsl(var(--border))] hover:border-emerald-300'
                  }`}
                >
                  <QrCode size={24} />
                  <div className="text-left">
                    <p className="font-semibold">PIX</p>
                    <p className="text-xs opacity-70">Aprovação instantânea</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-[hsl(var(--border))] hover:border-blue-300'
                  }`}
                >
                  <CreditCard size={24} />
                  <div className="text-left">
                    <p className="font-semibold">Cartão</p>
                    <p className="text-xs opacity-70">Crédito em até 12x</p>
                  </div>
                </button>
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
                        paymentMethod === 'pix'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : index === 1
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/80 text-[hsl(var(--foreground))]'
                      } disabled:opacity-50`}
                    >
                      {purchaseLoading === pkg.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {paymentMethod === 'pix' ? <QrCode size={18} /> : <CreditCard size={18} />}
                          {paymentMethod === 'pix' ? 'Pagar com PIX' : 'Comprar'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <p>Pagamento seguro • PIX com confirmação instantânea</p>
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

      {/* PIX Modal */}
      <Dialog open={pixModalOpen} onOpenChange={setPixModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <QrCode size={24} />
              Pagamento via PIX
            </DialogTitle>
          </DialogHeader>

          {pixData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-lg">
                  <img 
                    src={pixData.qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-64 h-64"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-emerald-600">
                  R$ {pixData.amount.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-[hsl(var(--muted-foreground))]">
                  {pixData.credits} créditos • {pixData.packageName}
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Beneficiário: {pixData.beneficiaryName}
                </p>
              </div>

              {/* Copy Code */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">PIX Copia e Cola</p>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={pixData.pixCode}
                    className="w-full p-3 pr-12 bg-[hsl(var(--secondary))] rounded-xl text-xs font-mono overflow-hidden text-ellipsis"
                  />
                  <button
                    onClick={handleCopyPixCode}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      copied 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-white hover:bg-emerald-50 text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-amber-800 mb-2">Como pagar:</p>
                <ol className="text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com PIX</li>
                  <li>Escaneie o QR Code ou cole o código</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPixModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-[hsl(var(--border))] font-medium hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
                >
                  Já Paguei
                </button>
              </div>

              <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
                Válido por 30 minutos • ID: {pixData.transactionId}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;