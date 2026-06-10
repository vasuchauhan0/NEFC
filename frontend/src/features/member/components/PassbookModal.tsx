import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  X, Download, Landmark, RefreshCw, ChevronLeft, ChevronRight,
  Printer, CheckCircle2, BookOpen, MoveDown, FileText
} from 'lucide-react';
import { Member, MemberInvestment } from '../../../shared/types/index.ts';
import { formatRupee } from '../../../shared/utils/index.ts';

interface PassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  company: {
    name: string;
    short: string;
    address: string;
    email: string;
    phone: string;
    website: string;
  };
}

export default function PassbookModal({ isOpen, onClose, member, company }: PassbookModalProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<boolean>(false);
  const [targetLine, setTargetLine] = useState<number>(1);
  const [linesPerPage] = useState<number>(12);

  const activeInvestments = member.investments || [];

  useEffect(() => {
    setSelectedEntries(new Set());
  }, [printMode, currentPage]);

  if (!isOpen) return null;

  const totalPages = 1 + activeInvestments.length;

  const totalRDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'rd') return sum + (inv.amount || 0) * (inv.paidMonths ? inv.paidMonths.length : 0);
    return sum;
  }, 0);
  const totalFDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'fd') return sum + (inv.amount || 0);
    return sum;
  }, 0);
  const totalDepositValue = totalRDPaid + totalFDPaid;

  // ── RD Transaction Generator ───────────────────────────────────────────────
  const getRDTransactions = (inv: MemberInvestment) => {
    const months = [...(inv.paidMonths || [])].sort();
    const day = inv.startDate ? inv.startDate.split('-')[2] || '01' : '01';
    return months.map((monthStr, index) => ({
      id: `${inv.id}-${monthStr}`,
      index: index + 1,
      particulars: `${index + 1}-${index + 1}`,
      date: `${monthStr}-${day}`.split('-').reverse().map((p, i) => i === 2 ? p.slice(2) : p).join('/'),
      monthLabel: new Date(monthStr + '-01').toLocaleString('default', { month: 'long' }),
      amount: inv.amount || 0,
      balance: (inv.amount || 0) * (index + 1),
      lateFees: '--',
      type: 'CR' as const,
    }));
  };

  const toggleEntry = (id: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearAll = () => setSelectedEntries(new Set());

  // ── Amount to Words (Indian system) ────────────────────────────────────────
  const numToWords = (n: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n === 0) return 'Zero';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ── PASSBOOK LINE PRINTER — NEFC Style (A5 Landscape, monospaced) ─────────
  // ══════════════════════════════════════════════════════════════════════════
  const handlePrintSelected = (inv: MemberInvestment) => {
    const txns = getRDTransactions(inv).filter(t => selectedEntries.has(t.id));
    if (txns.length === 0) {
      alert('Please select at least one entry row to print.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=620');
    if (!printWindow) return;

    // Build spacer rows to offset print head to targetLine
    let spacers = '';
    for (let i = 1; i < targetLine; i++) {
      spacers += `<tr class="pb-row spacer"><td colspan="6">&nbsp;</td></tr>`;
    }

    // Build data rows — bare monospaced text, zero decoration
    let dataRows = '';
    txns.forEach(t => {
      dataRows += `
        <tr class="pb-row data">
          <td class="c-date">${t.date}</td>
          <td class="c-part">${t.particulars}</td>
          <td class="c-month">${t.monthLabel}</td>
          <td class="c-late">${t.lateFees}</td>
          <td class="c-inst">${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="c-bal">${t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Passbook Print — ${inv.id}</title>
<style>
  /* ── Page Setup ── */
  @page {
    size: A5 landscape;
    margin: 10mm 6mm 6mm 6mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11.5px;
    color: #000;
    background: #fff;
    line-height: 1;
  }

  /* ── Screen-only toolbar (hidden on print) ── */
  .screen-bar {
    background: #0f172a;
    color: #f1f5f9;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: Arial, sans-serif;
    font-size: 12px;
    gap: 12px;
  }
  .screen-bar .info { display: flex; flex-direction: column; gap: 3px; }
  .screen-bar .info strong { font-size: 13px; color: #fff; }
  .screen-bar .info span { color: #94a3b8; font-size: 11px; }
  .screen-bar .meta-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 10.5px;
    font-family: 'Courier New', monospace;
  }
  .chip.amber { background: #451a03; border-color: #92400e; color: #fcd34d; }
  .btn-exec {
    background: #1d4ed8;
    color: white;
    border: none;
    padding: 8px 20px;
    font-weight: bold;
    font-size: 12px;
    border-radius: 6px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    white-space: nowrap;
  }
  .btn-exec:hover { background: #2563eb; }
  @media print { .screen-bar { display: none !important; } }

  /* ── Passbook table ── */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .pb-row { height: 8mm; }
  .pb-row td {
    padding: 0 3px;
    vertical-align: middle;
    white-space: nowrap;
    overflow: hidden;
  }

  /* Column widths tuned for physical A5-landscape booklet grid */
  .c-date  { width: 15%; text-align: left; }
  .c-part  { width: 10%; text-align: center; letter-spacing: 0.5px; }
  .c-month { width: 24%; text-align: left; }
  .c-late  { width: 11%; text-align: center; }
  .c-inst  { width: 20%; text-align: right; }
  .c-bal   { width: 20%; text-align: right; font-weight: bold; }
</style>
</head>
<body>

<!-- Screen-only toolbar -->
<div class="screen-bar">
  <div class="info">
    <strong>NEFC Passbook Line Printer</strong>
    <span>${company.name} &nbsp;|&nbsp; Contract: ${inv.id} &nbsp;|&nbsp; Member: ${member.name} (${member.id})</span>
  </div>
  <div class="meta-chips">
    <span class="chip">Scheme: ${inv.schemeId}</span>
    <span class="chip">Lines: ${txns.length} selected</span>
    <span class="chip amber">▼ Print head offset → Line ${targetLine}</span>
  </div>
  <button class="btn-exec" onclick="window.print()">🖨️ Execute Print Spool</button>
</div>

<!-- Bare passbook table — no borders, no headers, just aligned text -->
<table>
  <tbody>
    ${spacers}
    ${dataRows}
  </tbody>
</table>

</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ── COVER / MEMBER DETAILS PAGE — A5 Landscape ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const handlePrintCoverPage = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=620');
    if (!printWindow) return;

    const rdCount = activeInvestments.filter(i => i.schemeType === 'rd').length;
    const fdCount = activeInvestments.filter(i => i.schemeType === 'fd').length;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Member Passbook Cover — ${member.name}</title>
<style>
  @page { size: A5 landscape; margin: 12mm 12mm 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; background: #fff; }

  .no-print { background: #0f172a; color: #f1f5f9; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
  .no-print button { background: #1d4ed8; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 5px; cursor: pointer; font-size: 12px; }
  @media print { .no-print { display: none !important; } }

  /* Header band */
  .hdr { background: #0c2461; color: #fff; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
  .hdr-left h1 { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
  .hdr-left p  { font-size: 9px; color: #93c5fd; margin-top: 2px; }
  .hdr-right   { text-align: right; }
  .hdr-right .pb-tag { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); padding: 3px 10px; border-radius: 3px; font-size: 9px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; display: inline-block; }
  .hdr-right .pb-id { font-size: 10px; color: #bfdbfe; margin-top: 4px; }

  /* Body layout */
  .body { padding: 10px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* Info block */
  .info-block { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .info-block .ib-head { background: #1e293b; color: #fff; font-size: 9px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; padding: 5px 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .info-cell { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; }
  .info-cell:nth-child(even) { border-right: none; }
  .info-cell .lbl { font-size: 8.5px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; }
  .info-cell .val { font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 1px; }
  .info-cell .val.green { color: #16a34a; }

  /* Summary block */
  .sum-block { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .sum-block .sb-head { background: #1e293b; color: #fff; font-size: 9px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; padding: 5px 10px; }
  table.sum-tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.sum-tbl th { padding: 5px 8px; text-align: left; font-size: 9.5px; color: #475569; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
  table.sum-tbl th:not(:first-child) { text-align: right; }
  table.sum-tbl td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
  table.sum-tbl td:not(:first-child) { text-align: right; font-family: 'Courier New', monospace; }
  table.sum-tbl tr.total-row td { background: #f8fafc; font-weight: bold; color: #0c2461; font-size: 11.5px; border-top: 2px solid #cbd5e1; border-bottom: none; }

  /* Footer */
  .foot { padding: 8px 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
  .foot .seal { font-size: 9px; color: #94a3b8; }
  .foot .sig { text-align: right; font-size: 9px; color: #64748b; }
  .foot .sig strong { display: block; font-size: 10px; color: #0f172a; margin-bottom: 14px; border-bottom: 1px solid #0f172a; padding-bottom: 2px; width: 120px; }
</style>
</head>
<body>

<div class="no-print">
  <span><strong>NEFC — Member Passbook Cover Sheet</strong> &nbsp;|&nbsp; ${member.name} (${member.id})</span>
  <button onclick="window.print()">🖨️ Print Cover Sheet</button>
</div>

<!-- Header -->
<div class="hdr">
  <div class="hdr-left">
    <h1>${company.name}</h1>
    <p>${company.address}</p>
  </div>
  <div class="hdr-right">
    <div class="pb-tag">Member Passbook</div>
    <div class="pb-id">Issued: ${new Date().toLocaleDateString('en-IN')}</div>
  </div>
</div>

<!-- Body -->
<div class="body">

  <!-- Member info -->
  <div class="info-block">
    <div class="ib-head">Account Particulars</div>
    <div class="info-grid">
      <div class="info-cell"><div class="lbl">Account Holder</div><div class="val">${member.name}</div></div>
      <div class="info-cell"><div class="lbl">Member ID</div><div class="val">${member.id}</div></div>
      <div class="info-cell"><div class="lbl">Mobile</div><div class="val">${member.phone}</div></div>
      <div class="info-cell"><div class="lbl">Email</div><div class="val">${member.email}</div></div>
      <div class="info-cell"><div class="lbl">City</div><div class="val">${member.city}</div></div>
      <div class="info-cell"><div class="lbl">Member Since</div><div class="val">${member.memberSince || 'N/A'}</div></div>
      <div class="info-cell"><div class="lbl">Branch</div><div class="val">Mohan Nagar, Ghaziabad</div></div>
      <div class="info-cell"><div class="lbl">Status</div><div class="val green">${member.status.toUpperCase()}</div></div>
    </div>
  </div>

  <!-- Portfolio summary -->
  <div class="sum-block">
    <div class="sb-head">Portfolio Summary</div>
    <table class="sum-tbl">
      <thead>
        <tr>
          <th>Deposit Type</th>
          <th>Accounts</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Recurring Deposit (RD)</td>
          <td>${rdCount}</td>
          <td>₹ ${totalRDPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Fixed Deposit (FD)</td>
          <td>${fdCount}</td>
          <td>₹ ${totalFDPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="total-row">
          <td>Total Portfolio</td>
          <td>${activeInvestments.length}</td>
          <td>₹ ${totalDepositValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  </div>

</div>

<!-- Footer -->
<div class="foot">
  <div class="seal">
    Computer generated. Official copy. &nbsp;|&nbsp; ${company.name} &nbsp;|&nbsp; ${company.phone}
  </div>
  <div class="sig">
    <strong></strong>
    Authorised Signatory
  </div>
</div>

</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENEWAL RECEIPT SLIP — Matches old PHP NEFC site exactly ──────────────
  // ══════════════════════════════════════════════════════════════════════════
  const handlePrintReceipt = (inv: MemberInvestment, txn: ReturnType<typeof getRDTransactions>[number]) => {
    const printWindow = window.open('', '_blank', 'width=780,height=580');
    if (!printWindow) return;

    const amountInWords = numToWords(txn.amount) + ' Rupees Only';

    // Next installment date (+1 month)
    const [dd, mm, yy] = txn.date.split('/');
    const txnDate = new Date(`20${yy}-${mm}-${dd}`);
    txnDate.setMonth(txnDate.getMonth() + 1);
    const nextDateFormatted = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}-${String(txnDate.getDate()).padStart(2, '0')}`;

    const memberAddress = [member.name, member.city].filter(Boolean).join(', ');
    const depositDateFull = `20${yy}-${mm}-${dd}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Renewal Receipt — ${inv.id} — ${txn.monthLabel}</title>
<style>
  @page { size: A5; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }

  /* Screen toolbar */
  .no-print { background: #0f172a; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
  .no-print .np-info { color: #f1f5f9; font-size: 11px; }
  .no-print .np-info strong { color: #fff; font-size: 12px; }
  .no-print button { background: #ea580c; color: #fff; border: none; padding: 7px 18px; font-weight: bold; border-radius: 5px; cursor: pointer; font-size: 12px; }
  @media print { .no-print { display: none !important; } }

  .wrap { padding: 4px 0; }

  /* Title */
  .receipt-title {
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 2px;
    text-transform: uppercase;
    border-bottom: 2.5px solid #000;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  /* Two-col info rows */
  .row-2 { display: flex; gap: 0; margin-bottom: 5px; }
  .col { flex: 1; display: flex; gap: 0; }
  .lbl { font-weight: 700; font-size: 11.5px; white-space: nowrap; min-width: 110px; }
  .sep { font-weight: 700; padding: 0 4px; }
  .val { font-size: 12px; }

  /* Received from box */
  .recv-box { border: 1px solid #000; padding: 5px 8px; margin: 8px 0; font-size: 12px; }
  .recv-box .recv-lbl { font-weight: 700; margin-right: 4px; }

  /* Words row */
  .words-row { margin-bottom: 8px; font-size: 12px; }
  .words-row .wlbl { font-weight: 700; margin-right: 6px; }

  /* Detail table */
  table.dtbl { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 11.5px; }
  table.dtbl th { border: 1.5px solid #000; padding: 5px 8px; font-weight: 700; text-align: center; background: #f1f5f9; font-size: 11px; }
  table.dtbl td { border: 1px solid #444; padding: 5px 8px; text-align: center; }

  /* Footer */
  .receipt-footer { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; align-items: flex-end; }
  .rf-left .org-name { font-weight: bold; font-size: 12px; }
  .rf-left .org-sub  { color: #555; font-size: 10.5px; margin-top: 2px; }
  .rf-right { text-align: right; }
  .rf-right .sig-line { border-top: 1px solid #000; padding-top: 2px; margin-top: 20px; font-size: 10.5px; color: #333; width: 130px; display: inline-block; }

  /* Dashed cut line between copies */
  .cut-line { border-top: 1.5px dashed #aaa; margin: 14px 0; position: relative; }
  .cut-line::after { content: '✂ Office Copy'; position: absolute; top: -8px; right: 0; font-size: 9px; color: #888; background: #fff; padding: 0 4px; }
</style>
</head>
<body>

<div class="no-print">
  <div class="np-info">
    <strong>Renewal Receipt</strong> &nbsp;|&nbsp; ${inv.id} &nbsp;|&nbsp; ${txn.monthLabel} Installment #${txn.index}
  </div>
  <button onclick="window.print()">🖨️ Print Receipt</button>
</div>

<div class="wrap">

  <!-- ─── Customer Copy ─────────────────────────────────────────── -->
  <div class="receipt-title">Renewal Receipt</div>

  <div class="row-2">
    <div class="col">
      <span class="lbl">Issuing Branch</span><span class="sep">:</span><span class="val">Mohan Nagar</span>
    </div>
    <div class="col">
      <span class="lbl">Member ID</span><span class="sep">:</span><span class="val"><strong>${member.id}</strong></span>
    </div>
  </div>

  <div class="row-2">
    <div class="col" style="flex:2">
      <span class="lbl">Account No / Certificate No</span><span class="sep">:</span><span class="val"><strong>${inv.id}</strong></span>
    </div>
  </div>

  <div class="recv-box">
    <span class="recv-lbl">Received From :</span>${memberAddress}
  </div>

  <div class="words-row">
    <span class="wlbl">Deposit Amount (In Words) :</span><strong>${amountInWords}</strong>
  </div>

  <table class="dtbl">
    <thead>
      <tr>
        <th>Deposit Date</th>
        <th>Period</th>
        <th>Plan</th>
        <th>Premium No</th>
        <th>Amount (₹)</th>
        <th>Next Installment</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${depositDateFull}</td>
        <td>${inv.durationYears || 0} Year${(inv.durationYears || 0) > 1 ? 's' : ''}</td>
        <td>${inv.schemeId}</td>
        <td>${txn.index}-${txn.index}</td>
        <td><strong>${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
        <td>${nextDateFormatted}</td>
      </tr>
    </tbody>
  </table>

  <div class="receipt-footer">
    <div class="rf-left">
      <div class="org-name">${company.name}</div>
      <div class="org-sub">${company.address}</div>
    </div>
    <div class="rf-right">
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

  <!-- ─── Cut line → Office Copy ────────────────────────────────── -->
  <div class="cut-line"></div>

  <!-- ─── Office Copy (identical, compact) ─────────────────────── -->
  <div class="receipt-title" style="font-size:15px;margin-bottom:8px;">Renewal Receipt <span style="font-size:11px;font-weight:normal;letter-spacing:0;">(Office Copy)</span></div>

  <div class="row-2">
    <div class="col">
      <span class="lbl">Branch</span><span class="sep">:</span><span class="val">Mohan Nagar</span>
    </div>
    <div class="col">
      <span class="lbl">Member ID</span><span class="sep">:</span><span class="val"><strong>${member.id}</strong></span>
    </div>
  </div>
  <div class="row-2">
    <div class="col" style="flex:2">
      <span class="lbl">Certificate No</span><span class="sep">:</span><span class="val"><strong>${inv.id}</strong></span>
    </div>
  </div>
  <div class="recv-box" style="margin:5px 0;">
    <span class="recv-lbl">Received From :</span>${memberAddress}
  </div>
  <div class="words-row" style="margin-bottom:5px;">
    <span class="wlbl">Amount (In Words) :</span><strong>${amountInWords}</strong>
  </div>
  <table class="dtbl" style="margin:6px 0 8px;">
    <thead>
      <tr>
        <th>Deposit Date</th><th>Period</th><th>Plan</th><th>Premium No</th><th>Amount (₹)</th><th>Next Installment</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${depositDateFull}</td>
        <td>${inv.durationYears || 0} Yr${(inv.durationYears || 0) > 1 ? 's' : ''}</td>
        <td>${inv.schemeId}</td>
        <td>${txn.index}-${txn.index}</td>
        <td><strong>${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
        <td>${nextDateFormatted}</td>
      </tr>
    </tbody>
  </table>
  <div class="receipt-footer" style="margin-top:6px;">
    <div class="rf-left">
      <div class="org-name">${company.name}</div>
    </div>
    <div class="rf-right">
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

</div><!-- /wrap -->
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ── PDF STATEMENT ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PRIMARY = [12, 36, 97] as [number, number, number];
    const WHITE   = [255, 255, 255] as [number, number, number];
    const DARK    = [15, 23, 42] as [number, number, number];
    const GRAY    = [71, 85, 105] as [number, number, number];

    const drawHeader = () => {
      doc.setFillColor(...PRIMARY); doc.rect(0, 0, 210, 22, 'F');
      doc.setTextColor(...WHITE); doc.setFont('Helvetica', 'bold'); doc.setFontSize(13);
      doc.text(company.name.toUpperCase(), 14, 9);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`${company.address} | ${company.email} | ${company.phone}`, 14, 14);
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(8);
      doc.text('MEMBER PASSBOOK', 162, 13);
    };

    const drawFooter = (cur: number, tot: number) => {
      doc.setDrawColor(226, 232, 240); doc.line(15, 284, 196, 284);
      doc.setTextColor(...GRAY); doc.setFont('Helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text('Computer generated document. Official account ledger print balance copy.', 14, 289);
      doc.text(`Page ${cur} of ${tot}`, 183, 289);
    };

    drawHeader();
    doc.setFillColor(...PRIMARY); doc.rect(14, 30, 182, 22, 'F');
    doc.setTextColor(...WHITE); doc.setFont('Helvetica', 'bold'); doc.setFontSize(15);
    doc.text('OFFICIAL MEMBER PASSBOOK STATEMENT', 23, 44);
    doc.setFontSize(8); doc.setFont('Helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 23, 50);

    doc.setFillColor(241, 245, 249); doc.rect(14, 60, 182, 60, 'F');
    doc.setTextColor(...DARK); doc.setFont('Helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Member Name:', 20, 70); doc.setFont('Helvetica', 'normal'); doc.text(member.name, 55, 70);
    doc.setFont('Helvetica', 'bold'); doc.text('Member ID:', 110, 70); doc.setFont('Helvetica', 'normal'); doc.text(member.id, 140, 70);
    doc.setFont('Helvetica', 'bold'); doc.text('Email:', 20, 80); doc.setFont('Helvetica', 'normal'); doc.text(member.email, 55, 80);
    doc.setFont('Helvetica', 'bold'); doc.text('Phone:', 110, 80); doc.setFont('Helvetica', 'normal'); doc.text(member.phone, 140, 80);
    doc.setFont('Helvetica', 'bold'); doc.text('City:', 20, 90); doc.setFont('Helvetica', 'normal'); doc.text(member.city, 55, 90);
    doc.setFont('Helvetica', 'bold'); doc.text('Since:', 110, 90); doc.setFont('Helvetica', 'normal'); doc.text(member.memberSince || 'N/A', 140, 90);
    doc.setFont('Helvetica', 'bold'); doc.text('Status:', 20, 100); doc.setTextColor(16, 124, 65); doc.text(member.status.toUpperCase(), 55, 100);

    doc.setTextColor(...PRIMARY); doc.setFont('Helvetica', 'bold'); doc.setFontSize(10);
    doc.text('PORTFOLIO SUMMARY', 14, 138);
    doc.setFillColor(248, 250, 252); doc.rect(14, 143, 182, 45, 'F');
    doc.setDrawColor(226, 232, 240); doc.rect(14, 143, 182, 45, 'S');
    doc.setTextColor(...DARK); doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Total RD Paid:', 20, 153); doc.setFont('Helvetica', 'bold'); doc.text(`INR ${totalRDPaid.toLocaleString('en-IN')}.00`, 80, 153);
    doc.setFont('Helvetica', 'normal'); doc.text('Total FD Deposits:', 20, 163); doc.setFont('Helvetica', 'bold'); doc.text(`INR ${totalFDPaid.toLocaleString('en-IN')}.00`, 80, 163);
    doc.setDrawColor(226, 232, 240); doc.line(20, 169, 190, 169);
    doc.setTextColor(...PRIMARY); doc.setFont('Helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Total Accumulated:', 20, 177); doc.text(`INR ${totalDepositValue.toLocaleString('en-IN')}.00`, 125, 177);

    drawFooter(1, totalPages);

    activeInvestments.forEach((inv, idx) => {
      doc.addPage();
      drawHeader();
      const isRD = inv.schemeType === 'rd';
      const txns = isRD ? getRDTransactions(inv) : [
        { id: 'fd1', index: 1, particulars: '1-1', date: inv.startDate || '', monthLabel: '-', amount: inv.amount || 0, balance: inv.amount || 0, lateFees: '--', type: 'CR' as const }
      ];

      doc.setTextColor(...PRIMARY); doc.setFont('Helvetica', 'bold'); doc.setFontSize(10);
      doc.text(`LEDGER — CONTRACT: ${inv.id}`, 14, 30);
      doc.setFillColor(241, 245, 249); doc.rect(14, 33, 182, 20, 'F');
      doc.setTextColor(...DARK); doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Scheme: ${inv.schemeId}`, 18, 39); doc.text(`Type: ${isRD ? 'Recurring Deposit' : 'Fixed Deposit'}`, 70, 39);
      doc.text(`Amount: ${isRD ? `${formatRupee(inv.amount || 0)}/mo` : formatRupee(inv.amount || 0)}`, 130, 39);
      doc.text(`Rate: ${inv.interestPct?.toFixed(1) || '0.0'}% p.a.`, 18, 47);
      doc.text(`Start: ${inv.startDate}`, 70, 47);
      doc.text(`Maturity: ${inv.maturityDate}`, 130, 47);

      let y = 60;
      doc.setFillColor(...PRIMARY); doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(...WHITE); doc.setFont('Helvetica', 'bold'); doc.setFontSize(8);
      doc.text('Date', 18, y + 5); doc.text('Particular', 42, y + 5); doc.text('Month of', 65, y + 5);
      doc.text('Late Fees', 108, y + 5); doc.text('Installment', 132, y + 5); doc.text('Balance (CR)', 165, y + 5);
      y += 7;

      doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
      txns.forEach((t, i) => {
        if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(14, y, 182, 7, 'F'); }
        doc.setDrawColor(241, 245, 249); doc.line(14, y + 7, 196, y + 7);
        doc.setTextColor(...DARK);
        doc.text(t.date, 18, y + 5);
        doc.text(t.particulars, 42, y + 5);
        doc.text(t.monthLabel, 65, y + 5);
        doc.text(t.lateFees, 112, y + 5);
        doc.setFont('Helvetica', 'bold');
        doc.text(t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 132, y + 5);
        doc.setTextColor(16, 124, 65);
        doc.text(t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 165, y + 5);
        doc.setFont('Helvetica', 'normal'); doc.setTextColor(...DARK);
        y += 7;
      });

      drawFooter(2 + idx, totalPages);
    });

    doc.save(`Passbook_${member.name.replace(/\s+/g, '_')}_${member.id}.pdf`);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const currentInv = currentPage >= 2 ? activeInvestments[currentPage - 2] : null;
  const isCurrentRD = currentInv?.schemeType === 'rd';

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col shadow-2xl h-[94vh] border border-slate-200">

        {/* ── Top Toolbar ── */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-blue-700 p-1.5 rounded-lg"><BookOpen size={16} /></div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">{member.name}'s Passbook Terminal</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{company.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintMode(!printMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${printMode ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
            >
              <Printer size={13} /> {printMode ? 'Exit Print Settings' : 'Passbook Print Alignment Mode'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} /> Save PDF Statement
            </button>
            <button onClick={onClose} className="p-1.5 bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white rounded-xl cursor-pointer">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Print Configuration Panel ── */}
        {printMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {currentPage === 1 ? (
              <div className="text-xs text-amber-800 font-semibold flex items-center gap-2 w-full justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-amber-600" />
                  <span><strong>Cover Page Active:</strong> Insert Page 1 of the paper passbook booklet into the printer.</span>
                </div>
                <button
                  onClick={handlePrintCoverPage}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  🖨️ Print Cover Page
                </button>
              </div>
            ) : (
              currentInv && (
                <>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-amber-800">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MoveDown size={14} className="text-amber-600" />
                      <span>Select rows to print, then set the target line on the physical booklet:</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-sm">
                      <span className="font-bold text-amber-700">Target Line:</span>
                      <input
                        type="number" min={1} max={linesPerPage}
                        value={targetLine}
                        onChange={e => setTargetLine(parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-amber-50 border border-amber-300 rounded font-mono font-bold text-xs p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-[10px] text-slate-400">(max {linesPerPage})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded">{selectedEntries.size} Selected</span>
                    <button
                      onClick={() => handlePrintSelected(currentInv)}
                      disabled={selectedEntries.size === 0}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Printer size={12} /> Spool Print
                    </button>
                    <button onClick={clearAll} className="text-xs text-amber-600 hover:text-amber-800 font-bold underline cursor-pointer">Clear all</button>
                  </div>
                </>
              )
            )}
          </div>
        )}

        {/* ── Page Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col items-center p-4 gap-4">

          {/* Cover Page */}
          {currentPage === 1 && (
            <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#0c2461] text-white px-8 py-5 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight uppercase">{company.name}</h1>
                  <p className="text-xs text-blue-300 mt-0.5">{company.address}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 border border-white/30 px-3 py-1 rounded">Member Passbook</span>
                  <p className="text-[10px] text-blue-300 mt-2">Issued: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="px-8 py-5 grid grid-cols-2 gap-6">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 pb-1">Account Particulars</h2>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                      ['Account Holder', member.name],
                      ['Member ID', member.id],
                      ['Mobile', member.phone],
                      ['Email', member.email],
                      ['City', member.city],
                      ['Member Since', member.memberSince || 'N/A'],
                      ['Branch', 'Mohan Nagar, Gzb'],
                      ['Status', member.status.toUpperCase()],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">{label}</div>
                        <div className={`text-xs font-bold mt-0.5 ${label === 'Status' ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 pb-1">Portfolio Summary</h2>
                  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px]">
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">A/c</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-700">RD</td>
                        <td className="px-3 py-2 text-right font-mono">{activeInvestments.filter(i => i.schemeType === 'rd').length}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{formatRupee(totalRDPaid)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-700">FD</td>
                        <td className="px-3 py-2 text-right font-mono">{activeInvestments.filter(i => i.schemeType === 'fd').length}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">{formatRupee(totalFDPaid)}</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td className="px-3 py-2 text-slate-900">Total</td>
                        <td className="px-3 py-2 text-right font-mono">{activeInvestments.length}</td>
                        <td className="px-3 py-2 text-right font-mono text-[#0c2461]">{formatRupee(totalDepositValue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Investment Ledger Pages */}
          {currentPage > 1 && (() => {
            const inv = activeInvestments[currentPage - 2];
            if (!inv) return null;
            const isRD = inv.schemeType === 'rd';
            const txns = isRD ? getRDTransactions(inv) : [
              { id: 'fd1', index: 1, particulars: '1-1', date: inv.startDate || '', monthLabel: '-', amount: inv.amount || 0, balance: inv.amount || 0, lateFees: '--', type: 'CR' as const }
            ];

            return (
              <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {isRD ? <RefreshCw size={15} className="text-emerald-400" /> : <Landmark size={15} className="text-blue-400" />}
                      <span className="font-bold text-sm">{isRD ? 'Recurring Deposit Ledger' : 'Fixed Deposit Record'}</span>
                      <span className="text-slate-400 text-xs font-mono">• {inv.schemeId}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      Contract: {inv.id} &nbsp;|&nbsp; {inv.interestPct?.toFixed(1) || '0.0'}% p.a. &nbsp;|&nbsp; {inv.durationYears || 0} Year(s)
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{inv.startDate} → {inv.maturityDate}</div>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {isRD ? `${formatRupee(inv.amount || 0)}/month` : formatRupee(inv.amount || 0)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0c2461] text-white text-[11px] uppercase">
                        {printMode && isRD && <th className="px-3 py-3 w-10 text-center">✓</th>}
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Particular</th>
                        <th className="px-4 py-3 text-left">Installment for Month of</th>
                        <th className="px-4 py-3 text-center">Late Fees</th>
                        <th className="px-4 py-3 text-right">Installment</th>
                        <th className="px-4 py-3 text-right">Amount (CR)</th>
                        {isRD && <th className="px-3 py-3 text-center">Receipt</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t, i) => {
                        const isSelected = printMode && selectedEntries.has(t.id);
                        return (
                          <tr
                            key={t.id}
                            className={`border-b border-slate-100 transition-colors ${isSelected
                              ? 'bg-amber-50 border-l-4 border-l-amber-500 font-bold'
                              : i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'
                            } ${printMode && isRD ? 'cursor-pointer' : ''}`}
                            onClick={() => printMode && isRD && toggleEntry(t.id)}
                          >
                            {printMode && isRD && (
                              <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.has(t.id)}
                                  onChange={() => toggleEntry(t.id)}
                                  className="w-4 h-4 accent-amber-600 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 font-mono text-slate-600">{t.date}</td>
                            <td className="px-4 py-3 text-slate-700 font-mono">{t.particulars}</td>
                            <td className="px-4 py-3 text-blue-700 font-semibold">{t.monthLabel}</td>
                            <td className="px-4 py-3 text-center text-slate-400">{t.lateFees}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700">
                              {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                              {t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            {isRD && (
                              <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => handlePrintReceipt(inv, t)}
                                  title="Print Renewal Receipt"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 mx-auto whitespace-nowrap"
                                >
                                  <Printer size={10} /> Receipt
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    {isRD
                      ? <span>Paid: <strong>{inv.paidMonths?.length || 0}</strong> of <strong>{(inv.durationYears || 0) * 12}</strong> installments</span>
                      : <span>Fixed Term — {inv.durationYears || 0} Year Vault Lock</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Ledger Balance</div>
                    <div className="text-sm font-bold font-mono text-emerald-700">
                      {formatRupee(isRD ? (inv.amount || 0) * (inv.paidMonths?.length || 0) : (inv.amount || 0))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Bottom Pagination ── */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft size={15} />
            </button>
            <span className="px-3 font-bold font-mono text-white">Page {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="hidden sm:flex gap-2">
            {[{ label: 'Cover' }, ...activeInvestments.map(inv => ({ label: inv.schemeId }))].map((p, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${currentPage === i + 1 ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 size={11} className="text-emerald-500" />
            <span>Passbook Printer Ready</span>
          </div>
        </div>

      </div>
    </div>
  );
}