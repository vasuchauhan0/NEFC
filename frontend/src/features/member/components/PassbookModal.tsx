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

// ─── interfaces ───────────────────────────────────────────────────────────────
interface PrintConfig {
  startTxn: number;
  endTxn: number;
  startLine: number;
  printCover: boolean;
}

/** Which physical passbook page an installment number falls on */
function getPage(n: number, rpp: number) {
  return Math.ceil(n / rpp);
}

/** Which line on that page */
function getLine(n: number, rpp: number) {
  return ((n - 1) % rpp) + 1;
}

export default function PassbookModal({ isOpen, onClose, member, company }: PassbookModalProps) {
  const [currentPage, setCurrentPage]   = useState(1);
  const [rowsPerPage, setRowsPerPage]   = useState(8);
  const [rppInput, setRppInput]         = useState('8');
  const [showSettings, setShowSettings] = useState(false);
  
  // Track manual print configurations for each investment
  const [printConfigs, setPrintConfigs] = useState<Record<string, PrintConfig>>({});

  const activeInvestments = member.investments || [];
  const totalPages = 1 + activeInvestments.length;

  const totalRDPaid = activeInvestments.reduce((s, i) =>
    i.schemeType === 'rd' ? s + i.amount * (i.paidMonths?.length || 0) : s, 0);
  const totalFDPaid = activeInvestments.reduce((s, i) =>
    i.schemeType === 'fd' ? s + i.amount : s, 0);
  const totalDepositValue = totalRDPaid + totalFDPaid;

  // Initialize print configs when modal opens or investments change
  useEffect(() => {
    if (!isOpen) return;
    const initialConfigs: Record<string, PrintConfig> = {};
    activeInvestments.forEach(inv => {
      const isRD = inv.schemeType === 'rd';
      const paidCount = inv.paidMonths?.length || 0;
      initialConfigs[inv.id] = {
        startTxn: 1,
        endTxn: isRD ? Math.max(1, paidCount) : 2,
        startLine: 1,
        printCover: true
      };
    });
    setPrintConfigs(initialConfigs);
  }, [isOpen, activeInvestments]);

  if (!isOpen) return null;

  // ── RD transaction list ──────────────────────────────────────────────────
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

  const updateConfig = (invId: string, field: keyof PrintConfig, value: number | boolean) => {
    setPrintConfigs(prev => ({
      ...prev,
      [invId]: {
        ...prev[invId],
        [field]: value
      }
    }));
  };

  // ── PRINT HANDLER ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) return;

    const rpp = rowsPerPage;

    const investmentPages = activeInvestments.map((inv, idx) => {
      const isRD      = inv.schemeType === 'rd';
      const allTxns   = isRD
        ? getRDTransactions(inv)
        : [
            { index: 1, date: inv.startDate, particulars: 'Opening FD Principal Deposit', amount: inv.amount, balance: inv.amount, type: 'CR' },
            { index: 2, date: inv.maturityDate, particulars: 'Maturity Yield Value (Forecast)',
              amount:  Math.round(inv.amount * Math.pow(1 + inv.interestPct / 100, inv.durationYears)) - inv.amount,
              balance: Math.round(inv.amount * Math.pow(1 + inv.interestPct / 100, inv.durationYears)), type: 'CR (Fcast)' },
          ];

      const config = printConfigs[inv.id] || { startTxn: 1, endTxn: allTxns.length, startLine: 1 };
      
      // Slice based on manual start/end transaction configuration
      const startIdx = Math.max(0, config.startTxn - 1);
      const endIdx = Math.min(allTxns.length, config.endTxn);
      const newTxns = allTxns.slice(startIdx, endIdx);
      
      const paidCount = inv.paidMonths?.length || 0;
      const totalInst = inv.durationYears * 12;

      // ── multi-page layout based on MANUAL Start Line ─────────────────────
      let pageGroups: { pageNo: number; spacers: number; rows: typeof newTxns }[] = [];

      if (isRD && newTxns.length > 0) {
        let currentPhysicalLine = config.startLine;
        let currentSheetNum = 1;
        let currentGroup: typeof pageGroups[0] | null = null;

        newTxns.forEach((t) => {
          // If we exceed rows per page, move to the next physical sheet
          if (!currentGroup || currentPhysicalLine > rpp) {
            if (currentPhysicalLine > rpp) {
              currentPhysicalLine = 1; 
              currentSheetNum++;
            }
            // Spacers are determined by the physical line we want to start on minus 1
            currentGroup = { pageNo: currentSheetNum, spacers: currentPhysicalLine - 1, rows: [] };
            pageGroups.push(currentGroup);
          }
          currentGroup.rows.push(t);
          currentPhysicalLine++;
        });
      } else {
        // FD: single group, spacers based on config
        pageGroups = [{ pageNo: 1, spacers: config.startLine - 1, rows: newTxns }];
      }

      const continuedNotice = isRD && config.startTxn > 1
        ? `<div class="continued-notice">
            <span class="cn-badge">CONTINUED</span>
            Printing from Installment <strong>#${config.startTxn}</strong>
            &nbsp;|&nbsp; Carried forward balance: <strong>₹${(inv.amount * (config.startTxn - 1)).toLocaleString('en-IN')}</strong>
          </div>`
        : '';

      return pageGroups.map((grp, grpIdx) => {
        // Inject blank spacer rows to push the text down to the desired line
        const spacerRows = Array(grp.spacers).fill(null).map((_, si) => `
          <tr class="spacer-row">
            <td class="center mono">${si + 1}</td>
            <td colspan="5" class="faint" style="font-style:italic;font-size:8.5px;">— intentionally left blank —</td>
          </tr>`).join('');

        const dataRows = grp.rows.map((t, ri) => `
          <tr class="${ri % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td class="center mono">${t.index}</td>
            <td class="mono">${t.date}</td>
            <td class="bold">${t.particulars}</td>
            <td class="center"><span class="badge">${t.type}</span></td>
            <td class="right mono">${t.amount.toLocaleString('en-IN')}</td>
            <td class="right mono bold ${t.type.includes('Fcast') ? 'blue' : 'green'}">${t.balance.toLocaleString('en-IN')}</td>
          </tr>`).join('');

        const pendingRow = isRD && grpIdx === pageGroups.length - 1
          ? `<tr class="pending-row">
              <td colspan="4" class="center faint">— ${totalInst - paidCount} installment(s) pending —</td>
              <td class="right faint">—</td><td class="right faint">—</td>
             </tr>`
          : '';

        const isFirstGroup = grpIdx === 0;

        return `
        <div class="page">
          <div class="page-header">
            <div class="org-name">${company.name.toUpperCase()}</div>
            <div class="org-address">${company.address} | ${company.email} | ${company.phone}</div>
            <div class="doc-label">${isRD ? 'RD' : 'FD'} LEDGER — PAGE ${idx + 2}${pageGroups.length > 1 ? ` (SHEET ${grpIdx + 1}/${pageGroups.length})` : ''}</div>
          </div>

          <div class="section-title">${isRD ? 'RECURRING DEPOSIT' : 'FIXED DEPOSIT'} LEDGER — ${inv.id}</div>

          ${isFirstGroup ? `
          <table class="info-table">
            <tr>
              <td class="label">Scheme ID</td><td class="value">${inv.schemeId}</td>
              <td class="label">Type</td><td class="value">${isRD ? 'Recurring Deposit (RD)' : 'Fixed Deposit (FD)'}</td>
            </tr>
            <tr>
              <td class="label">Amount</td>
              <td class="value">${isRD ? `₹${inv.amount.toLocaleString('en-IN')}/month` : `₹${inv.amount.toLocaleString('en-IN')}`}</td>
              <td class="label">Interest Rate</td><td class="value">${inv.interestPct.toFixed(1)}% p.a.</td>
            </tr>
            <tr>
              <td class="label">Start Date</td><td class="value">${inv.startDate}</td>
              <td class="label">Maturity Date</td><td class="value">${inv.maturityDate}</td>
            </tr>
            <tr>
              <td class="label">Duration</td><td class="value">${inv.durationYears} Year(s)</td>
              <td class="label">Status</td><td class="value status-active">${inv.status.toUpperCase()}</td>
            </tr>
          </table>
          ${continuedNotice}` : `
          <div class="continued-notice" style="background:#f0f9ff;border-color:#38bdf8;">
            <span class="cn-badge" style="background:#0284c7;">CONTINUED FROM SHEET ${grpIdx}</span>
            Passbook page <strong>${grp.pageNo}</strong> &nbsp;|&nbsp;
            Entries #${grp.rows[0].index} – #${grp.rows[grp.rows.length - 1].index}
            &nbsp;|&nbsp; Running balance: <strong>₹${(grp.rows[0].balance - inv.amount).toLocaleString('en-IN')}</strong>
          </div>`}

          <div class="ledger-title">
            ENTRIES${newTxns.length > 0 ? ` — INSTALLMENTS #${grp.rows[0].index} TO #${grp.rows[grp.rows.length - 1].index}` : ''}
          </div>

          <table class="ledger-table">
            <thead>
              <tr>
                <th class="center" style="width:6%">No.</th>
                <th style="width:14%">Date</th>
                <th>Particulars</th>
                <th class="center" style="width:10%">Type</th>
                <th class="right" style="width:15%">Amount (₹)</th>
                <th class="right" style="width:15%">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${spacerRows}
              ${dataRows}
              ${pendingRow}
            </tbody>
          </table>

          <div class="summary-bar">
            <div>
              ${isRD
                ? `Paid: <strong>${paidCount}</strong> of <strong>${totalInst}</strong> &nbsp;|&nbsp; Pending: <strong>${totalInst - paidCount}</strong>`
                : `Lock term: <strong>${inv.durationYears} yr</strong> &nbsp;|&nbsp; Booked: <strong>${inv.startDate}</strong>`}
            </div>
            <div>Total accumulated: <strong class="amount-big">₹${(isRD ? inv.amount * paidCount : inv.amount).toLocaleString('en-IN')}</strong></div>
          </div>

          <div class="page-footer">
            <div>Computer generated — valid without signature. Physical seal issued at branch.</div>
            <div class="page-num">Rows per page: ${rpp} &nbsp;|&nbsp; Page ${idx + 2}${pageGroups.length > 1 ? ` sheet ${grpIdx + 1}/${pageGroups.length}` : ''}</div>
          </div>
        </div>`;
      }).join('\n');
    });

    // portfolio rows for cover
    const portfolioRows = activeInvestments.map(inv => {
      const isRD = inv.schemeType === 'rd';
      const paid = isRD ? inv.amount * (inv.paidMonths?.length || 0) : inv.amount;
      return `<tr>
        <td>${isRD ? 'Recurring Deposit' : 'Fixed Deposit'}</td>
        <td>${inv.schemeId} @ ${inv.interestPct.toFixed(1)}% (${inv.durationYears}yr)</td>
        <td class="mono">${inv.startDate}</td><td class="mono">${inv.maturityDate}</td>
        <td class="right mono">₹${inv.amount.toLocaleString('en-IN')}${isRD ? '/mo' : ''}</td>
        <td class="right mono bold green">₹${paid.toLocaleString('en-IN')}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Passbook — ${member.name}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff}
.page{width:210mm;min-height:148mm;margin:0 auto 8mm;padding:10mm 12mm;border:1px solid #c8d6e5;page-break-after:always;position:relative;background:#fff}
.page:last-child{page-break-after:auto}
.page::before{content:"NEFC OFFICIAL";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:52px;font-weight:900;color:rgba(13,59,110,0.07);letter-spacing:6px;white-space:nowrap;pointer-events:none;z-index:0;font-family:Arial,sans-serif}
.page>*{position:relative;z-index:1}
.page-header{background:#0d3b6e;color:#fff;padding:8px 12px;border-radius:4px 4px 0 0;margin:-10mm -12mm 6mm;display:flex;flex-direction:column;gap:2px}
.org-name{font-size:15px;font-weight:800;letter-spacing:1.5px}
.org-address{font-size:8px;opacity:.85}
.doc-label{font-size:8px;font-weight:700;text-align:right;letter-spacing:1px;margin-top:-14px}
.cover-banner{background:#f0f4ff;border:1.5px solid #2563eb;border-radius:4px;padding:10px 14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.cover-banner h1{font-size:16px;font-weight:900;color:#0d3b6e}
.cover-banner p{font-size:9px;color:#475569;margin-top:3px}
.uid{font-size:12px;font-weight:800;color:#0d3b6e;font-family:monospace;text-align:right}
.section-title{font-size:9px;font-weight:800;color:#0d3b6e;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1.5px solid #0d3b6e;padding-bottom:2px;margin-bottom:6px}
.info-table{width:100%;border-collapse:collapse;margin-bottom:8px;background:#f8fafc;border:1px solid #dde6f0}
.info-table td{padding:4px 8px;border:1px solid #dde6f0;font-size:10px}
.info-table td.label{font-weight:700;color:#334155;background:#eef2f8;width:13%;white-space:nowrap}
.info-table td.value{color:#1e293b;width:24%}
.status-active{color:#15803d;font-weight:700}
.continued-notice{background:#fffbeb;border:1.5px solid #f59e0b;border-radius:4px;padding:6px 10px;margin-bottom:8px;font-size:9.5px;color:#78350f;line-height:1.6}
.cn-badge{background:#f59e0b;color:#fff;font-size:8px;font-weight:700;padding:1px 6px;border-radius:3px;margin-right:6px;letter-spacing:.5px;font-family:monospace}
.portfolio-table{width:100%;border-collapse:collapse;margin-bottom:10px}
.portfolio-table thead tr{background:#0d3b6e;color:#fff}
.portfolio-table thead th{padding:5px 8px;font-size:9px;font-weight:700;letter-spacing:.5px;text-align:left}
.portfolio-table thead th.right{text-align:right}
.portfolio-table tbody tr{border-bottom:1px solid #dde6f0}
.portfolio-table tbody tr:nth-child(even){background:#f4f7fb}
.portfolio-table tbody td{padding:5px 8px;font-size:10px}
.portfolio-table tfoot td{padding:5px 8px;font-size:10px;font-weight:800;border-top:2px solid #0d3b6e;background:#eef2f8}
.ledger-title{font-size:9px;font-weight:800;color:#0d3b6e;letter-spacing:1.2px;text-transform:uppercase;margin:8px 0 4px}
.ledger-table{width:100%;border-collapse:collapse}
.ledger-table thead tr{background:#0d3b6e;color:#fff}
.ledger-table thead th{padding:5px 6px;font-size:9px;font-weight:700;letter-spacing:.5px}
.ledger-table tbody td{padding:4px 6px;font-size:10px;border-bottom:1px solid #e2e8f0}
.row-even{background:#fff}.row-odd{background:#f4f7fb}
.first-new td{background:#f0fdf4!important;border-left:3px solid #22c55e}
.spacer-row td{background:#fafafa;color:#94a3b8}
.pending-row td{color:#94a3b8;font-style:italic;font-size:9px}
.badge{background:#e2e8f0;color:#334155;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;font-family:monospace}
.summary-bar{display:flex;justify-content:space-between;align-items:center;background:#f0f4ff;border:1px solid #c7d7f0;border-radius:3px;padding:5px 10px;margin-top:8px;font-size:9.5px}
.amount-big{font-size:13px;color:#0d3b6e;font-family:monospace}
.sig-area{display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;padding-top:10px;border-top:1px dashed #cbd5e1}
.sig-box{width:100px;height:60px;border:1.5px dashed #94a3b8;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:8px;color:#94a3b8;text-align:center}
.stamp-circle{width:70px;height:70px;border:2.5px dashed #94a3b8;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:7px;color:#94a3b8;text-align:center;font-weight:700;transform:rotate(-8deg)}
.disclaimer{font-size:8px;color:#64748b;max-width:60%;line-height:1.5}
.page-footer{position:absolute;bottom:7mm;left:12mm;right:12mm;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:4px}
.page-num{font-weight:700;font-family:monospace}
.center{text-align:center}.right{text-align:right}.mono{font-family:'Courier New',monospace}.bold{font-weight:700}.green{color:#15803d}.blue{color:#1d4ed8}.faint{color:#94a3b8}
@media print{@page{size:A5 landscape;margin:6mm}body{background:#fff}.page{width:100%;min-height:auto;margin:0;border:none;padding:0 8mm 14mm;page-break-after:always}.no-print{display:none!important}.page::before{font-size:48px;color:rgba(13,59,110,.06)}}
@media screen{body{background:#e2e8f0;padding:10px}.toolbar{width:210mm;margin:0 auto 6px;display:flex;gap:8px;justify-content:flex-end}.btn{padding:6px 14px;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer}.btn-print{background:#0d3b6e;color:#fff}.btn-close{background:#64748b;color:#fff}}
</style></head><body>
<div class="toolbar no-print">
  <button class="btn btn-print" onclick="window.print()">🖨️ Print Passbook</button>
  <button class="btn btn-close" onclick="window.close()">✕ Close</button>
</div>

<div class="page">
  <div class="page-header">
    <div class="org-name">${company.name.toUpperCase()}</div>
    <div class="org-address">${company.address} | ${company.email} | ${company.phone}</div>
    <div class="doc-label">OFFICIAL MEMBER PASSBOOK — Page 1</div>
  </div>
  <div class="cover-banner">
    <div>
      <h1>MEMBER PASSBOOK</h1>
      <p>Holding Statement Ledger &nbsp;|&nbsp; Issued: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
    <div><div class="uid">${member.id}</div><div style="font-size:9px;color:#475569;text-align:right;">Member Unique ID</div></div>
  </div>
  <div class="section-title">Member Account Particulars</div>
  <table class="info-table">
    <tr>
      <td class="label">Name</td><td class="value" style="font-weight:700">${member.name}</td>
      <td class="label">Member ID</td><td class="value" style="font-family:monospace;font-weight:700">${member.id}</td>
    </tr>
    <tr>
      <td class="label">Email</td><td class="value">${member.email}</td>
      <td class="label">Phone</td><td class="value">${member.phone}</td>
    </tr>
    <tr>
      <td class="label">City</td><td class="value">${member.city}</td>
      <td class="label">Member Since</td><td class="value">${member.memberSince || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label">Branch</td><td class="value">Mohan Nagar, Ghaziabad</td>
      <td class="label">Status</td><td class="value status-active">${member.status.toUpperCase()}</td>
    </tr>
  </table>
  <div class="section-title" style="margin-top:10px">Portfolio Summary</div>
  <table class="portfolio-table">
    <thead><tr>
      <th>Account Type</th><th>Scheme</th><th>Start</th><th>Maturity</th>
      <th class="right">Principal</th><th class="right">Balance (₹)</th>
    </tr></thead>
    <tbody>${portfolioRows}</tbody>
    <tfoot><tr>
      <td colspan="5" style="text-align:right">Total Consolidated Balance</td>
      <td class="right mono green">₹${totalDepositValue.toLocaleString('en-IN')}</td>
    </tr></tfoot>
  </table>
  <div class="sig-area">
    <div class="disclaimer"><strong>NEFC Registered Securities Division</strong><br>Consolidated balance ledger of all active RD and FD accounts.</div>
    <div class="sig-box"><div>Authorised</div><div>Signatory</div></div>
    <div class="stamp-circle"><div>NEFC</div><div>SECURITY</div><div>MOHAN NAGAR</div><div style="color:#15803d">VERIFIED</div></div>
  </div>
  <div class="page-footer">
    <div>Computer-generated record. Physical seals issued at branch.</div>
    <div class="page-num">Page 1</div>
  </div>
</div>

${investmentPages.join('\n')}
</body></html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  };

  // ─── PDF DOWNLOAD ──────────────────────────────────────────────────────────
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
      doc.text('Computer-generated. Physical seals at branch.',15,287);
      doc.text(`Page ${cur} of ${tot}`,180,287);
    };

    hdr();
    doc.setFillColor(...PC); doc.rect(15,36,180,22,'F');
    doc.setTextColor(255,255,255); doc.setFont('Helvetica','bold'); doc.setFontSize(15);
    doc.text('OFFICIAL MEMBER PASSBOOK',25,47);
    doc.setFont('Helvetica','normal'); doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`,25,53);

    doc.setTextColor(...PC); doc.setFont('Helvetica','bold'); doc.setFontSize(11);
    doc.text('MEMBER PROFILE',15,72);
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
      
      const all  = isRD ? getRDTransactions(inv)
        : [
            { index:1, date:inv.startDate,   particulars:'Opening FD Principal Deposit', amount:inv.amount, balance:inv.amount, type:'CR' },
            { index:2, date:inv.maturityDate, particulars:'Maturity Yield Value (Forecast)',
              amount: Math.round(inv.amount*Math.pow(1+inv.interestPct/100,inv.durationYears))-inv.amount,
              balance:Math.round(inv.amount*Math.pow(1+inv.interestPct/100,inv.durationYears)), type:'CR (Fcast)' },
          ];
          
      // Respect the manual print config for the PDF export as well
      const config = printConfigs[inv.id] || { startTxn: 1, endTxn: all.length, startLine: 1 };
      const startIdx = Math.max(0, config.startTxn - 1);
      const endIdx = Math.min(all.length, config.endTxn);
      const rows = all.slice(startIdx, endIdx);

      doc.setTextColor(...PC); doc.setFont('Helvetica','bold'); doc.setFontSize(11);
      doc.text(`${isRD?'RD':'FD'} LEDGER — ${inv.id}`,15,32);

      if (isRD && config.startTxn > 1) {
        doc.setFillColor(255,251,235); doc.rect(15,36,180,8,'F');
        doc.setTextColor(120,53,15); doc.setFont('Helvetica','bold'); doc.setFontSize(8);
        doc.text(`CONTINUED — Printing from #${config.startTxn} | Carried forward: ₹${(inv.amount*(config.startTxn - 1)).toLocaleString('en-IN')}`,18,41);
      }

      const ty = isRD && config.startTxn > 1 ? 50 : 40;
      doc.setFillColor(...PC); doc.rect(15,ty,180,7,'F');
      doc.setTextColor(255,255,255); doc.setFont('Helvetica','bold'); doc.setFontSize(8);
      ['No.','Date','Particulars','Type','Amount','Balance'].forEach((h,i)=>{
        doc.text(h,[19,35,72,130,152,176][i],ty+5);
      });

      let y = ty+7;
      rows.forEach((r,ri) => {
        if (ri%2===1){doc.setFillColor(248,250,252); doc.rect(15,y,180,7,'F');}
        if (isRD && ri===0 && config.startTxn > 1){doc.setFillColor(240,253,244); doc.rect(15,y,180,7,'F');}
        doc.setDrawColor(...GL); doc.line(15,y+7,195,y+7);
        doc.setTextColor(...TM); doc.setFont('Helvetica','normal'); doc.setFontSize(8);
        doc.text(String(r.index),20,y+5);
        doc.text(r.date,35,y+5);
        doc.setFont('Helvetica','bold'); doc.text(r.particulars,72,y+5);
        doc.setFont('Helvetica','normal'); doc.text(r.type,130,y+5);
        doc.text(r.amount.toLocaleString('en-IN'),152,y+5);
        doc.setFont('Helvetica','bold');
        if (r.type.includes('Fcast')) {
          doc.setTextColor(...PC);
        } else {
          doc.setTextColor(16, 124, 65);
        }
        doc.text(r.balance.toLocaleString('en-IN'),176,y+5);
        y+=7;
      });
      ftr(2+pi);
    });

    doc.save(`Passbook_${member.name.replace(/\s+/g,'_')}_${member.id}.pdf`);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const currentInv   = currentPage >= 2 ? activeInvestments[currentPage - 2] : null;
  const paidCount    = currentInv?.paidMonths?.length || 0;
  
  // Safe config access for current page
  const curConfig = currentInv && printConfigs[currentInv.id] 
    ? printConfigs[currentInv.id] 
    : { startTxn: 1, endTxn: 1, startLine: 1, printCover: true };

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-slate-850 w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col shadow-2xl h-[94vh] border border-slate-700/50">

        {/* ── Top toolbar ── */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg"><BookOpen size={18} /></div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 leading-none">{member.name}'s Passbook</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Manual Line Alignment Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold ${showSettings ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
              title="Passbook settings"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={handlePrint} className="p-1.5 sm:p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold">
              <Printer size={14} /><span className="hidden sm:inline">Print to Passbook</span>
            </button>
            <button onClick={handleDownloadPDF} className="p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1 font-bold">
              <Download size={14} /><span className="hidden sm:inline">PDF</span>
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block" />
            <button onClick={onClose} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer"><X size={15} /></button>
          </div>
        </div>

        {/* ── Settings panel ── */}
        {showSettings && (
          <div className="bg-amber-950/80 border-b border-amber-800/50 px-4 py-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-medium">Physical book rows per page:</span>
              <input
                type="number"
                min={1} max={30}
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

        {/* ── RD MANUAL print-range control ── */}
        {currentInv && (
          <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MoveDown size={14} className="text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wide">Manual Alignment</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Print Transactions:</span>
              <input
                type="number" min={1} max={paidCount || 2}
                value={curConfig.startTxn}
                onChange={e => updateConfig(currentInv.id, 'startTxn', parseInt(e.target.value) || 1)}
                className="w-14 text-center bg-slate-900 border border-slate-600 text-slate-100 text-sm font-mono rounded-lg px-1 py-1"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="number" min={1} max={paidCount || 2}
                value={curConfig.endTxn}
                onChange={e => updateConfig(currentInv.id, 'endTxn', parseInt(e.target.value) || 1)}
                className="w-14 text-center bg-slate-900 border border-slate-600 text-slate-100 text-sm font-mono rounded-lg px-1 py-1"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-amber-400 font-semibold">Start on Physical Line:</span>
              <input
                type="number" min={1} max={rowsPerPage}
                value={curConfig.startLine}
                onChange={e => updateConfig(currentInv.id, 'startLine', parseInt(e.target.value) || 1)}
                className="w-14 text-center bg-slate-900 border border-amber-600/50 text-amber-100 text-sm font-mono rounded-lg px-1 py-1"
                title="Enter the exact line number where the printer head should start"
              />
              <span className="text-[10px] text-slate-500">(1 to {rowsPerPage})</span>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-700/65 flex flex-col justify-start items-center p-3 sm:p-6 space-y-4 scrollbar-thin">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl rounded-2xl p-6 sm:p-10 relative flex flex-col justify-between border border-slate-200 select-none">
            
            <div className="relative">
              {/* letterhead */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-3 gap-2 mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-slate-900 leading-none">{company.name}</h1>
                  <span className="text-[9px] font-bold text-blue-800 uppercase tracking-widest font-mono">Securities Division Ledger</span>
                </div>
                <div className="text-left sm:text-right text-[10px] text-slate-500">
                  <div>Branch: Mohan Nagar, Ghaziabad</div>
                  <div>{company.email} | {company.phone}</div>
                </div>
              </div>

              {/* ── COVER PAGE ── */}
              {currentPage === 1 && (
                <div>
                  <div className="bg-blue-900 text-white rounded-2xl p-6 mb-6 border-l-4 border-blue-500">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">NEFC Branch Document</span>
                    <h2 className="text-2xl font-serif font-bold mt-1">Registered Member Passbook</h2>
                    <p className="text-xs text-blue-200 mt-1.5 max-w-lg">Consolidated balance ledger for all active FD and RD deposits.</p>
                  </div>

                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Member Account Particulars</h3>
                  <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6">
                    <div className="space-y-3">
                      {[['Name', member.name], ['Member ID', member.id], ['Since', member.memberSince || 'N/A']].map(([l, v]) => (
                        <div key={l}><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">{l}</span><span className="text-xs font-bold text-slate-800 font-mono">{v}</span></div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {[['Email', member.email], ['Phone', member.phone]].map(([l, v]) => (
                        <div key={l}><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">{l}</span><span className="text-xs font-bold text-slate-800">{v}</span></div>
                      ))}
                      <div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Status</span><span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">{member.status.toUpperCase()}</span></div>
                    </div>
                  </div>

                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Portfolio Summary</h3>
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto mb-4">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-100 text-[10px] text-slate-500 font-semibold uppercase">
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-right">Count</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr></thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Recurring Deposits</td>
                          <td className="px-4 py-3 text-right font-mono">{activeInvestments.filter(i => i.schemeType==='rd').length}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{formatRupee(totalRDPaid)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Fixed Deposits</td>
                          <td className="px-4 py-3 text-right font-mono">{activeInvestments.filter(i => i.schemeType==='fd').length}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{formatRupee(totalFDPaid)}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-4 py-3 text-blue-900 border-t border-slate-200">Total</td>
                          <td className="px-4 py-3 text-right border-t border-slate-200 font-mono">{activeInvestments.length}</td>
                          <td className="px-4 py-3 text-right border-t border-slate-200 font-mono text-sm text-blue-900">{formatRupee(totalDepositValue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-8 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <div className="text-[10px] text-slate-500 space-y-0.5">
                      <div className="font-bold text-slate-700 uppercase">Official Securities Stamp</div>
                      <div>NEFC Capital Mohan Nagar Branch</div>
                      <div>Moti Cinema Road, Ghaziabad, UP</div>
                    </div>
                    <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-300 flex flex-col justify-center items-center text-center opacity-70 rotate-[-6deg]">
                      <span className="text-[7px] font-black text-slate-400 tracking-wider">NEFC</span>
                      <span className="text-[8px] font-bold text-slate-500">MOHAN NAGAR</span>
                      <span className="text-[7px] font-bold text-emerald-600">VERIFIED</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── INVESTMENT PAGE PREVIEW ── */}
              {currentPage >= 2 && currentInv && (() => {
                const isRD = currentInv.schemeType === 'rd';
                const allT = isRD ? getRDTransactions(currentInv) : [
                  { index:1, date:currentInv.startDate, particulars:'Opening Deposit', amount:currentInv.amount, balance:currentInv.amount, type:'CR' }
                ];
                
                // Show only the transactions the user selected in the UI preview
                const startIdx = Math.max(0, curConfig.startTxn - 1);
                const endIdx = Math.min(allT.length, curConfig.endTxn);
                const dispT = allT.slice(startIdx, endIdx);

                // Build preview rows with manual spacers
                const previewRows = [];
                for (let i = 1; i < curConfig.startLine; i++) {
                   previewRows.push(
                     <tr key={`spacer-${i}`} className="bg-slate-50">
                       <td className="px-3 py-2 text-center text-slate-300 font-mono text-[10px]">Line {i}</td>
                       <td colSpan={5} className="px-3 py-2 text-slate-400 italic text-[10px] text-center">-- Blank (Printer will skip this line) --</td>
                     </tr>
                   );
                }
                dispT.forEach((t, i) => {
                   previewRows.push(
                     <tr key={t.index} className="border-b border-slate-100 bg-emerald-50/30">
                       <td className="px-3 py-2 text-center font-bold text-slate-600 font-mono text-[10px]">Line {curConfig.startLine + i}</td>
                       <td className="px-3 py-2 text-slate-700 font-mono text-xs">{t.date}</td>
                       <td className="px-3 py-2 font-bold text-slate-800 text-xs">Txn #{t.index} - {t.particulars}</td>
                       <td className="px-3 py-2 text-center text-xs"><span className="text-slate-600 bg-slate-200 font-bold px-1 py-0.5 rounded font-mono text-[10px]">{t.type}</span></td>
                       <td className="px-3 py-2 text-right font-mono text-slate-700 text-xs">{formatRupee(t.amount)}</td>
                       <td className="px-3 py-2 text-right font-mono font-black text-emerald-800 text-xs">{formatRupee(t.balance)}</td>
                     </tr>
                   );
                });

                return (
                  <div key={currentInv.id}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isRD ? <RefreshCw className="text-emerald-700" size={15}/> : <Landmark className="text-blue-700" size={15}/>}
                          <span className="font-bold text-sm">{isRD ? 'Recurring Deposit' : 'Fixed Deposit'} · {currentInv.id}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{currentInv.schemeId} · {currentInv.interestPct.toFixed(1)}% p.a. · {currentInv.durationYears}yr</div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block font-bold">TERM</span>
                        <span className="text-[11px] font-bold text-slate-700 font-mono">{currentInv.startDate} → {currentInv.maturityDate}</span>
                      </div>
                    </div>

                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex flex-col gap-1">
                      <div><strong>Print Preview Rule:</strong> The printer will feed paper and leave <strong>{curConfig.startLine - 1} blank lines</strong>.</div>
                      <div>It will begin printing transaction <strong>#{curConfig.startTxn}</strong> directly on physical <strong>Line {curConfig.startLine}</strong>.</div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[9.5px] uppercase">
                            <th className="px-3 py-2 text-center w-16">Phys. Line</th>
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
              })()}
            </div>

            <div className="mt-auto border-t border-slate-200 pt-3 text-[9px] text-slate-400 font-semibold flex justify-between">
              <span>Formal electronic passbook register. Subject to branch audit compliance.</span>
              <span className="font-mono font-bold">Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        </div>

        {/* ── Bottom nav ── */}
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
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold">
              <Calendar size={11}/> A5 Landscape · {rowsPerPage} rows/page
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold">
              <CheckCircle2 size={11} className="text-emerald-500"/> Digital Ledger Certified
            </span>
          </div>
          <div className="text-[10px] font-semibold">1 Cover + {activeInvestments.length} Ledger Pages</div>
        </div>

      </div>
    </div>
  );
}