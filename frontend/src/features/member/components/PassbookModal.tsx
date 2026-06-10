import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, Download, FileText, Landmark, RefreshCw, ChevronLeft, ChevronRight, 
  Printer, Calendar, BookOpen, CheckCircle2, Printer as PrinterIcon
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
  const activeInvestments = member.investments || [];

  if (!isOpen) return null;

  const totalPages = 1 + activeInvestments.length;

  const totalRDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'rd') return sum + inv.amount * (inv.paidMonths ? inv.paidMonths.length : 0);
    return sum;
  }, 0);

  const totalFDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'fd') return sum + inv.amount;
    return sum;
  }, 0);

  const totalDepositValue = totalRDPaid + totalFDPaid;

  const getRDTransactions = (inv: MemberInvestment) => {
    const paidMonths = [...(inv.paidMonths || [])].sort();
    const startDay = inv.startDate ? inv.startDate.split('-')[2] || '01' : '01';
    return paidMonths.map((monthStr, index) => ({
      id: `${inv.id}-${monthStr}`,
      index: index + 1,
      particular: `${index + 1}-${index + 1}`,
      date: `${monthStr}-${startDay}`,
      monthLabel: new Date(monthStr + '-01').toLocaleString('default', { month: 'long' }),
      amount: inv.amount,
      balance: inv.amount * (index + 1),
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
    setSelectedEntries(prev => {
      const next = new Set(prev);
      txns.forEach(t => next.add(t.id));
      return next;
    });
  };

  const clearAll = () => setSelectedEntries(new Set());

  const handlePrintSelected = (inv: MemberInvestment) => {
    const txns = getRDTransactions(inv).filter(t => selectedEntries.has(t.id));
    if (txns.length === 0) {
      alert('Please select at least one entry to print.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>Passbook Entry - ${member.name}</title>
        <style>
          @page { size: 210mm 99mm; margin: 3mm 4mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 10px; color: #000; background: #fff; margin: 0; padding: 0; }
          .header { border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header-left h2 { font-size: 12px; font-weight: bold; margin: 0; letter-spacing: 0.5px; }
          .header-left p { font-size: 8px; margin: 1px 0 0; color: #333; }
          .header-right { text-align: right; font-size: 8px; }
          .member-info { display: flex; gap: 16px; margin-bottom: 4px; font-size: 9px; border-bottom: 0.5px dashed #999; padding-bottom: 3px; }
          .member-info span { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          thead tr { background: #000; color: #fff; }
          th { padding: 3px 5px; text-align: left; font-weight: bold; font-size: 9px; letter-spacing: 0.3px; }
          td { padding: 2.5px 5px; border-bottom: 0.5px solid #ddd; }
          tr:nth-child(even) td { background: #f5f5f5; }
          .amount { text-align: right; font-weight: bold; }
          .balance { text-align: right; font-weight: bold; }
          .footer { margin-top: 4px; display: flex; justify-content: space-between; font-size: 8px; border-top: 0.5px solid #999; padding-top: 3px; }
          .sig-box { border: 0.5px solid #999; padding: 2px 12px; font-size: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h2>${company.name.toUpperCase()}</h2>
            <p>${company.address}</p>
          </div>
          <div class="header-right">
            <div>Passbook Entry Print</div>
            <div>Date: ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>
        <div class="member-info">
          <div>Member: <span>${member.name}</span></div>
          <div>ID: <span>${member.id}</span></div>
          <div>Scheme: <span>${inv.schemeId}</span></div>
          <div>Contract: <span>${inv.id}</span></div>
          <div>Monthly: <span>${formatRupee(inv.amount)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Particular</th>
              <th>Installment for the Month of</th>
              <th>Late Fees</th>
              <th style="text-align:right">Installment</th>
              <th style="text-align:right">Amount (CR)</th>
            </tr>
          </thead>
          <tbody>
            ${txns.map(t => `
              <tr>
                <td>${t.date}</td>
                <td>${t.particular}</td>
                <td>${t.monthLabel}</td>
                <td>${t.lateFees}</td>
                <td class="amount">${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td class="balance">${t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>Total entries printed: <strong>${txns.length}</strong> &nbsp;|&nbsp; Total amount: <strong>${txns.reduce((s,t) => s + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
          <div class="sig-box">Authorized Signatory: _______________</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PRIMARY = [14, 99, 166] as [number,number,number];
    const WHITE = [255,255,255] as [number,number,number];
    const DARK = [15,23,42] as [number,number,number];
    const GRAY = [71,85,105] as [number,number,number];

    const drawHeader = () => {
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, 210, 22, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('Helvetica','bold');
      doc.setFontSize(13);
      doc.text(company.name.toUpperCase(), 14, 9);
      doc.setFont('Helvetica','normal');
      doc.setFontSize(7.5);
      doc.text(`${company.address} | ${company.email} | ${company.phone}`, 14, 14);
      doc.setFont('Helvetica','bold');
      doc.setFontSize(8);
      doc.text('MEMBER PASSBOOK', 162, 13);
    };

    const drawFooter = (cur: number, tot: number) => {
      doc.setDrawColor(226,232,240);
      doc.line(14,284,196,284);
      doc.setTextColor(...GRAY);
      doc.setFont('Helvetica','normal');
      doc.setFontSize(7.5);
      doc.text('Computer generated document. Branch seal and signature printed at dispatch.', 14, 289);
      doc.text(`Page ${cur} of ${tot}`, 183, 289);
    };

    // Cover page
    drawHeader();
    doc.setFillColor(...PRIMARY);
    doc.rect(14,30,182,22,'F');
    doc.setTextColor(...WHITE);
    doc.setFont('Helvetica','bold');
    doc.setFontSize(15);
    doc.text('OFFICIAL MEMBER PASSBOOK', 23,44);
    doc.setFontSize(8);
    doc.setFont('Helvetica','normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 23,50);

    doc.setFillColor(241,245,249);
    doc.rect(14,60,182,60,'F');
    doc.setTextColor(...DARK);
    doc.setFont('Helvetica','bold');
    doc.setFontSize(9);
    doc.text('Member Name:', 20,70); doc.setFont('Helvetica','normal'); doc.text(member.name, 55,70);
    doc.setFont('Helvetica','bold'); doc.text('Member ID:', 110,70); doc.setFont('Helvetica','normal'); doc.text(member.id, 140,70);
    doc.setFont('Helvetica','bold'); doc.text('Email:', 20,80); doc.setFont('Helvetica','normal'); doc.text(member.email, 55,80);
    doc.setFont('Helvetica','bold'); doc.text('Phone:', 110,80); doc.setFont('Helvetica','normal'); doc.text(member.phone, 140,80);
    doc.setFont('Helvetica','bold'); doc.text('City:', 20,90); doc.setFont('Helvetica','normal'); doc.text(member.city, 55,90);
    doc.setFont('Helvetica','bold'); doc.text('Since:', 110,90); doc.setFont('Helvetica','normal'); doc.text(member.memberSince||'N/A', 140,90);
    doc.setFont('Helvetica','bold'); doc.text('Status:', 20,100); doc.setTextColor(16,124,65); doc.text(member.status.toUpperCase(), 55,100);

    doc.setTextColor(...PRIMARY); doc.setFont('Helvetica','bold'); doc.setFontSize(10);
    doc.text('PORTFOLIO SUMMARY', 14,138);
    doc.setFillColor(248,250,252); doc.rect(14,143,182,45,'F');
    doc.setDrawColor(226,232,240); doc.rect(14,143,182,45,'S');
    doc.setTextColor(...DARK); doc.setFont('Helvetica','normal'); doc.setFontSize(8.5);
    doc.text('Total RD Paid:', 20,153); doc.setFont('Helvetica','bold'); doc.text(`INR ${totalRDPaid.toLocaleString('en-IN')}.00`, 80,153);
    doc.setFont('Helvetica','normal'); doc.text('Total FD Deposits:', 20,163); doc.setFont('Helvetica','bold'); doc.text(`INR ${totalFDPaid.toLocaleString('en-IN')}.00`, 80,163);
    doc.setDrawColor(226,232,240); doc.line(20,169,190,169);
    doc.setTextColor(...PRIMARY); doc.setFont('Helvetica','bold'); doc.setFontSize(9.5);
    doc.text('Total Accumulated:', 20,177); doc.text(`INR ${totalDepositValue.toLocaleString('en-IN')}.00`, 125,177);

    drawFooter(1, totalPages);

    // Investment pages
    activeInvestments.forEach((inv, idx) => {
      doc.addPage();
      drawHeader();
      const isRD = inv.schemeType === 'rd';
      const txns = isRD ? getRDTransactions(inv) : [
        { index:1, date:inv.startDate, particular:'1-1', monthLabel:'Opening Deposit', amount:inv.amount, balance:inv.amount, lateFees:'--', type:'CR', id:'fd1' },
        { index:2, date:inv.maturityDate, particular:'2-2', monthLabel:'Maturity Forecast', amount: Math.round(inv.amount * Math.pow(1+inv.interestPct/100,inv.durationYears))-inv.amount, balance:Math.round(inv.amount * Math.pow(1+inv.interestPct/100,inv.durationYears)), lateFees:'--', type:'CR', id:'fd2' }
      ];

      doc.setTextColor(...PRIMARY); doc.setFont('Helvetica','bold'); doc.setFontSize(10);
      doc.text(`LEDGER - CONTRACT: ${inv.id}`, 14,30);
      doc.setFillColor(241,245,249); doc.rect(14,33,182,20,'F');
      doc.setTextColor(...DARK); doc.setFont('Helvetica','normal'); doc.setFontSize(8);
      doc.text(`Scheme: ${inv.schemeId}`, 18,39); doc.text(`Type: ${isRD?'Recurring Deposit':'Fixed Deposit'}`, 70,39);
      doc.text(`Amount: ${isRD?`${formatRupee(inv.amount)}/mo`:formatRupee(inv.amount)}`, 130,39);
      doc.text(`Rate: ${inv.interestPct.toFixed(1)}% p.a.`, 18,47); doc.text(`Start: ${inv.startDate}`, 70,47); doc.text(`Maturity: ${inv.maturityDate}`, 130,47);

      let y = 60;
      doc.setFillColor(...PRIMARY); doc.rect(14,y,182,7,'F');
      doc.setTextColor(...WHITE); doc.setFont('Helvetica','bold'); doc.setFontSize(8);
      doc.text('Date', 18, y+5); doc.text('Particular', 42, y+5); doc.text('Month of', 65, y+5);
      doc.text('Late Fees', 108, y+5); doc.text('Installment', 132, y+5); doc.text('Balance (CR)', 165, y+5);
      y += 7;

      doc.setFont('Helvetica','normal'); doc.setFontSize(8);
      txns.forEach((t, i) => {
        if (i%2===1) { doc.setFillColor(248,250,252); doc.rect(14,y,182,7,'F'); }
        doc.setDrawColor(241,245,249); doc.line(14,y+7,196,y+7);
        doc.setTextColor(...DARK);
        doc.text(t.date, 18, y+5);
        doc.text(t.particular, 42, y+5);
        doc.text(t.monthLabel, 65, y+5);
        doc.text(t.lateFees, 112, y+5);
        doc.setFont('Helvetica','bold');
        doc.text(t.amount.toLocaleString('en-IN',{minimumFractionDigits:2}), 132, y+5);
        doc.setTextColor(16,124,65);
        doc.text(t.balance.toLocaleString('en-IN',{minimumFractionDigits:2}), 165, y+5);
        doc.setFont('Helvetica','normal'); doc.setTextColor(...DARK);
        y += 7;
      });

      drawFooter(2+idx, totalPages);
    });

    doc.save(`Passbook_${member.name.replace(/\s+/g,'_')}_${member.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col shadow-2xl h-[94vh] border border-slate-200">
        
        {/* Top toolbar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg"><BookOpen size={16} /></div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">{member.name}'s Passbook</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{company.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPrintMode(!printMode)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${printMode ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
              <Printer size={13} /> {printMode ? 'Exit Print Mode' : 'Print Mode'}
            </button>
            <button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Download size={13} /> Download PDF
            </button>
            <button onClick={onClose} className="p-1.5 bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white rounded-xl cursor-pointer">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Print mode banner */}
        {printMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
              <Printer size={13} /> Select entries to print on physical passbook. Check the rows you want, then click Print Selected.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 font-bold">{selectedEntries.size} selected</span>
              <button onClick={clearAll} className="text-xs text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer">Clear all</button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col items-center p-4 gap-4">

          {/* Cover page */}
          {currentPage === 1 && (
            <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
              {/* Bank style header */}
              <div className="bg-blue-700 text-white px-8 py-5">
                <h1 className="text-xl font-bold tracking-tight">{company.name.toUpperCase()}</h1>
                <p className="text-xs text-blue-200 mt-0.5">{company.address}</p>
                <div className="mt-3 inline-block bg-white/20 px-3 py-1 rounded text-xs font-bold tracking-widest">MEMBER PASSBOOK</div>
              </div>

              {/* Member details */}
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

                {/* Summary table */}
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

          {/* Investment ledger pages */}
          {currentPage > 1 && (() => {
            const inv = activeInvestments[currentPage - 2];
            if (!inv) return null;
            const isRD = inv.schemeType === 'rd';
            const txns = isRD ? getRDTransactions(inv) : [
              { id:'fd1', index:1, particular:'1-1', date:inv.startDate, monthLabel:'Opening Deposit', amount:inv.amount, balance:inv.amount, lateFees:'--', type:'CR' },
              { id:'fd2', index:2, particular:'2-2', date:inv.maturityDate, monthLabel:'Maturity (Forecast)', amount:Math.round(inv.amount*Math.pow(1+inv.interestPct/100,inv.durationYears))-inv.amount, balance:Math.round(inv.amount*Math.pow(1+inv.interestPct/100,inv.durationYears)), lateFees:'--', type:'CR' }
            ];

            return (
              <div className="w-full max-w-[210mm] bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
                {/* Ledger header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {isRD ? <RefreshCw size={15} className="text-emerald-400" /> : <Landmark size={15} className="text-blue-400" />}
                      <span className="font-bold text-sm">{isRD ? 'Recurring Deposit' : 'Fixed Deposit'}</span>
                      <span className="text-slate-400 text-xs font-mono">• {inv.schemeId}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">Contract: {inv.id} &nbsp;|&nbsp; {inv.interestPct.toFixed(1)}% p.a. &nbsp;|&nbsp; {inv.durationYears} Year{inv.durationYears>1?'s':''}</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{inv.startDate} → {inv.maturityDate}</div>
                    <div className="font-mono font-bold text-white mt-0.5">{isRD ? `${formatRupee(inv.amount)}/month` : formatRupee(inv.amount)}</div>
                  </div>
                </div>

                {/* Print mode controls */}
                {printMode && isRD && (
                  <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
                    <span className="text-xs text-amber-800 font-semibold">Select entries to print on physical passbook</span>
                    <div className="flex gap-2">
                      <button onClick={() => selectAll(inv)} className="text-xs bg-amber-500 text-white px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-amber-600">Select All</button>
                      <button
                        onClick={() => handlePrintSelected(inv)}
                        disabled={selectedEntries.size === 0}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1"
                      >
                        <Printer size={11} /> Print Selected ({selectedEntries.size})
                      </button>
                    </div>
                  </div>
                )}

                {/* Ledger table — exact same as old site */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px] uppercase">
                        {printMode && isRD && <th className="px-3 py-3 w-8"></th>}
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Particular</th>
                        <th className="px-4 py-3 text-left">Installment for the Month of</th>
                        <th className="px-4 py-3 text-center">Late Fees</th>
                        <th className="px-4 py-3 text-right">Installment</th>
                        <th className="px-4 py-3 text-right">Amount (CR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t, i) => (
                        <tr
                          key={t.id}
                          className={`border-b border-slate-100 transition-colors ${
                            printMode && selectedEntries.has(t.id)
                              ? 'bg-amber-50 border-l-2 border-l-amber-400'
                              : i%2===0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'
                          } ${printMode ? 'cursor-pointer' : ''}`}
                          onClick={() => printMode && toggleEntry(t.id)}
                        >
                          {printMode && isRD && (
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedEntries.has(t.id)}
                                onChange={() => toggleEntry(t.id)}
                                onClick={e => e.stopPropagation()}
                                className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 font-mono text-slate-600">{t.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{t.particular}</td>
                          <td className="px-4 py-3 text-blue-700 font-semibold">{t.monthLabel}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{t.lateFees}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                            {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    {isRD ? (
                      <span>Paid: <strong>{inv.paidMonths?.length || 0}</strong> of <strong>{inv.durationYears * 12}</strong> installments</span>
                    ) : (
                      <span>Fixed Deposit — {inv.durationYears} Year Lock-in</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Deposited</div>
                    <div className="text-sm font-bold font-mono text-emerald-700">
                      {formatRupee(isRD ? inv.amount * (inv.paidMonths?.length || 0) : inv.amount)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Bottom navigation */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1} className="p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft size={15} />
            </button>
            <span className="px-3 font-bold font-mono text-white">Page {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="hidden sm:flex gap-2">
            {[{label:'Cover'}, ...activeInvestments.map((inv,i)=>({label:inv.schemeId}))].map((p,i) => (
              <button key={i} onClick={() => setCurrentPage(i+1)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${currentPage===i+1?'bg-blue-600 text-white':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 size={11} className="text-emerald-500" />
            <span>Digital Ledger Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
}