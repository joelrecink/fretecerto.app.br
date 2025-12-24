import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteAnalysisRequest {
  routeData: {
    totalDistanceKm: number;
    totalDurationHours: number;
    totalDurationDays: number;
    estimatedFuelCost: number;
    estimatedTollCost: number;
    driverCommissionCost: number;
    estimatedMaintenanceCost: number;
    estimatedFixedCost: number;
    totalFreightIncome: number;
    netProfit: number;
    originCity: string;
    destinationCity: string;
    routeSummary?: string; // e.g. "BR-101, SC-430, RS-020"
  };
  vehicleData: {
    axles: number;
    fuelConsumption: number;
    cargoCapacity: number;
  };
  includeReturn: boolean;
  returnCost?: number;
}

interface RoadRestriction {
  road: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  alternative?: string;
}

interface AIAnalysis {
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  profitMargin: number;
  alerts: string[];
  optimizationTips: string[];
  marketAnalysis: string;
  returnAnalysis?: {
    hasReturnLoad: boolean;
    estimatedReturnCost: number;
    recommendation: string;
  };
  suggestedFreightValue?: number;
  summary: string;
  roadRestrictions?: RoadRestriction[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('AI Analysis request from user:', user.id);

    // Check and consume credits (1 credit per analysis)
    const { data: hasCredits, error: creditCheckError } = await supabaseClient
      .rpc('use_user_credits', {
        _user_id: user.id,
        _amount: 1,
        _description: 'Análise de rota com IA'
      });

    if (creditCheckError) {
      console.error('Credit check error:', creditCheckError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro ao verificar créditos',
        code: 'CREDIT_ERROR'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!hasCredits) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Créditos insuficientes. Você precisa de pelo menos 1 crédito para realizar a análise com IA.',
        code: 'INSUFFICIENT_CREDITS'
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Credit consumed successfully');

    const { routeData, vehicleData, includeReturn, returnCost } = await req.json() as RouteAnalysisRequest;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    // Build comprehensive prompt for AI analysis
    const totalCosts = routeData.estimatedFuelCost + routeData.estimatedTollCost + 
                       routeData.driverCommissionCost + routeData.estimatedMaintenanceCost + 
                       routeData.estimatedFixedCost + (includeReturn && returnCost ? returnCost : 0);
    
    const adjustedProfit = includeReturn && returnCost 
      ? routeData.totalFreightIncome - totalCosts 
      : routeData.netProfit;

    const profitMarginPercent = (adjustedProfit / routeData.totalFreightIncome * 100).toFixed(1);

    const systemPrompt = `Você é um especialista em logística de transporte rodoviário de cargas no Brasil. 
Analise os dados da viagem e forneça uma avaliação completa considerando:

1. VIABILIDADE FINANCEIRA: Avalie se o frete cobre os custos e gera lucro adequado
2. OTIMIZAÇÃO: Sugira formas de reduzir custos (combustível, pedágios, horários)
3. ANÁLISE DE MERCADO: Compare com valores médios do mercado para a região/distância
4. RETORNO: Se não há carga de retorno, avalie o impacto no custo total
5. RESTRIÇÕES DE ESTRADAS: Identifique trechos perigosos ou proibidos para o tamanho do veículo

IMPORTANTE - RESTRIÇÕES POR EIXOS:
- Veículos com 6+ eixos: evitar Serra do Rio do Rastro (SC-430), Serra do Corvo Branco (SC-370), Serra das Araras
- Veículos com 7+ eixos: evitar Via Anchieta (subida), Serra de Petrópolis, trechos íngremes da BR-040
- Veículos com 8+ eixos: evitar praticamente todas as serras e declives acentuados
- Considere também: peso bruto, restrições de horário, e regulamentações locais

Analise a rota informada (origem → destino) e identifique se passa por algum desses trechos problemáticos.

Responda APENAS em JSON válido com a seguinte estrutura:
{
  "viabilityScore": "high" | "medium" | "low",
  "viabilityMessage": "mensagem curta sobre viabilidade",
  "profitMargin": número em percentual,
  "alerts": ["lista de alertas importantes"],
  "optimizationTips": ["lista de dicas de otimização"],
  "marketAnalysis": "análise comparativa com mercado",
  "returnAnalysis": {
    "hasReturnLoad": boolean,
    "estimatedReturnCost": número,
    "recommendation": "recomendação sobre retorno"
  },
  "suggestedFreightValue": número sugerido para o frete,
  "summary": "resumo executivo da análise",
  "roadRestrictions": [
    {
      "road": "nome da estrada/trecho",
      "reason": "motivo da restrição",
      "severity": "critical" | "warning" | "info",
      "alternative": "rota alternativa sugerida (opcional)"
    }
  ]
}`;

    const userPrompt = `Analise esta viagem de frete:

ROTA:
- Origem: ${routeData.originCity}
- Destino: ${routeData.destinationCity}
- Distância: ${routeData.totalDistanceKm} km
- Duração: ${routeData.totalDurationHours.toFixed(1)} horas (${routeData.totalDurationDays} dias)
${routeData.routeSummary ? `- Resumo da rota: ${routeData.routeSummary}` : ''}

CUSTOS:
- Combustível: R$ ${routeData.estimatedFuelCost.toFixed(2)}
- Pedágios: R$ ${routeData.estimatedTollCost.toFixed(2)}
- Comissão motorista: R$ ${routeData.driverCommissionCost.toFixed(2)}
- Manutenção: R$ ${routeData.estimatedMaintenanceCost.toFixed(2)}
- Custos fixos: R$ ${routeData.estimatedFixedCost.toFixed(2)}
${includeReturn && returnCost ? `- Custo retorno vazio: R$ ${returnCost.toFixed(2)}` : ''}
- TOTAL CUSTOS: R$ ${totalCosts.toFixed(2)}

RECEITA E LUCRO:
- Valor do frete: R$ ${routeData.totalFreightIncome.toFixed(2)}
- Lucro líquido: R$ ${adjustedProfit.toFixed(2)}
- Margem de lucro: ${profitMarginPercent}%

VEÍCULO:
- Eixos: ${vehicleData.axles}
- Consumo: ${vehicleData.fuelConsumption} km/l
- Capacidade: ${vehicleData.cargoCapacity} toneladas

RETORNO:
- Incluir custo de retorno: ${includeReturn ? 'SIM' : 'NÃO'}
${includeReturn ? `- Custo estimado de retorno: R$ ${(returnCost || 0).toFixed(2)}` : ''}

ANÁLISE DE RESTRIÇÕES:
Considerando que o veículo possui ${vehicleData.axles} eixos, identifique se a rota entre ${routeData.originCity} e ${routeData.destinationCity} passa por trechos perigosos ou proibidos para este tipo de veículo. Inclua na sua análise:
- Serras e declives acentuados
- Estradas com restrição de peso/tamanho
- Trechos conhecidos por acidentes com veículos pesados
- Alternativas mais seguras se aplicável

Forneça sua análise completa em JSON.`;

    console.log('Calling Lovable AI for route analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('Rate limit exceeded');
        // Refund the credit since AI failed
        await supabaseClient.rpc('add_user_credits', {
          _user_id: user.id,
          _amount: 1,
          _type: 'refund',
          _description: 'Reembolso - Limite de requisições excedido'
        });
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
          code: 'RATE_LIMITED'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Refund credit on AI error
      await supabaseClient.rpc('add_user_credits', {
        _user_id: user.id,
        _amount: 1,
        _type: 'refund',
        _description: 'Reembolso - Erro no serviço de IA'
      });
      
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty AI response');
    }

    // Parse JSON from AI response (handle markdown code blocks)
    let analysis: AIAnalysis;
    try {
      let jsonContent = content;
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonContent = content.replace(/```\n?/g, '');
      }
      analysis = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Create a default analysis based on the numbers
      const margin = parseFloat(profitMarginPercent);
      analysis = {
        viabilityScore: margin > 20 ? 'high' : margin > 10 ? 'medium' : 'low',
        viabilityMessage: margin > 20 ? 'Viagem com boa margem de lucro' : margin > 10 ? 'Margem de lucro moderada' : 'Margem de lucro baixa - considere renegociar',
        profitMargin: margin,
        alerts: margin < 10 ? ['Margem de lucro abaixo do recomendado'] : [],
        optimizationTips: ['Verifique postos de combustível na rota para melhores preços'],
        marketAnalysis: `Valor por km: R$ ${(routeData.totalFreightIncome / routeData.totalDistanceKm).toFixed(2)}`,
        summary: `Análise básica: Margem de ${profitMarginPercent}%`
      };
    }

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis,
      creditsUsed: 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in analyze-route-ai:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erro ao processar análise com IA'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
