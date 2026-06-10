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

interface PrintConfig {
  startTxn: number;
  endTxn: number;
  startLine: number;
}

export default function PassbookModal({ isOpen, onClose, member, company }: PassbookModalProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<boolean>(false);
  
  // Manual Line Spacing Configurations
  const [targetLine, setTargetLine] = useState<number>(1);
  const [linesPerPage, setLinesPerPage] = useState<number>(12);

  const activeInvestments = member.investments || [];

  // Reset selections when turning print mode on/off
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
      particulars: `Monthly Installment #${index + 1}`,
      date: `${monthStr}-${day}`.split('-').reverse().map((p, i) => i === 2 ? p.slice(2) : p).join('/'), // Converts to DD/MM/YY
      monthLabel: new Date(monthStr + '-01').toLocaleString('default', { month: 'long' }),
      amount: inv.amount || 0,
      balance: (inv.amount || 0) * (index + 1),
      lateFees: '--',
      type: 'CR'
    }));
  };

  const toggleEntry = (id: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (inv: MemberInvestment) => {
    const txns = getRDTransactions(inv);
    setSelectedEntries(new Set(txns.map(t => t.id)));
  };

  const clearAll = () => setSelectedEntries(new Set());

  // ── BARE TEXT LINE-PRINTER ENGINE ──────────────────────────────────────────
  const handlePrintSelected = (inv: MemberInvestment) => {
    const txns = getRDTransactions(inv).filter(t => selectedEntries.has(t.id));
    if (txns.length === 0) {
      alert('Please select at least one entry row line to print.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=850,height=600');
    if (!printWindow) return;

    // Inject exact empty spacers to drop the printer head down to your selected row line
    let dynamicRowsHtml = '';
    for (let i = 1; i < targetLine; i++) {
      dynamicRowsHtml += `<tr class="passbook-line-row empty-spacer"><td colspan="6"></td></tr>`;
    }

    // Build raw text columns (No borders, background boxes, or styling headers)
    txns.forEach(t => {
      dynamicRowsHtml += `
        <tr class="passbook-line-row raw-text-data">
          <td class="cell-date">${t.date}</td>
          <td class="cell-part">${t.index}-${t.index}</td>
          <td class="cell-month">${t.monthLabel}</td>
          <td class="cell-late">${t.lateFees}</td>
          <td class="cell-inst">${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="cell-bal">${t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    const outputHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A5 landscape; margin: 12mm 6mm 6mm 6mm; }
  body { 
    margin: 0; 
    padding: 0; 
    font-family: 'Courier New', Courier, monospace; /* Demanded for accurate column grids on physical printers */
    font-size: 11px; 
    color: #000;
    background: #fff;
  }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .passbook-line-row { height: 8mm; } /* Matches passbook line spacing bounds */
  td { padding: 0 4px; vertical-align: bottom; white-space: nowrap; overflow: hidden; }
  
  /* Perfect Booklet Alignments */
  .cell-date  { width: 16%; }
  .cell-part  { width: 12%; text-align: center; }
  .cell-month { width: 22%; }
  .cell-late  { width: 12%; text-align: center; }
  .cell-inst  { width: 19%; text-align: right; }
  .cell-bal   { width: 19%; text-align: right; font-weight: bold; }
  
  .no-print-bar { background: #f1f5f9; padding: 12px; border-bottom: 1px solid #cbd5e1; font-family: sans-serif; display: flex; justify-content: space-between; align-items: center; }
  .btn-print { background: #1e3a8a; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
  @media print { .no-print-bar { display: none !important; } }
</style>
</head>
<body>
  <div class="no-print-bar">
    <span><strong>Bare-Metal Passbook Printer Engine:</strong> Document will print directly on Line ${targetLine}.</span>
    <button class="btn-print" onclick="window.print()">Execute Print Spool</button>
  </div>
  <table>
    <tbody>
      ${dynamicRowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    printWindow.document.write(outputHtml);
    printWindow.document.close();
    printWindow.focus();
  };

  // ── PASSBOOK FIRST SHEET COVER SHEET PRINT ENGINE ─────────────────────────
  const handlePrintCoverPage = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=600');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: A5 landscape; margin: 10mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; }
  .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: bold; color: #1e3a8a; margin: 0; }
  .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
  .value { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
  .btn-box { background: #f1f5f9; padding: 10px; display: flex; justify-content: flex-end; }
  @media print { .btn-box { display: none !important; } }
</style>
</head>
<body>
  <div class="btn-box"><button style="padding:6px 14px; background:#1e3a8a; color:white; border:none; font-weight:bold; cursor:pointer;" onclick="window.print()">Print Cover Sheet</button></div>
  <div class="header">
    <div class="title">${company.name.toUpperCase()}</div>
    <div class="subtitle">${company.address}</div>
  </div>
  <div style="font-size:14px; font-weight:bold; margin-bottom:12px; text-decoration: underline;">MEMBER ACCOUNT PARTICULARS</div>
  <div class="grid">
    <div><div class="label">Account Holder</div><div class="value">${member.name}</div></div>
    <div><div class="label">Member Unique ID</div><div class="value">${member.id}</div></div>
    <div><div class="label">Mobile Phone</div><div class="value">${member.phone}</div></div>
    <div><div class="label">Email Address</div><div class="value">${member.email}</div></div>
    <div><div class="label">Registrant City</div><div class="value">${member.city}</div></div>
    <div><div class="label">Member Since</div><div class="value">${member.memberSince || 'N/A'}</div></div>
    <div><div class="label">Bylaws Branch</div><div class="value">Mohan Nagar, Ghaziabad</div></div>
    <div><div class="label">Account Status</div><div class="value" style="color:#15803d">${member.status.toUpperCase()}</div></div>
  </div>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  // ── RENEWAL RECEIPT SLIP PRINTER (matches old PHP site) ───────────────────
  const handlePrintReceipt = (inv: MemberInvestment, txn: ReturnType<typeof getRDTransactions>[number]) => {
    const printWindow = window.open('', '_blank', 'width=750,height=550');
    if (!printWindow) return;

    // Convert amount to words (supports up to lakhs)
    const numToWords = (n: number): string => {
      const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
        'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
      const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+numToWords(n%100) : '');
      if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+numToWords(n%1000) : '');
      return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+numToWords(n%100000) : '');
    };

    const amountInWords = numToWords(txn.amount) + ' Rupees';
    const address = member.city || '';
    const memberDisplay = member.name + (address ? `, ${address}` : '');

    // Calculate next installment date from txn date (add 1 month)
    const [dd, mm, yy] = txn.date.split('/');
    const txnDateObj = new Date(`20${yy}-${mm}-${dd}`);
    txnDateObj.setMonth(txnDateObj.getMonth() + 1);
    const nextDate = `${String(txnDateObj.getDate()).padStart(2,'0')}/${String(txnDateObj.getMonth()+1).padStart(2,'0')}/${String(txnDateObj.getFullYear()).slice(2)}`;
    const nextDateFull = `${txnDateObj.getFullYear()}-${String(txnDateObj.getMonth()+1).padStart(2,'0')}-${String(txnDateObj.getDate()).padStart(2,'0')}`;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Renewal Receipt - ${inv.id}</title>
<style>
  @page { size: A5; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #000; background: #fff; margin: 0; padding: 0; }

  .no-print { background: #1e3a8a; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
  .no-print span { color: #fff; font-size: 12px; font-weight: bold; }
  .no-print button { background: #f97316; color: #fff; border: none; padding: 6px 18px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; }
  @media print { .no-print { display: none !important; } }

  .receipt-wrap { padding: 6px 0; }

  .renewal-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 14px; letter-spacing: 1px; border-bottom: 2px solid #000; padding-bottom: 8px; }

  table.info { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.info td { padding: 4px 6px; font-size: 13px; vertical-align: top; }
  table.info td.label { font-weight: 600; width: 40%; }
  table.info td.colon { width: 4%; }

  .received-box { border: 1px solid #000; padding: 5px 8px; margin-bottom: 8px; font-size: 13px; }
  .received-box .rlabel { font-weight: 600; display: inline; }

  table.details { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.details th { border: 1px solid #000; padding: 5px 8px; font-size: 12px; font-weight: 700; text-align: center; background: #f1f5f9; }
  table.details td { border: 1px solid #000; padding: 5px 8px; font-size: 13px; text-align: center; }

  .footer-row { display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; }
  .footer-row .org { font-weight: 600; }
  .footer-row .auth { text-align: right; font-size: 11px; color: #555; }
</style>
</head>
<body>
<div class="no-print">
  <span>📄 Renewal Receipt — ${inv.id} &nbsp;|&nbsp; ${txn.monthLabel} Installment</span>
  <button onclick="window.print()">🖨️ Print Receipt</button>
</div>

<div class="receipt-wrap">
  <div class="renewal-title">RENEWAL RECEIPT</div>

  <table class="info">
    <tr>
      <td class="label">Issuing Branch</td>
      <td class="colon">:</td>
      <td>Mohan Nagar</td>
      <td class="label" style="text-align:right;padding-right:6px;">Member ID</td>
      <td class="colon">:</td>
      <td><strong>${member.id}</strong></td>
    </tr>
    <tr>
      <td class="label">Account No / Certificate No</td>
      <td class="colon">:</td>
      <td colspan="4"><strong>${inv.id}</strong></td>
    </tr>
  </table>

  <div class="received-box">
    <span class="rlabel">Received From: </span>
    ${memberDisplay}
  </div>

  <table class="info">
    <tr>
      <td class="label">Deposit Amount (In Words)</td>
      <td class="colon">:</td>
      <td colspan="4"><strong>${amountInWords}</strong></td>
    </tr>
  </table>

  <table class="details">
    <thead>
      <tr>
        <th>Deposit Date</th>
        <th>Period</th>
        <th>Plan</th>
        <th>Premium No</th>
        <th>Amount</th>
        <th>Next Installment</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${txn.date.split('/').reverse().map((p,i)=>i===0?'20'+p:p).join('-')}</td>
        <td>${inv.durationYears || 0} Year${(inv.durationYears||0)>1?'s':''}</td>
        <td>${inv.schemeId}</td>
        <td>${txn.index}-${txn.index}</td>
        <td>₹${txn.amount.toLocaleString('en-IN')}</td>
        <td>${nextDateFull}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-row">
    <div class="org">${company.name}</div>
    <div class="auth">Authorised Signatory</div>
  </div>
</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
  };

  // ─── PDF STATEMENT LOG GENERATOR ──────────────────────────────────────────
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PRIMARY = [14, 99, 166] as [number, number, number];
    const WHITE = [255, 255, 255] as [number, number, number];
    const DARK = [15, 23, 42] as [number, number, number];
    const GRAY = [71, 85, 105] as [number, number, number];

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
    doc.text(`Generated Statement Copy: ${new Date().toLocaleDateString('en-IN')}`, 23, 50);

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
        { id: 'fd1', index: 1, particulars: 'Opening Deposit', date: inv.startDate || '', monthLabel: '-', amount: inv.amount || 0, balance: inv.amount || 0, lateFees: '--', type: 'CR' as const }
      ];

      doc.setTextColor(...PRIMARY); doc.setFont('Helvetica', 'bold'); doc.setFontSize(10);
      doc.text(`LEDGER - CONTRACT: ${inv.id}`, 14, 30);
      doc.setFillColor(241, 245, 249); doc.rect(14, 33, 182, 20, 'F');
      doc.setTextColor(...DARK); doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Scheme: ${inv.schemeId}`, 18, 39); doc.text(`Type: ${isRD ? 'Recurring Deposit' : 'Fixed Deposit'}`, 70, 39);
      doc.text(`Amount: ${isRD ? `${formatRupee(inv.amount || 0)}/mo` : formatRupee(inv.amount || 0)}`, 130, 39);
      doc.text(`Rate: ${inv.interestPct?.toFixed(1) || '0.0'}% p.a.`, 18, 47); doc.text(`Start: ${inv.startDate}`, 70, 47); doc.text(`Maturity: ${inv.maturityDate}`, 130, 47);

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

    doc.save(`Passbook_Statement_${member.name.replace(/\s+/g, '_')}.pdf`);
  };

  // ─── RENDER DETECTS ────────────────────────────────────────────────────────
  const currentInv = currentPage >= 2 ? activeInvestments[currentPage - 2] : null;
  const isCurrentRD = currentInv?.schemeType === 'rd';
  const paidCount = currentInv?.paidMonths?.length || 0;

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col shadow-2xl h-[94vh] border border-slate-200">
        
        {/* Top Toolbar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg"><BookOpen size={16} /></div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">{member.name}'s Passbook Terminal</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{company.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPrintMode(!printMode)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${printMode ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>
              <Printer size={13} /> {printMode ? 'Exit Print Settings' : 'Passbook Print Alignment Mode'}
            </button>
            <button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Download size={13} /> Save PDF Statement
            </button>
            <button onClick={onClose} className="p-1.5 bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white rounded-xl cursor-pointer">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Print Configuration Alignment Settings Panel ── */}
        {printMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {currentPage === 1 ? (
              <div className="text-xs text-amber-800 font-semibold flex items-center gap-2 w-full justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-amber-600" />
                  <span><strong>Member Profile Page Active:</strong> Put Page 1 of the paper booklet inside the machine.</span>
                </div>
                <button onClick={handlePrintCoverPage} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm">
                  🖨️ Print Member Details Page
                </button>
              </div>
            ) : (
              currentInv && (
                <>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-amber-800">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MoveDown size={14} className="text-amber-600" />
                      <span>Check the row to print below, then set the alignment slot target line:</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-sm">
                      <span className="font-bold text-amber-700">Target Page Line:</span>
                      <input 
                        type="number" min={1} max={linesPerPage}
                        value={targetLine}
                        onChange={e => setTargetLine(parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-amber-50 border border-amber-300 rounded font-mono font-bold text-xs p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-[10px] text-slate-400">(Max space lines: {linesPerPage})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded">{selectedEntries.size} Selected Row</span>
                    <button 
                      onClick={() => handlePrintSelected(currentInv)}
                      disabled={selectedEntries.size === 0}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Printer size={12} /> Spool Print Target Line
                    </button>
                    <button onClick={clearAll} className="text-xs text-amber-600 hover:text-amber-800 font-bold underline cursor-pointer">Clear row selections</button>
                  </div>
                </>
              )
            )}
          </div>
        )}

        {/* Core Sheet Body View */}
        <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col items-center p-4 gap-4">

          {/* Cover page layout preview framework */}
          {currentPage === 1 && (
            <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-blue-700 text-white px-8 py-5">
                <h1 className="text-xl font-bold tracking-tight">{company.name.toUpperCase()}</h1>
                <p className="text-xs text-blue-200 mt-0.5">{company.address}</p>
                <div className="mt-3 inline-block bg-white/20 px-3 py-1 rounded text-xs font-bold tracking-widest">MEMBER PASSBOOK</div>
              </div>

              <div className="px-8 py-5">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5">
                  {[
                    ['Account Holder', member.name],
                    ['Member ID', member.id],
                    ['Email', member.email],
                    ['Phone', member.phone],
                    ['City', member.city],
                    ['Member Since', member.memberSince || 'N/A'],
                    ['Branch', 'Mohan Nagar, Ghaziabad'],
                    ['Status', member.status.toUpperCase()],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{label}</div>
                      <div className={`text-sm font-bold mt-0.5 ${label === 'Status' ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs">
                      <th className="px-4 py-2.5 text-left">Deposit Type</th>
                      <th className="px-4 py-2.5 text-right">Accounts</th>
                      <th className="px-4 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-700">Recurring Deposit (RD)</td>
                      <td className="px-4 py-3 text-right font-mono">{activeInvestments.filter(i=>i.schemeType==='rd').length}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatRupee(totalRDPaid)}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-700">Fixed Deposit (FD)</td>
                      <td className="px-4 py-3 text-right font-mono">{activeInvestments.filter(i=>i.schemeType==='fd').length}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{formatRupee(totalFDPaid)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3 text-slate-900">Total Balance</td>
                      <td className="px-4 py-3 text-right font-mono">{activeInvestments.length}</td>
                      <td className="px-4 py-3 text-right font-mono text-blue-800 text-base">{formatRupee(totalDepositValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Investment account sheets mapping */}
          {currentPage > 1 && (() => {
            const inv = activeInvestments[currentPage - 2];
            if (!inv) return null;
            const isRD = inv.schemeType === 'rd';
            const txns = isRD ? getRDTransactions(inv) : [
              { id: 'fd1', index: 1, particulars: 'Opening Deposit Principal Log', date: inv.startDate || '', monthLabel: '-', amount: inv.amount || 0, balance: inv.amount || 0, lateFees: '--', type: 'CR' as const }
            ];

            return (
              <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {isRD ? <RefreshCw size={15} className="text-emerald-400" /> : <Landmark size={15} className="text-blue-400" />}
                      <span className="font-bold text-sm">{isRD ? 'Recurring Deposit Ledger' : 'Fixed Deposit Asset Record'}</span>
                      <span className="text-slate-400 text-xs font-mono">• {inv.schemeId}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">Contract: {inv.id} &nbsp;|&nbsp; {inv.interestPct?.toFixed(1) || '0.0'}% p.a. &nbsp;|&nbsp; {inv.durationYears || 0} Year(s)</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{inv.startDate} → {inv.maturityDate}</div>
                    <div className="font-mono font-bold text-white mt-0.5">{isRD ? `${formatRupee(inv.amount || 0)}/month` : formatRupee(inv.amount || 0)}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px] uppercase">
                        {printMode && isRD && <th className="px-3 py-3 w-12 text-center">Select</th>}
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Particular</th>
                        <th className="px-4 py-3 text-left">Installment for the Month of</th>
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
                            className={`border-b border-slate-100 transition-colors ${
                              isSelected
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
                            <td className="px-4 py-3 text-slate-800 font-semibold">{t.particulars}</td>
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
                    {isRD ? (
                      <span>Paid: <strong>{inv.paidMonths?.length || 0}</strong> of <strong>{(inv.durationYears || 0) * 12}</strong> installments</span>
                    ) : (
                      <span>Asset Term Frame — {inv.durationYears || 0} Year Vault Lock</span>
                    )}
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

        {/* Bottom Pagination controls */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft size={15} />
            </button>
            <span className="px-3 font-bold font-mono text-white">Page {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="hidden sm:flex gap-2">
            {[{ label: 'Cover' }, ...activeInvestments.map((inv) => ({ label: inv.schemeId }))].map((p, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 size={11} className="text-emerald-500" />
            <span>Hardware Terminal Alignment Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}