import jsPDF from 'jspdf';

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface RoutePointLite {
  address: string;
  value?: number;
  weight?: number;
}

interface VehicleInfo {
  driverName?: string;
  licensePlate?: string;
  axles?: number;
  fuelConsumption?: number;
  fuelPrice?: number;
}

export interface TripSummaryExportData {
  vehicle: VehicleInfo;
  pickups: RoutePointLite[];
  deliveries: RoutePointLite[];
  totalFreight: number;
  estimatedDistanceKm?: number;
  includeReturn: boolean;
  returnDistanceKm: number;
  returnCost: number;
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
  suggestedFreightValue?: number;
  summary: string;
  roadRestrictions?: RoadRestriction[];
}

export interface DriverRouteExportData {
  vehicle: VehicleInfo;
  originCity?: string;
  destinationCity?: string;
  geocodedPoints?: { address: string; lat: number; lng: number }[];
  waypoints?: { address: string; lat: number; lng: number }[];
  totalDistanceKm: number;
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  driverCommissionCost: number;
  estimatedMaintenanceCost: number;
  estimatedFixedCost?: number;
  returnCost?: number;
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  aiAnalysis?: AIAnalysis;
  vehicleRestrictions?: { axles: number; warnings: string[] };
}

// ---------- Common PDF helpers ----------
class PdfBuilder {
  doc: jsPDF;
  y = 15;
  margin = 15;
  pageWidth: number;

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
  }

  ensureSpace(needed: number) {
    if (this.y + needed > 285) {
      this.doc.addPage();
      this.y = 15;
    }
  }

  header(title: string, subtitle?: string) {
    this.doc.setFillColor(37, 99, 235);
    this.doc.rect(0, 0, this.pageWidth, 22, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text('FreteCerto', this.margin, 10);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(title, this.margin, 17);
    if (subtitle) {
      this.doc.setFontSize(9);
      this.doc.text(subtitle, this.pageWidth - this.margin, 17, { align: 'right' });
    }
    this.doc.setTextColor(30, 41, 59);
    this.y = 30;
  }

  section(title: string) {
    this.ensureSpace(12);
    this.doc.setFillColor(241, 245, 249);
    this.doc.rect(this.margin, this.y - 4, this.pageWidth - 2 * this.margin, 8, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(title, this.margin + 2, this.y + 1.5);
    this.y += 8;
  }

  row(label: string, value: string, opts: { bold?: boolean; color?: [number, number, number] } = {}) {
    this.ensureSpace(6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(label, this.margin, this.y);
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    const c = opts.color ?? [30, 41, 59];
    this.doc.setTextColor(c[0], c[1], c[2]);
    this.doc.text(value, this.pageWidth - this.margin, this.y, { align: 'right' });
    this.y += 6;
  }

  paragraph(text: string, opts: { size?: number; color?: [number, number, number] } = {}) {
    const size = opts.size ?? 9;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(size);
    const c = opts.color ?? [51, 65, 85];
    this.doc.setTextColor(c[0], c[1], c[2]);
    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    for (const line of lines) {
      this.ensureSpace(size * 0.45 + 1);
      this.doc.text(line, this.margin, this.y);
      this.y += size * 0.45 + 1;
    }
    this.y += 2;
  }

  bullet(text: string, color: [number, number, number] = [51, 65, 85]) {
    const lines = this.doc.splitTextToSize('• ' + text, this.pageWidth - 2 * this.margin - 4);
    for (const line of lines) {
      this.ensureSpace(5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(color[0], color[1], color[2]);
      this.doc.text(line, this.margin + 2, this.y);
      this.y += 4.5;
    }
  }

  spacer(h = 3) {
    this.y += h;
  }

  footer() {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(
        `FreteCerto • ${new Date().toLocaleString('pt-BR')} • Página ${i}/${pageCount}`,
        this.pageWidth / 2,
        290,
        { align: 'center' },
      );
    }
  }

  save(filename: string) {
    this.footer();
    this.doc.save(filename);
  }
}

// ---------- Export 1: Trip summary (pre-calculation) ----------
export function exportTripSummaryPdf(data: TripSummaryExportData) {
  const pdf = new PdfBuilder();
  pdf.header('Resumo da Viagem', new Date().toLocaleDateString('pt-BR'));

  pdf.section('Dados do Veículo');
  pdf.row('Motorista', data.vehicle.driverName || '—');
  pdf.row('Placa', data.vehicle.licensePlate || '—');
  pdf.row('Eixos', String(data.vehicle.axles ?? '—'));
  pdf.row('Consumo médio', `${data.vehicle.fuelConsumption ?? '—'} km/L`);
  pdf.row('Preço combustível', BRL(data.vehicle.fuelPrice ?? 0));
  pdf.spacer();

  pdf.section('Coletas (Origem)');
  data.pickups.forEach((p, i) => {
    pdf.row(`${i + 1}. ${p.address || 'Não informado'}`,
      `${BRL(p.value || 0)}${p.weight ? ` • ${p.weight}t` : ''}`);
  });
  pdf.spacer();

  pdf.section('Entregas (Destino)');
  data.deliveries.forEach((d, i) => {
    pdf.row(`${i + 1}. ${d.address || 'Não informado'}`, BRL(d.value || 0));
  });
  pdf.spacer();

  pdf.section('Frete e Distância');
  pdf.row('Frete total estimado', BRL(data.totalFreight), { bold: true, color: [16, 185, 129] });
  if (data.estimatedDistanceKm) {
    pdf.row('Distância estimada (ida)', `${data.estimatedDistanceKm.toLocaleString('pt-BR')} km`);
  }
  pdf.spacer();

  if (data.includeReturn) {
    pdf.section('Retorno Vazio');
    pdf.row('Distância de retorno', `${data.returnDistanceKm.toLocaleString('pt-BR')} km`);
    pdf.row('Custo estimado', BRL(data.returnCost), { bold: true, color: [245, 158, 11] });
  }

  pdf.save(`resumo-viagem-${Date.now()}.pdf`);
}

// ---------- Export 2: Driver route (post AI) ----------
export function exportDriverRoutePdf(data: DriverRouteExportData, mapDataUrl?: string) {
  const pdf = new PdfBuilder();
  const subtitle = `${data.originCity ?? ''} → ${data.destinationCity ?? ''}`;
  pdf.header('Roteiro de Viagem para o Motorista', subtitle);

  // Executive summary
  pdf.section('Resumo Executivo');
  pdf.row('Motorista', data.vehicle.driverName || '—');
  pdf.row('Placa / Eixos', `${data.vehicle.licensePlate ?? '—'} • ${data.vehicle.axles ?? '—'} eixos`);
  pdf.row('Distância total', `${data.totalDistanceKm.toLocaleString('pt-BR')} km`);
  pdf.row('Duração estimada', `${data.totalDurationDays} dia(s) — ${data.totalDurationHours.toFixed(1)} h`);
  const viabilityLabel = data.viabilityScore === 'high' ? 'ALTA ✓' : data.viabilityScore === 'medium' ? 'MÉDIA ⚠' : 'BAIXA ✗';
  const viabilityColor: [number, number, number] =
    data.viabilityScore === 'high' ? [16, 185, 129] : data.viabilityScore === 'medium' ? [245, 158, 11] : [220, 38, 38];
  pdf.row('Viabilidade', viabilityLabel, { bold: true, color: viabilityColor });
  pdf.row('Lucro líquido', BRL(data.netProfit), {
    bold: true,
    color: data.netProfit >= 0 ? [16, 185, 129] : [220, 38, 38],
  });
  pdf.spacer();

  // Map image (if provided)
  if (mapDataUrl) {
    pdf.ensureSpace(90);
    pdf.section('Mapa da Rota');
    try {
      const w = pdf.pageWidth - 2 * pdf.margin;
      const h = 80;
      pdf.doc.addImage(mapDataUrl, 'PNG', pdf.margin, pdf.y, w, h);
      pdf.y += h + 4;
    } catch (e) {
      console.warn('Failed to embed map image', e);
    }
  }

  // Waypoints / route
  if (data.geocodedPoints?.length) {
    pdf.section('Pontos da Rota');
    data.geocodedPoints.forEach((p, i) => {
      const label = i === 0 ? 'Origem' : i === (data.geocodedPoints!.length - 1) ? 'Destino' : `Parada ${i}`;
      pdf.row(`${label}: ${p.address}`, `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
    });
    pdf.spacer();
  }

  if (data.waypoints?.length) {
    pdf.section('Pontos Intermediários (Ajuste Manual)');
    data.waypoints.forEach((w, i) => {
      pdf.row(`Ponto ${i + 1}`, `${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}`);
    });
    pdf.spacer();
  }

  // Cost breakdown
  pdf.section('Custos Detalhados');
  pdf.row('Receita bruta (frete)', BRL(data.totalFreightIncome), { bold: true, color: [37, 99, 235] });
  pdf.row('Combustível', BRL(data.estimatedFuelCost));
  pdf.row('Pedágios', BRL(data.estimatedTollCost));
  pdf.row('Comissão motorista', BRL(data.driverCommissionCost));
  pdf.row('Manutenção (variável)', BRL(data.estimatedMaintenanceCost));
  if (data.estimatedFixedCost) pdf.row('Custos fixos (rateio)', BRL(data.estimatedFixedCost));
  if (data.returnCost) pdf.row('Retorno vazio', BRL(data.returnCost));
  pdf.row('LUCRO LÍQUIDO', BRL(data.netProfit), {
    bold: true,
    color: data.netProfit >= 0 ? [16, 185, 129] : [220, 38, 38],
  });
  pdf.spacer();

  // Vehicle restrictions
  if (data.vehicleRestrictions?.warnings?.length) {
    pdf.section(`Restrições do Veículo (${data.vehicleRestrictions.axles} eixos)`);
    data.vehicleRestrictions.warnings.forEach((w) => pdf.bullet(w, [194, 65, 12]));
    pdf.spacer();
  }

  // AI Analysis
  if (data.aiAnalysis) {
    pdf.section('Análise por Inteligência Artificial');
    pdf.paragraph(data.aiAnalysis.summary || data.aiAnalysis.viabilityMessage, { size: 10 });

    if (data.aiAnalysis.marketAnalysis) {
      pdf.paragraph(`Mercado: ${data.aiAnalysis.marketAnalysis}`);
    }
    if (data.aiAnalysis.suggestedFreightValue) {
      pdf.row('Valor sugerido de frete', BRL(data.aiAnalysis.suggestedFreightValue), {
        bold: true,
        color: [37, 99, 235],
      });
    }

    if (data.aiAnalysis.alerts?.length) {
      pdf.spacer();
      pdf.section('⚠ Alertas');
      data.aiAnalysis.alerts.forEach((a) => pdf.bullet(a, [220, 38, 38]));
    }

    if (data.aiAnalysis.optimizationTips?.length) {
      pdf.spacer();
      pdf.section('💡 Dicas de Otimização');
      data.aiAnalysis.optimizationTips.forEach((t) => pdf.bullet(t, [180, 83, 9]));
    }

    if (data.aiAnalysis.roadRestrictions?.length) {
      pdf.spacer();
      pdf.section('🚫 Restrições de Trecho');
      data.aiAnalysis.roadRestrictions.forEach((r) => {
        pdf.bullet(`${r.road} — ${r.reason}${r.alternative ? ` (Alt.: ${r.alternative})` : ''}`, [194, 65, 12]);
      });
    }
  }

  pdf.save(`roteiro-motorista-${Date.now()}.pdf`);
}
