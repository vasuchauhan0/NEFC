import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  X, Download, Landmark, RefreshCw,
  ChevronLeft, ChevronRight, Printer,
  Calendar, BookOpen, CheckCircle2, Settings, MoveDown
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

// ─── Print Settings Interface ────────────────────────────────────────────────
interface PrintConfig {
  startTxn: number;
  endTxn: number;
  startLine: number;
}

export default function PassbookModal({ isOpen, onClose, member, company }: PassbookModalProps) {
  const [currentPage, setCurrentPage]   = useState(1);
  const [rowsPerPage, setRowsPerPage]   = useState(12); // Standard passbooks generally house 12-15 lines
  const [rppInput, setRppInput]         = useState('12');
  const [showSettings, setShowSettings] = useState(false);
  
  // Track specific manual print alignment rules per investment contract
  const [printConfigs, setPrintConfigs] = useState<Record<string, PrintConfig>>({});

  const activeInvestments = member.investments || [];
  if (!isOpen) return null;

  const totalPages = 1 + activeInvestments.length;

  const totalRDPaid = activeInvestments.reduce((s, i) =>
    i.schemeType === 'rd' ? s + i.amount * (i.paidMonths?.length || 0) : s, 0);
  const totalFDPaid = activeInvestments.reduce((s, i) =>
    i.schemeType === 'fd' ? s + i.amount : s, 0);
  const totalDepositValue = totalRDPaid + totalFDPaid;

  // Initialize configurations safely when modal opens or profile switches
  useEffect(() => {
    if (!isOpen) return;
    const initialConfigs: Record<string, PrintConfig> = {};
    activeInvestments.forEach(inv => {
      const isRD = inv.schemeType === 'rd';
      const paidCount = inv.paidMonths?.length || 0;
      initialConfigs[inv.id] = {
        startTxn: 1,
        endTxn: isRD ? Math.max(1, paidCount) : 1,
        startLine: 1,
      };
    });
    setPrintConfigs(initialConfigs);
  }, [isOpen, member.investments]);

  // ── RD Transaction Parser ─────────────────────────────────────────────────
  const getRDTransactions = (inv: MemberInvestment) => {
    const months = [...(inv.paidMonths || [])].sort();
    const day    = inv.startDate?.split('-')[2] || '01';
    return months.map((m, i) => ({
      index:       i + 1,
      date:        `${m}-${day}`,
      particulars: 'Monthly Installment',
      amount:      inv.amount,
      balance:     inv.amount * (i + 1),
      type:        'CR',
    }));
  };

  const updateConfig = (invId: string, field: keyof PrintConfig, value: number) => {
    setPrintConfigs(prev => ({
      ...prev,
      [invId]: { ...prev[invId], [field]: value }
    }));
  };

  // ── RAW TEXT INJECTION PASSBOOK PRINTER HANDLER ────────────────────────────
  const handlePrint = () => {
    if (!currentInv) {
      alert("Please navigate to an investment page to target specific lines.");
      return;
    }

    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) return;

    const isRD = currentInv.schemeType === 'rd';
    const allTxns = isRD ? getRDTransactions(currentInv) : [
      { index: 1, date: currentInv.startDate, particulars: 'Opening Principal Deposit', amount: currentInv.amount, balance: currentInv.amount, type: 'CR' }
    ];

    const config = printConfigs[currentInv.id] || { startTxn: 1, endTxn: 1, startLine: 1 };
    const startIdx = Math.max(0, config.startTxn - 1);
    const endIdx = Math.min(allTxns.length, config.endTxn);
    const txnsToPrint = allTxns.slice(startIdx, endIdx);

    // Generate accurate blank lines to skip occupied passbook space safely
    let rowsHtml = '';
    for (let i = 1; i < config.startLine; i++) {
      rowsHtml += `<tr class="line-row transparent-spacer"><td colspan="6"></td></tr>`;
    }

    // Append target dataset cleanly (No style containers, layout frames, or shadows)
    txnsToPrint.forEach(t => {
      rowsHtml += `
        <tr class="line-row target-print-data">
          <td class="col-no">${t.index}</td>
          <td class="col-date">${t.date}</td>
          <td class="col-part">${t.particulars}</td>
          <td class="col-type">${t.type}</td>
          <td class="col-amt">${t.amount.toLocaleString('en-IN')}</td>
          <td class="col-bal">${t.balance.toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Passbook Print Engine</title>
<style>
  /* BARE TEXT PHYSICAL PRINT CONFIGURATION */
  @page { size: A5 landscape; margin: 12mm 8mm 8mm 8mm; }
  body { 
    margin: 0; 
    padding: 0; 
    font-family: 'Courier New', Courier, monospace; /* Essential for precise alignment on dot-matrix print heads */
    font-size: 11px; 
    color: #000;
    background: #fff;
  }
  table { 
    width: 100%; 
    border-collapse: collapse; 
    table-layout: fixed;
  }
  /* Explicit row-height constraint mapping to physical ledger row heights */
  .line-row { height: 8mm; } 
  td { 
    padding: 0 4px; 
    vertical-align: bottom; /* Drop text precisely right onto the physical paper lines */
    white-space: nowrap;
    overflow: hidden;
  }
  /* Immutable column tracking so print targets always punch exactly inside the lines */
  .col-no   { width: 8%; text-align: center; }
  .col-date { width: 16%; }
  .col-part { width: 34%; font-weight: bold; }
  .col-type { width: 8%; text-align: center; }
  .col-amt  { width: 17%; text-align: right; }
  .col-bal  { width: 17%; text-align: right; font-weight: bold; }
  
  /* Intermediary Toolbar Styling (Auto-scrubbed on active print spooling) */
  .printer-control-banner { 
    margin-bottom: 24px; 
    padding: 12px; 
    background: #f1f5f9; 
    border: 1px solid #cbd5e1;
    font-family: system-ui, sans-serif;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 8px;
  }
  .btn-trigger { padding: 7px 16px; background: #0d3b6e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; }
  @media print { .printer-control-banner { display: none !important; } }
</style>
</head>
<body>
  <div class="printer-control-banner">
    <div style="font-size: 12px; color: #334155;">
      <strong>🖨️ Raw Hardware Print Engine Active:</strong> Ensure physical passbook booklet is loaded. 
    </div>
    <button class="btn-trigger" onclick="window.print()">Spool Print Head</button>
  </div>
  <table>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  };

  // ─── PDF DOWNLOAD (Statement Mode) ─────────────────────────────────────────
  const handleDownloadPDF = () => {
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PC   = [13, 59, 110] as const;
    const GL   = [241, 245, 249] as const;
    const GD   = [71, 85, 105] as const;
    const TM   = [15, 23, 42] as const;
    const tot  = 1 + activeInvestments.length;

    const hdr = () => {
      doc.setFillColor(...PC); doc.rect(0,0,210,24,'F');
      doc.setTextColor(255,255,255); doc.setFont('Helvetica','bold'); doc.setFontSize(14);
      doc.text(company.name.toUpperCase(),15,10);
      doc.setFont('Helvetica','normal'); doc.setFontSize(8);
      doc.text(`${company.address} | ${company.email} | ${company.phone}`,15,15);
    };
    const ftr = (cur: number) => {
      doc.setDrawColor(226,232,240); doc.line(15,282,195,282);
      doc.setTextColor(...GD); doc.setFont('Helvetica','normal'); doc.setFontSize(8);
      doc.text('Computer-generated digital file. Official physical log matching account status.',15,287);
      doc.text(`Page ${cur} of ${tot}`,180,287);
    };

    hdr();
    doc.setFillColor(...PC); doc.rect(15,36,180,22,'F');
    doc.setTextColor(255,255,255); doc.setFont('Helvetica','bold'); doc.setFontSize(15);
    doc.text('OFFICIAL DIGITAL PASSBOOK STATEMENT',25,47);
    doc.setFont('Helvetica','normal'); doc.setFontSize(9);
    doc.text(`Generated Statement Log: ${new Date().toLocaleDateString()}`,25,53);

    doc.setTextColor(...PC); doc.setFont('Helvetica','bold'); doc.setFontSize(11);
    doc.text('MEMBER STATEMENT RECORD',15,72);
    doc.setFillColor(...GL); doc.rect(15,76,180,58,'F');
    doc.setDrawColor(203,213,225); doc.rect(15,76,180,58,'S');
    doc.setTextColor(...TM); doc.setFontSize(9);
    const L=20,V=60,R=110,RV=150;
    const row = (lbl:string,val:string,x:number,vx:number,y:number) => {
      doc.setFont('Helvetica','bold'); doc.text(lbl,x,y);
      doc.setFont('Helvetica','normal'); doc.text(val,vx,y);
    };
    row('Name:',member.name,L,V,85); row('Member ID:',member.id,R,RV,85);
    row('Email:',member.email,L,V,95); row('Phone:',member.phone,R,RV,95);
    row('Branch:','Mohan Nagar',L,V,105); row('City:',member.city,R,RV,105);
    row('Since:',member.memberSince||'N/A',L,V,115); 
    doc.setFont('Helvetica','bold'); doc.text('Status:',R,115);
    doc.setTextColor(16,124,65); doc.setFont('Helvetica','bold');
    doc.text(member.status.toUpperCase(),RV,115);
    ftr(1);

    activeInvestments.forEach((inv, pi) => {
      doc.addPage(); hdr();
      const isRD = inv.schemeType === 'rd';
      const rows = isRD ? getRDTransactions(inv) : [
        { index:1, date:inv.startDate, particulars:'Opening Deposit Principal', amount:inv.amount, balance:inv.amount, type:'CR' }
      ];

      doc.setTextColor(...PC); doc.setFont('Helvetica','bold'); doc.setFontSize(11);
      doc.text(`${isRD?'RD':'FD'} LOG ARCHIVE — ${inv.id}`,15,32);

      const ty = 40;
      doc.setFillColor(...PC); doc.rect(15,ty,180,7,'F');
      doc.setTextColor(255,255,255); doc.setFont('Helvetica','bold'); doc.setFontSize(8);
      ['No.','Date','Particulars','Type','Amount','Balance'].forEach((h,i)=>{
        doc.text(h,[19,35,72,130,152,176][i],ty+5);
      });

      let y = ty+7;
      rows.forEach((r,ri) => {
        if (ri%2===1){doc.setFillColor(248,250,252); doc.rect(15,y,180,7,'F');}
        doc.setDrawColor(...GL); doc.line(15,y+7,195,y+7);
        doc.setTextColor(...TM); doc.setFont('Helvetica','normal'); doc.setFontSize(8);
        doc.text(String(r.index),20,y+5);
        doc.text(r.date,35,y+5);
        doc.setFont('Helvetica','bold'); doc.text(r.particulars,72,y+5);
        doc.setFont('Helvetica','normal'); doc.text(r.type,130,y+5);
        doc.text(r.amount.toLocaleString('en-IN'),152,y+5);
        doc.setFont('Helvetica','bold'); doc.setTextColor(16, 124, 65);
        doc.text(r.balance.toLocaleString('en-IN'),176,y+5);
        y+=7;
      });
      ftr(2+pi);
    });

    doc.save(`Passbook_Statement_${member.name.replace(/\s+/g,'_')}.pdf`);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const currentInv   = currentPage >= 2 ? activeInvestments[currentPage - 2] : null;
  const isCurrentRD  = currentInv?.schemeType === 'rd';
  const paidCount    = currentInv?.paidMonths?.length || 0;
  
  // Safe config mapping calculation for layout preview rules
  const curConfig = currentInv && printConfigs[currentInv.id] 
    ? printConfigs[currentInv.id] 
    : { startTxn: 1, endTxn: 1, startLine: 1 };

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-slate-850 w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col shadow-2xl h-[94vh] border border-slate-700/50">

        {/* ── Top Toolbar ── */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg"><BookOpen size={18} /></div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 leading-none">{member.name}'s Printer Interface</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Manual Account Alignment Matrix</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold ${showSettings ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Set Bounds</span>
            </button>
            <button onClick={handlePrint} className="p-1.5 sm:p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold">
              <Printer size={14} /><span className="hidden sm:inline">Print Row Entry</span>
            </button>
            <button onClick={handleDownloadPDF} className="p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1 font-bold">
              <Download size={14} /><span className="hidden sm:inline">Download Statement</span>
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block" />
            <button onClick={onClose} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer"><X size={15} /></button>
          </div>
        </div>

        {/* ── Settings Panel ── */}
        {showSettings && (
          <div className="bg-amber-950/80 border-b border-amber-800/50 px-4 py-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-medium">Physical Passbook lines per page limit:</span>
              <input
                type="number" min={1} max={30}
                value={rppInput}
                onChange={e => {
                  setRppInput(e.target.value);
                  const n = parseInt(e.target.value);
                  if (n >= 1 && n <= 30) setRowsPerPage(n);
                }}
                className="w-16 text-center bg-amber-900 border border-amber-700 text-amber-100 text-sm font-mono rounded-lg px-2 py-1"
              />
            </div>
          </div>
        )}

        {/* ── Manual Print Alignment Controls ── */}
        {currentInv && (
          <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MoveDown size={14} className="text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wide">Target Space Controls</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Print Installments:</span>
              <input
                type="number" min={1} max={paidCount || 1}
                value={curConfig.startTxn}
                onChange={e => updateConfig(currentInv.id, 'startTxn', parseInt(e.target.value) || 1)}
                className="w-14 text-center bg-slate-900 border border-slate-600 text-slate-100 text-sm font-mono rounded-lg px-1 py-1"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="number" min={1} max={paidCount || 1}
                value={curConfig.endTxn}
                onChange={e => updateConfig(currentInv.id, 'endTxn', parseInt(e.target.value) || 1)}
                className="w-14 text-center bg-slate-900 border border-slate-600 text-slate-100 text-sm font-mono rounded-lg px-1 py-1"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-amber-400 font-semibold">Start on Passbook Physical Line:</span>
              <input
                type="number" min={1} max={rowsPerPage}
                value={curConfig.startLine}
                onChange={e => updateConfig(currentInv.id, 'startLine', parseInt(e.target.value) || 1)}
                className="w-14 text-center bg-slate-900 border border-amber-600/50 text-amber-100 text-sm font-mono rounded-lg px-1 py-1"
              />
              <span className="text-[10px] text-slate-500">(Target Line 1 to {rowsPerPage})</span>
            </div>
          </div>
        )}

        {/* ── Document Body View ── */}
        <div className="flex-1 overflow-y-auto bg-slate-700/65 flex flex-col justify-start items-center p-3 sm:p-6 space-y-4 scrollbar-thin">
          <div className="w-full max-w-[210mm] min-h-[148mm] bg-white text-slate-900 shadow-xl rounded-2xl p-6 sm:p-10 relative flex flex-col border border-slate-200 select-none">
            
            {currentPage === 1 ? (
               <div className="flex items-center justify-center h-full flex-col mt-20 text-center">
                 <div className="bg-blue-50 p-4 rounded-full mb-3">
                   <BookOpen size={44} className="text-blue-600" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900">Passbook Alignment Station</h2>
                 <p className="text-slate-500 text-xs mt-1.5 max-w-sm">
                   Navigate to page 2+ using the bottom controls to configure entry positions directly against your booklet lines.
                 </p>
               </div>
            ) : (
              currentInv && (() => {
                const isRD = currentInv.schemeType === 'rd';
                const allT = isRD ? getRDTransactions(currentInv) : [
                  { index: 1, date: currentInv.startDate, particulars: 'Opening Deposit', amount: currentInv.amount, balance: currentInv.amount, type: 'CR' }
                ];
                
                const startIdx = Math.max(0, curConfig.startTxn - 1);
                const endIdx = Math.min(allT.length, curConfig.endTxn);
                const dispT = allT.slice(startIdx, endIdx);

                // Construct visual feedback rows displaying planned line spacing layout rules
                const previewRows = [];
                for (let i = 1; i < curConfig.startLine; i++) {
                   previewRows.push(
                     <tr key={`spacer-${i}`} className="bg-slate-50/70 border-b border-slate-100">
                       <td className="px-3 py-2 text-center text-slate-300 font-mono text-[10px]">Line {i}</td>
                       <td colSpan={5} className="px-3 py-2 text-slate-400 italic text-[10px] text-center">-- Blank Paper Feed Box (Printer will skip this line) --</td>
                     </tr>
                   );
                }
                dispT.forEach((t, i) => {
                   previewRows.push(
                     <tr key={t.index} className="border-b border-emerald-200 bg-emerald-50 text-emerald-950 font-mono">
                       <td className="px-3 py-2 text-center font-bold text-emerald-700 text-[10px]">Line {curConfig.startLine + i}</td>
                       <td className="px-3 py-2 text-xs">{t.date}</td>
                       <td className="px-3 py-2 font-bold text-xs">Txn #{t.index} · {t.particulars}</td>
                       <td className="px-3 py-2 text-center text-xs">{t.type}</td>
                       <td className="px-3 py-2 text-right text-xs">{formatRupee(t.amount)}</td>
                       <td className="px-3 py-2 text-right font-bold text-xs">{formatRupee(t.balance)}</td>
                     </tr>
                   );
                });

                return (
                  <div key={currentInv.id} className="w-full">
                    <div className="bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl mb-4 text-xs">
                      <strong>Investment target matching:</strong> {isRD ? 'Recurring Account' : 'Fixed Account'} · ID: <span className="font-mono font-bold text-blue-800">{currentInv.id}</span>
                    </div>

                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                      <div><strong>Active Printing Coordinates Rule:</strong></div>
                      <div className="mt-1">The system will cycle the print roll past <strong>{curConfig.startLine - 1} blank rows</strong>. Printing will fire transaction <strong>#{curConfig.startTxn}</strong> straight onto physical <strong>Line {curConfig.startLine}</strong> of the passbook layout sheet.</div>
                    </div>

                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Hardware Output Grid Preview</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[9.5px] uppercase tracking-wider">
                            <th className="px-3 py-2 text-center w-20">Book Line</th>
                            <th className="px-3 py-2 w-24">Date</th>
                            <th className="px-3 py-2">Particulars</th>
                            <th className="px-3 py-2 text-center w-14">Type</th>
                            <th className="px-3 py-2 text-right w-24">Amount</th>
                            <th className="px-3 py-2 text-right w-28">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="mt-auto border-t border-slate-200 pt-3 text-[9px] text-slate-400 font-semibold flex justify-between">
              <span>Passbook Feed Compliance Matrix View.</span>
              <span className="font-mono font-bold">Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        </div>

        {/* ── Bottom Nav ── */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}
              className={`p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 ${currentPage===1?'opacity-40 cursor-not-allowed':''}`}>
              <ChevronLeft size={16}/>
            </button>
            <span className="px-2.5 font-bold">Page {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages}
              className={`p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700 ${currentPage===totalPages?'opacity-40 cursor-not-allowed':''}`}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}