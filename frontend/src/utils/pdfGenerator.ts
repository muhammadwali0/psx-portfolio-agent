/**
 * PSX Portfolio Agent — PDF Report Generator
 * Creates institutional-grade portfolio reports using jsPDF.
 * Clean, minimal, professional typography. No images.
 */
import { jsPDF } from 'jspdf';
import type { AgentRun } from '../api/types';
import { mapSector } from './sectorMapper';

const GOLD = '#22C55E';
const BG = '#0B0B0C';
const TEXT = '#F8F9FA';
const MUTED = '#71717A';
const LINE = '#27272A';

function formatPKR(n: number): string {
  try {
    return `PKR ${(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  } catch {
    return `PKR ${n}`;
  }
}

function riskLabel(r: string): string {
  if (!r) return 'Medium';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export function generatePortfolioPDF(run: AgentRun): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210; // page width
  const margin = 20;
  const cw = pw - margin * 2; // content width
  let y = 0;

  const portfolio = run?.portfolio;
  const isShariah = !!portfolio?.shariah_compliant;
  // Conventional: Blue [59, 130, 246], Shariah: Gold [212, 175, 55]
  const primaryRGB: [number, number, number] = isShariah ? [212, 175, 55] : [59, 130, 246];

  // ── Page background ─────────────────────────────────────
  const setPageBg = () => {
    pdf.setFillColor(11, 11, 12);
    pdf.rect(0, 0, pw, 297, 'F');
  };
  setPageBg();

  // ── Header ──────────────────────────────────────────────
  y = 25;
  pdf.setFontSize(8);
  pdf.setTextColor(...primaryRGB);
  pdf.text('PSX PORTFOLIO AGENT', margin, y);
  pdf.setTextColor(113, 113, 122);
  pdf.text('AI Investment Report', pw - margin, y, { align: 'right' });
  
  y += 4;
  pdf.setDrawColor(39, 39, 42);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pw - margin, y);

  // ── Title ───────────────────────────────────────────────
  y += 12;
  pdf.setFontSize(20);
  pdf.setTextColor(248, 249, 250);
  pdf.text('Portfolio Report', margin, y);

  y += 8;
  pdf.setFontSize(9);
  pdf.setTextColor(113, 113, 122);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  pdf.text(`Generated: ${dateStr}`, margin, y);

  if (!portfolio) {
    y += 20;
    pdf.setFontSize(12);
    pdf.setTextColor(230, 57, 70);
    pdf.text('No active portfolio data available for this run.', margin, y);
    return pdf;
  }

  if (portfolio.shariah_compliant) {
    pdf.setTextColor(...primaryRGB);
    pdf.text('Shariah Compliant', pw - margin, y, { align: 'right' });
  }

  // ── Summary Section ─────────────────────────────────────
  y += 14;
  pdf.setFontSize(10);
  pdf.setTextColor(...primaryRGB);
  pdf.text('PORTFOLIO SUMMARY', margin, y);

  y += 3;
  pdf.setDrawColor(...primaryRGB);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin + 30, y);

  y += 8;
  const totalCapital = portfolio.total_capital_pkr ?? 0;
  const investmentMode = portfolio.investment_mode ?? 'fundamental';
  const overallRisk = portfolio.overall_risk ?? 'medium';
  const positions = portfolio.positions || [];
  const cashPct = portfolio.cash_pct ?? 0;

  const summaryData: [string, string][] = [
    ['Total Capital', formatPKR(totalCapital)],
    ['Investment Mode', investmentMode.charAt(0).toUpperCase() + investmentMode.slice(1)],
    ['Overall Risk', riskLabel(overallRisk)],
    ['Positions', String(positions.length)],
    ['Cash Reserve', `${cashPct.toFixed(1)}%`],
  ];
  if (portfolio.expected_return_pct != null) {
    summaryData.push(['Expected Return', `${portfolio.expected_return_pct.toFixed(1)}%`]);
  }
  if (portfolio.sharpe_ratio != null) {
    summaryData.push(['Sharpe Ratio', portfolio.sharpe_ratio.toFixed(2)]);
  }

  pdf.setFontSize(9);
  const colW = cw / 2;
  summaryData.forEach(([label, val], i) => {
    const col = i % 2;
    const x = margin + col * colW;
    if (col === 0 && i > 0) y += 7;
    pdf.setTextColor(113, 113, 122);
    pdf.text(label, x, y);
    pdf.setTextColor(248, 249, 250);
    pdf.text(val, x + 45, y);
  });

  // ── Allocation Table ────────────────────────────────────
  y += 16;
  pdf.setFontSize(10);
  pdf.setTextColor(...primaryRGB);
  pdf.text('ALLOCATION BREAKDOWN', margin, y);

  y += 3;
  pdf.setDrawColor(...primaryRGB);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin + 38, y);

  // Table header
  y += 8;
  pdf.setFontSize(7);
  pdf.setTextColor(113, 113, 122);
  const cols = [margin, margin + 22, margin + 55, margin + 80, margin + 100, margin + 125, margin + 148];
  const headers = ['Ticker', 'Sector', 'Alloc %', 'Capital', 'Entry', 'Stop Loss', 'Target'];
  headers.forEach((h, i) => pdf.text(h, cols[i], y));

  y += 2;
  pdf.setDrawColor(39, 39, 42);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pw - margin, y);

  // Table rows
  pdf.setFontSize(8);
  positions.forEach((pos) => {
    y += 6;
    if (y > 270) {
      pdf.addPage();
      setPageBg();
      y = 25;
    }

    const ticker = pos.ticker ?? 'N/A';
    const sector = mapSector(pos.sector) ?? 'N/A';
    const allocation = pos.allocation_pct ?? 0;
    const capital = pos.capital_pkr ?? 0;
    const entry = pos.entry_price ?? 0;
    const stopLoss = pos.stop_loss;
    const targetPrice = pos.target_price;

    pdf.setTextColor(248, 249, 250);
    pdf.text(ticker, cols[0], y);
    pdf.setTextColor(161, 161, 170);
    pdf.text(sector.substring(0, 14), cols[1], y);
    pdf.setTextColor(248, 249, 250);
    pdf.text(`${allocation.toFixed(1)}%`, cols[2], y);
    pdf.text(formatPKR(capital), cols[3], y);
    pdf.text(`₨${entry.toFixed(0)}`, cols[4], y);
    pdf.setTextColor(230, 57, 70);
    pdf.text(stopLoss != null ? `₨${stopLoss.toFixed(0)}` : '—', cols[5], y);
    pdf.setTextColor(0, 196, 140);
    pdf.text(targetPrice != null ? `₨${targetPrice.toFixed(0)}` : '—', cols[6], y);
  });

  // ── Risk Profile ────────────────────────────────────────
  y += 14;
  if (y > 260) {
    pdf.addPage();
    setPageBg();
    y = 25;
  }
  pdf.setFontSize(10);
  pdf.setTextColor(...primaryRGB);
  pdf.text('RISK PROFILE', margin, y);
  y += 3;
  pdf.setDrawColor(...primaryRGB);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin + 22, y);

  y += 8;
  pdf.setFontSize(9);
  pdf.setTextColor(113, 113, 122);
  pdf.text('Overall Risk:', margin, y);
  const riskColors: Record<string, [number, number, number]> = {
    low: [0, 196, 140],
    medium: [251, 191, 36],
    high: [230, 57, 70],
  };
  pdf.setTextColor(...(riskColors[overallRisk] || riskColors.medium));
  pdf.text(riskLabel(overallRisk), margin + 30, y);

  y += 7;
  pdf.setTextColor(113, 113, 122);
  pdf.text('Cash Reserve:', margin, y);
  pdf.setTextColor(248, 249, 250);
  pdf.text(`${cashPct.toFixed(1)}%`, margin + 30, y);

  // ── AI Reasoning ────────────────────────────────────────
  if (run?.gemini_reasoning) {
    y += 14;
    if (y > 250) {
      pdf.addPage();
      setPageBg();
      y = 25;
    }
    pdf.setFontSize(10);
    pdf.setTextColor(...primaryRGB);
    pdf.text('AI REASONING', margin, y);
    y += 3;
    pdf.setDrawColor(...primaryRGB);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 22, y);

    y += 8;
    pdf.setFontSize(7.5);
    pdf.setTextColor(161, 161, 170);
    const reasoningLines = pdf.splitTextToSize(run.gemini_reasoning, cw);
    reasoningLines.slice(0, 40).forEach((line: string) => {
      if (y > 280) {
        pdf.addPage();
        setPageBg();
        y = 25;
      }
      pdf.text(line, margin, y);
      y += 4;
    });
  }

  // ── Disclaimer ──────────────────────────────────────────
  y += 10;
  if (y > 270) {
    pdf.addPage();
    setPageBg();
    y = 25;
  }
  pdf.setDrawColor(39, 39, 42);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pw - margin, y);

  y += 6;
  pdf.setFontSize(6);
  pdf.setTextColor(82, 82, 91);
  const disclaimer = 'DISCLAIMER: This report is generated by an AI system and is for informational purposes only. It does not constitute financial advice. Past performance is not indicative of future results. Always consult a qualified financial advisor before making investment decisions. PSX Portfolio Agent is a hackathon project and not a licensed financial advisory service.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, cw);
  disclaimerLines.forEach((line: string) => {
    pdf.text(line, margin, y);
    y += 3.5;
  });

  // ── Footer ──────────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(6);
    pdf.setTextColor(82, 82, 91);
    pdf.text(`PSX Portfolio Agent • AI Investment Intelligence`, margin, 290);
    pdf.text(`Page ${i} of ${totalPages}`, pw - margin, 290, { align: 'right' });
  }

  return pdf;
}
