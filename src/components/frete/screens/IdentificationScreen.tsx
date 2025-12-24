import React from 'react';
import { User, ArrowRight, LogIn } from 'lucide-react';

interface IdentificationScreenProps {
  driverName: string;
  onNameChange: (name: string) => void;
  onContinue: () => void;
  onLogin?: () => void;
}

const IdentificationScreen: React.FC<IdentificationScreenProps> = ({
  driverName,
  onNameChange,
  onContinue,
  onLogin,
}) => {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-[hsl(var(--background))]">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg mb-6 relative">
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
            Frete<span className="text-blue-600">Certo</span>
          </h1>
          <span className="inline-block mt-2 px-4 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full">
            Identificação
          </span>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-[hsl(var(--border))] p-6 space-y-6">
          {/* Seção Dados do Motorista */}
          <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))]">
            <User size={20} />
            <span className="font-medium">Dados do Motorista</span>
          </div>

          {/* Campo Nome */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Nome Completo
            </label>
            <div className="relative">
              <input
                type="text"
                value={driverName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-4 py-4 border-2 border-[hsl(var(--border))] rounded-xl text-base text-[hsl(var(--foreground))] bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Usado para personalizar seus relatórios de viagem.
            </p>
          </div>

          {/* Botão Começar */}
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Começar <ArrowRight size={20} />
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[hsl(var(--border))]"></div>
            <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">ou</span>
            <div className="flex-1 h-px bg-[hsl(var(--border))]"></div>
          </div>

          {/* Botão Login */}
          <button
            onClick={onLogin}
            className="w-full border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))] text-[hsl(var(--foreground))] font-medium py-4 rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            <LogIn size={18} />
            Já possui conta? Entrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentificationScreen;
