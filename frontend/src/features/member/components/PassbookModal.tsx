import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, Download, Landmark, ChevronLeft, ChevronRight, 
  Printer, BookOpen, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Member, MemberInvestment } from '../../../shared/types/index.ts';

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

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  if (array.length === 0) return [[]];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const formatAmountRaw = (num: number): string => {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// FIX 1: numberToEnglish — corrected Indian place-value splits using proper
// divisors (10_000_000 for crores, 100_000 for lakhs, 1_000 for thousands).
// The original code used iterative division/modulo which produced wrong groupings
// for numbers like 1,00,00,000 (1 crore) splitting the lakh/crore boundary incorrectly.
const numberToEnglish = (n: number): string => {
  const num = Math.floor(n);
  if (num === 0) return 'Zero';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const translate3Digit = (val: number): string => {
    if (val === 0) return '';
    let out = '';
    if (val >= 100) {
      out += units[Math.floor(val / 100)] + ' Hundred';
      val %= 100;
      if (val > 0) out += ' ';
    }
    if (val >= 20) {
      out += tens[Math.floor(val / 10)];
      val %= 10;
      if (val > 0) out += ' ';
    }
    if (val > 0) {
      out += units[val];
    }
    return out.trim();
  };

  // Direct place-value extraction — unambiguous for all Indian groupings
  const crores    = Math.floor(num / 10_000_000);
  const lakhs     = Math.floor((num % 10_000_000) / 100_000);
  const thousands = Math.floor((num % 100_000) / 1_000);
  const remainder = num % 1_000;

  const parts: string[] = [];
  if (crores > 0)    parts.push(translate3Digit(crores) + ' Crore');
  if (lakhs > 0)     parts.push(translate3Digit(lakhs) + ' Lakh');
  if (thousands > 0) parts.push(translate3Digit(thousands) + ' Thousand');
  if (remainder > 0) parts.push(translate3Digit(remainder));

  return parts.filter(Boolean).join(' ') + ' Rupees Only';
};

const getInstallmentMonth = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return months[monthIndex] || 'N/A';
    }
  } catch (err) {}
  return 'N/A';
};

// FIX 2: getNextInstallmentDate — parse day as integer and re-pad with
// String.padStart so arithmetic works even when original day has no leading zero.
const getNextInstallmentDate = (dateStr: string): string => {
  if (!dateStr || dateStr === '--') return '--';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      let year  = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10); // parse as int, then re-pad below
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } catch (e) {}
  return '--';
};

// FIX 3: getMaturityAmount
//   FD  — was using simple annual compounding: P*(1+r/100)^n
//          Corrected to quarterly compounding (Indian banking standard):
//          A = P * (1 + r/400)^(4n)
//
//   RD  — was using an incremental loop: total = (total + P) * (1+r_m)
//          This implicitly used the correct end-of-period formula, but it is
//          replaced with the explicit closed-form RD maturity formula for clarity
//          and to avoid floating-point accumulation errors over many months:
//          A = P * [((1 + r_m)^n - 1) / r_m] * (1 + r_m)
//          where r_m = annual_rate / 1200  (monthly rate as decimal)
const getMaturityAmount = (inv: MemberInvestment): number => {
  const P     = inv.amount;
  const rate  = inv.interestPct;   // annual rate in % (e.g. 8 means 8%)
  const years = inv.durationYears;

  if (inv.schemeType === 'fd') {
    // Quarterly compounding: A = P * (1 + r/400)^(4n)
    return Math.round(P * Math.pow(1 + rate / 400, 4 * years));
  } else {
    // RD closed-form: A = P * [((1+r_m)^n - 1) / r_m] * (1+r_m)
    const n   = years * 12;
    const r_m = rate / 1200;
    if (r_m === 0) return P * n;   // guard: zero-rate edge case
    return Math.round(P * ((Math.pow(1 + r_m, n) - 1) / r_m) * (1 + r_m));
  }
};

export default function PassbookModal({ isOpen, onClose, member, company }: PassbookModalProps) {
  const activeInvestments = member.investments || [];
  
  const [selectedInvId, setSelectedInvId] = useState<string>(
    activeInvestments.length > 0 ? activeInvestments[0].id : ''
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [excludedRowIndices, setExcludedRowIndices] = useState<Record<number, boolean>>({});
  const [expandedReceiptIdx, setExpandedReceiptIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const activeInv = activeInvestments.find(inv => inv.id === selectedInvId) || activeInvestments[0];

  if (!activeInv) {
    return (
      <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-slate-800">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <Landmark size={48} className="mx-auto text-slate-400" />
          <h3 className="text-lg font-bold">No Active Accounts Found</h3>
          <p className="text-xs text-slate-500">
            This member does not hold any active Fixed or Recurring Deposit accounts at the moment.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer">
            Close Register
          </button>
        </div>
      </div>
    );
  }

  const isRDSelected = activeInv.schemeType === 'rd';

  const getRDTransactions = (inv: MemberInvestment) => {
    const paidMonths = [...(inv.paidMonths || [])].sort();
    const startDay = inv.startDate ? inv.startDate.split('-')[2] || '01' : '01';
    return paidMonths.map((monthStr, index) => {
      const dateStr = `${monthStr}-${startDay}`;
      return {
        index: index + 1,
        date: dateStr,
        particulars: `1-${index + 1}`,
        month: getInstallmentMonth(dateStr),
        lateFees: '--',
        amount: inv.amount,
        balance: inv.amount * (index + 1),
        type: 'CR'
      };
    });
  };

  const activeTxns = isRDSelected ? getRDTransactions(activeInv) : [
    {
      index: 1,
      date: activeInv.startDate,
      particulars: 'F-1',
      month: 'Opening',
      lateFees: '--',
      amount: activeInv.amount,
      balance: activeInv.amount,
      type: 'CR'
    }
  ];

  const txnChunks = chunkArray(activeTxns, 6);
  const totalSimPages = txnChunks.length;

  const totalRDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'rd') {
      return sum + inv.amount * (inv.paidMonths ? inv.paidMonths.length : 0);
    }
    return sum;
  }, 0);

  const totalFDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'fd') return sum + inv.amount;
    return sum;
  }, 0);

  const totalDepositValue = totalRDPaid + totalFDPaid;

  const toggleRowSelect = (idx: number) => {
    setExcludedRowIndices(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PRIMARY_COLOR = [22, 101, 192];
    const GRAY_LIGHT = [241, 245, 249];
    const GRAY_DARK = [71, 85, 105];
    const TEXT_MAIN = [15, 23, 42];

    const drawHeader = () => {
      doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(company.name.toUpperCase(), 15, 10);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${company.address} | Email: ${company.email} | Tel: ${company.phone}`, 15, 15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PASSBOOK EXCERPT', 160, 14);
    };

    const drawFooter = (current: number, total: number) => {
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 282, 195, 282);
      doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('This is a computer-generated ledger record. Physical seals/signatures are printed at branch dispatch.', 15, 287);
      doc.text(`Page ${current} of ${total}`, 180, 287);
    };

    drawHeader();
    doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.rect(15, 36, 180, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('OFFICIAL MEMBER PASSBOOK', 25, 48);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Holding Statement Ledger Generated on ${new Date().toLocaleDateString()}`, 25, 54);

    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MEMBER ACCOUNT PROFILE', 15, 75);

    doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
    doc.rect(15, 80, 180, 75, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 80, 180, 75, 'S');

    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Member Name:', 20, 88);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.name, 55, 88);
    doc.setFont('Helvetica', 'bold');
    doc.text('Member ID:', 110, 88);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.id, 145, 88);
    doc.setFont('Helvetica', 'bold');
    doc.text('Email Address:', 20, 98);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.email, 55, 98);
    doc.setFont('Helvetica', 'bold');
    doc.text('Phone Number:', 110, 98);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.phone, 145, 98);
    doc.setFont('Helvetica', 'bold');
    doc.text('Home Branch:', 20, 108);
    doc.setFont('Helvetica', 'normal');
    doc.text('Mohan Nagar Branch', 55, 108);
    doc.setFont('Helvetica', 'bold');
    doc.text('Branch City:', 110, 108);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.city, 145, 108);
    doc.setFont('Helvetica', 'bold');
    doc.text('Nominee Name:', 20, 118);
    doc.setFont('Helvetica', 'bold');
    doc.text('Member Since:', 110, 118);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.memberSince || 'N/A', 145, 118);
    doc.setFont('Helvetica', 'bold');
    doc.text('Address:', 20, 128);
    doc.setFont('Helvetica', 'bold');
    doc.text('Account Status:', 110, 146);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(16, 124, 65);
    doc.text(member.status.toUpperCase(), 145, 146);

    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PORTFOLIO GENERAL LEDGER SUMMARY', 15, 168);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, 172, 180, 48, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 172, 180, 48, 'S');

    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Active Deposits Held:', 22, 182);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${activeInvestments.length} Active Accounts`, 85, 182);
    doc.setFont('Helvetica', 'normal');
    doc.text('Total RD Paid Accumulation:', 22, 192);
    doc.setFont('Helvetica', 'bold');
    doc.text(`INR ${totalRDPaid.toLocaleString('en-IN')}.00`, 85, 192);
    doc.setFont('Helvetica', 'normal');
    doc.text('Total FD Booking Deposits:', 22, 202);
    doc.setFont('Helvetica', 'bold');
    doc.text(`INR ${totalFDPaid.toLocaleString('en-IN')}.00`, 85, 202);
    doc.setDrawColor(226, 232, 240);
    doc.line(22, 208, 188, 208);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Accumulated Remittance:', 22, 215);
    doc.text(`INR ${totalDepositValue.toLocaleString('en-IN')}.00`, 135, 215);
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NEFC REGISTERED SECURITIES DIVISION', 15, 245);
    doc.setFont('Helvetica', 'normal');
    doc.text('This booklet represents consolidated balance sheet of individual RD and FD ledger listings.', 15, 250);
    doc.text('The details inside have been formatted compatible with central Mohan Nagar repository database.', 15, 254);
    doc.setDrawColor(203, 213, 225);
    doc.rect(142, 235, 48, 22, 'S');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('BRANCH SEAL & SIG', 151, 248);

    const totalDocPages = 1 + activeInvestments.length;
    drawFooter(1, totalDocPages);

    activeInvestments.forEach((inv, pageIdx) => {
      doc.addPage();
      const pageNum = 2 + pageIdx;
      drawHeader();

      const isRD = inv.schemeType === 'rd';
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`LEDGER BOOKLET PAGE - CONTRACT ID: ${inv.id}`, 15, 34);

      doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
      doc.rect(15, 38, 180, 24, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, 38, 180, 24, 'S');

      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Scheme Catalog ID:', 20, 44);
      doc.setFont('Helvetica', 'normal');
      doc.text(inv.schemeId, 50, 44);
      doc.setFont('Helvetica', 'bold');
      doc.text('Scheme Categorization:', 110, 44);
      doc.setFont('Helvetica', 'normal');
      doc.text(isRD ? 'Recurring Deposit (RD)' : 'Fixed Deposit (FD)', 146, 44);
      doc.setFont('Helvetica', 'bold');
      doc.text('Contract Amount:', 20, 50);
      doc.setFont('Helvetica', 'normal');
      doc.text(isRD ? `INR ${inv.amount.toLocaleString('en-IN')}/mo` : `INR ${inv.amount.toLocaleString('en-IN')}`, 50, 50);
      doc.setFont('Helvetica', 'bold');
      doc.text('Interest Rate Yield:', 110, 50);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${inv.interestPct.toFixed(1)}% p.a.`, 146, 50);
      doc.setFont('Helvetica', 'bold');
      doc.text('Booking Start Date:', 20, 56);
      doc.setFont('Helvetica', 'normal');
      doc.text(inv.startDate, 50, 56);
      doc.setFont('Helvetica', 'bold');
      doc.text('Term Maturity Date:', 110, 56);
      doc.setFont('Helvetica', 'normal');
      doc.text(inv.maturityDate, 146, 56);

      const tableTopY = 70;
      doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.rect(15, tableTopY, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Sl No.', 20, tableTopY + 5.5);
      doc.text('Transaction Date', 38, tableTopY + 5.5);
      doc.text('Particulars / Ledger ID', 75, tableTopY + 5.5);
      doc.text('Tx Type', 132, tableTopY + 5.5);
      doc.text('Amount (CR)', 150, tableTopY + 5.5);
      doc.text('Balance Record', 174, tableTopY + 5.5);

      const rows = isRD ? getRDTransactions(inv) : [{
        index: 1,
        date: inv.startDate,
        particulars: 'F-1',
        type: 'CR',
        amount: inv.amount,
        balance: inv.amount
      }];

      let yOffset = tableTopY + 8;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);

      rows.forEach((row, rIdx) => {
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, yOffset, 180, 8, 'F');
        }
        doc.setDrawColor(241, 145, 249);
        doc.line(15, yOffset + 8, 195, yOffset + 8);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        doc.text(String(row.index), 21, yOffset + 5.5);
        doc.text(row.date, 38, yOffset + 5.5);
        doc.setFont('Helvetica', 'bold');
        doc.text(row.particulars, 75, yOffset + 5.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(row.type, 134, yOffset + 5.5);
        doc.text(row.amount.toLocaleString('en-IN'), 150, yOffset + 5.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(16, 124, 65);
        doc.text(row.balance.toLocaleString('en-IN'), 174, yOffset + 5.5);
        yOffset += 8;
      });

      const ledgerSummaryY = Math.min(yOffset + 10, 250);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, ledgerSummaryY, 195, ledgerSummaryY);
      doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('STATEMENT ACCRUAL METRIC', 15, ledgerSummaryY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      if (isRD) {
        doc.text(`Total Months Remitted: ${inv.paidMonths ? inv.paidMonths.length : 0} out of ${inv.durationYears * 12} scheduled.`, 15, ledgerSummaryY + 11);
      } else {
        doc.text(`Term Period duration: ${inv.durationYears} Years fully locked.`, 15, ledgerSummaryY + 11);
      }
      drawFooter(pageNum, totalDocPages);
    });

    const fileName = `Passbook_${member.name.replace(/\s+/g, '_')}_${member.id}.pdf`;
    doc.save(fileName);
  };

  const handlePrintReceipt = (row: any) => {
    const printFrame = document.createElement('iframe');
    printFrame.name = 'nefc_row_receipt_iframe';
    Object.assign(printFrame.style, { position: 'absolute', top: '-9999px', left: '-9999px', width: '0', height: '0', border: '0' });
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html><html><head><title>Renewal Receipt - ${activeInv.id}</title>
        <style>body{font-family:Arial,sans-serif;margin:15mm;background:white;color:black}
        .renewal_table{width:100%;border-collapse:collapse;margin-top:15px;font-size:13px}
        .renewl-head td{text-align:center;font-weight:bold;font-size:16px;padding:10px;border-bottom:2px dashed #000}
        .prow td{padding:6px 10px;vertical-align:middle}
        .r_border td{border-bottom:1px dashed #ccc}
        .r_border_box td{border:1px solid #000;padding:8px;text-align:center}
        .frow td{text-align:center;font-weight:bold;font-size:11px;padding-top:25px;border-top:1px dashed #000}</style>
        </head><body>
        <table width="100%" cellpadding="10" cellspacing="10" class="renewal_table">
          <tr class="renewl-head"><td colspan="6">RENEWAL RECEIPT</td></tr>
          <tr class="prow"><td colspan="2" style="font-weight:600">Issuing Branch</td><td>: Mohan Nagar</td>
            <td colspan="2" style="font-weight:600;text-align:right">MEMBER ID</td><td>: ${member.id}</td></tr>
          <tr class="r_border prow"><td colspan="2" style="font-weight:600">Account No/Certificate No</td><td colspan="4">: ${activeInv.id}</td></tr>
          <tr class="r_border prow"><td style="font-weight:600">Received From:</td></tr>
          <tr class="prow"><td colspan="2" style="font-weight:600">Deposit Amount(In Words):</td>
            <td colspan="4" style="font-style:italic">: ${numberToEnglish(row.amount)}</td></tr>
          <tr style="height:15px"><td colspan="6"></td></tr>
          <tr class="r_border_box prow">
            <td style="font-weight:600">Deposit Date</td><td style="font-weight:600">Period</td>
            <td style="font-weight:600">Plan</td><td style="font-weight:600">Premium No</td>
            <td style="font-weight:600">Amount</td><td style="font-weight:600">Next Installment</td></tr>
          <tr class="r_border_box prow">
            <td style="text-align:center">${row.date}</td>
            <td style="text-align:center">${activeInv.durationYears * 12} Months</td>
            <td style="text-align:center">${activeInv.schemeId}</td>
            <td style="text-align:center">${row.particulars}</td>
            <td style="text-align:center">${formatAmountRaw(row.amount)}</td>
            <td style="text-align:center">${getNextInstallmentDate(row.date)}</td></tr>
          <tr style="height:35px"><td colspan="6"></td></tr>
          <tr class="frow"><td colspan="6">Nation Empower co-operative society</td></tr>
        </table></body></html>`);
      frameDoc.close();
      setTimeout(() => {
        try { printFrame.contentWindow?.focus(); printFrame.contentWindow?.print(); } catch (e) {}
        setTimeout(() => document.body.removeChild(printFrame), 1500);
      }, 500);
    }
  };

  const handlePrint = () => {
    const printableTxns = activeTxns.filter(t => !excludedRowIndices[t.index]);
    if (printableTxns.length === 0) {
      alert("No rows selected for printing. Check at least one ledger installment.");
      return;
    }
    const printChunks = chunkArray(printableTxns, 6);
    const printFrame = document.createElement('iframe');
    printFrame.name = 'nefc_print_iframe';
    Object.assign(printFrame.style, { position: 'absolute', top: '-9999px', left: '-9999px', width: '0', height: '0', border: '0' });
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      const printPagesHTML = printChunks.map((chunk, chunkIdx) => {
        const paddedChunk = [...chunk];
        while (paddedChunk.length < 6) {
          paddedChunk.push({ index: paddedChunk.length + 1, date: '--', particulars: '--', month: '--', lateFees: '--', amount: 0, balance: 0, type: '--', isEmpty: true } as any);
        }
        return `<div class="print-page-break">
          <div class="header-container">
            <div class="header-left"><h1>${company.name}</h1><span>System Securities Division Ledger Booklet</span></div>
            <div class="header-right"><div>Branch: Mohan Nagar, Ghaziabad</div><div>Email: ${company.email}</div><div>Web: ${company.website}</div></div>
          </div>
          <table id="policy_style" class="fd-policy">
            <tr><td style="font-weight:600;background:#f7f9fa;width:25%">Member Id</td><td style="width:25%">: ${member.id}</td>
                <td style="font-weight:600;background:#f7f9fa;width:25%">Policy No</td><td style="width:25%">: ${activeInv.id}</td></tr>
            <tr><td style="font-weight:600;background:#f7f9fa">Member Name</td><td>: ${member.name}</td>
                <td style="font-weight:600;background:#f7f9fa">Policy Opening Date</td><td>: ${activeInv.startDate}</td></tr>
            <tr><td style="font-weight:600;background:#f7f9fa">Address</td></tr>
            <tr><td style="font-weight:600;background:#f7f9fa">Nominee Name</td></tr>
            <tr><td style="font-weight:600;background:#f7f9fa">Plan</td><td>: ${activeInv.schemeId}</td>
                <td style="font-weight:600;background:#f7f9fa">Period</td><td>: ${activeInv.durationYears * 12} Months</td></tr>
            <tr><td style="font-weight:600;background:#f7f9fa">Policy Amount(INR)</td><td>: ${formatAmountRaw(activeInv.amount)}</td>
                <td style="font-weight:600;background:#f7f9fa">Total Payable Amount(INR)</td>
                <td>: ${formatAmountRaw(isRDSelected ? activeInv.amount * activeInv.durationYears * 12 : activeInv.amount)}</td></tr>
            <tr><td style="font-weight:600;background:#f7f9fa">Maturity Date</td><td>: ${activeInv.maturityDate}</td>
                <td style="font-weight:600;background:#f7f9fa">Maturity Amount(INR)</td><td>: ${formatAmountRaw(getMaturityAmount(activeInv))}</td></tr>
          </table>
          <div style="font-weight:bold;font-family:sans-serif;font-size:13px;margin:15px 0 5px;border-bottom:2px solid #000;padding-bottom:3px">
            Ledger Installment List &bull; Page ${chunkIdx + 1} of ${printChunks.length}</div>
          <table class="rd-ledger-list">
            <thead><tr>
              <th class="wwdate">Date</th><th class="ww1">Particular</th>
              <th class="wwmonth">Installment for the month of</th>
              <th class="ww">Late Fees</th><th class="wwlate">Installment</th><th class="ww">Amount</th>
            </tr></thead>
            <tbody>${paddedChunk.map((t) => {
              const e = (t as any).isEmpty;
              return `<tr>
                <td class="wwdate" style="font-family:monospace">${e ? '--' : t.date}</td>
                <td class="ww1">${e ? '--' : t.particulars}</td>
                <td class="wwmonth" style="font-style:italic">${e ? '--' : t.month}</td>
                <td class="ww">${e ? '--' : t.lateFees}</td>
                <td class="wwlate" style="font-family:monospace;font-weight:bold">${e ? '--' : formatAmountRaw(t.amount)}</td>
                <td class="ww" style="font-family:monospace;font-weight:bold">${e ? '--' : formatAmountRaw(t.amount)}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
          <div class="footer-container">
            <div><div>Note: Computerized Ledger Record. Branch registry Mohan Nagar.</div><div>Account Ref Code: ${activeInv.id}</div></div>
            <div class="seal-box">BRANCH MANAGER SEAL &amp; SIGN</div>
          </div>
        </div>`;
      }).join('');

      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html><html><head><title>NEFC Ledger Printer - ${member.name}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:10mm;padding:0;background:white;color:black;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .print-page-break{page-break-after:always;break-after:page;margin-bottom:30px}
          .print-page-break:last-child{page-break-after:avoid;break-after:avoid;margin-bottom:0}
          .fd-policy{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;border:1px solid #000}
          .fd-policy td{padding:6px 10px;border:1px solid #000;vertical-align:middle}
          .rd-ledger-list{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;border:1px solid #000}
          .rd-ledger-list th{background:#000!important;color:#fff!important;padding:8px 10px;border:1px solid #000;text-align:center;font-weight:bold}
          .rd-ledger-list td{padding:8px 10px;border:1px solid #000;text-align:center}
          .wwdate{width:15%;text-align:center!important}.ww1{width:15%;text-align:center!important}
          .wwmonth{width:30%;text-align:center!important}.ww{width:12%;text-align:right!important}
          .wwlate{width:16%;text-align:right!important}
          .header-container{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:15px}
          .header-left h1{font-size:20px;margin:0;font-weight:bold;text-transform:uppercase}
          .header-left span{font-size:9px;color:#555;font-weight:bold}
          .header-right{text-align:right;font-size:10px;color:#444;line-height:1.3}
          .footer-container{margin-top:25px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#444}
          .seal-box{border:1px solid #000;padding:12px 20px;font-size:9px;font-weight:bold;text-align:center;border-radius:4px}
          @page{size:A4 portrait;margin:0}
        </style></head><body>${printPagesHTML}</body></html>`);
      frameDoc.close();
      setTimeout(() => {
        try { printFrame.contentWindow?.focus(); printFrame.contentWindow?.print(); } catch (e) {}
        setTimeout(() => document.body.removeChild(printFrame), 1500);
      }, 500);
    }
  };

  const handlePrintDetailsOnly = () => {
    const printFrame = document.createElement('iframe');
    printFrame.name = 'nefc_print_details_iframe';
    Object.assign(printFrame.style, { position: 'absolute', top: '-9999px', left: '-9999px', width: '0', height: '0', border: '0' });
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html><html><head><title>NEFC Details Printer - ${member.name}</title>
        <style>body{font-family:Arial,sans-serif;margin:20mm 15mm;padding:0;background:white;color:black}
        .dt{width:100%;border-collapse:collapse;font-size:14px}
        .dt td{padding:8px 10px;vertical-align:top}
        .lbl{font-weight:bold;width:25%;white-space:nowrap}.val{width:25%}
        @page{size:A4 portrait;margin:0}</style></head><body>
        <table class="dt">
          <tr><td class="lbl">Member Id</td><td class="val">: ${member.id}</td>
              <td class="lbl">Policy No</td><td class="val">: ${activeInv.id}</td></tr>
          <tr><td class="lbl">Member Name</td><td class="val">: ${member.name}</td>
              <td class="lbl">Policy Opening Date</td><td class="val">: ${activeInv.startDate}</td></tr>
          <tr><td class="lbl">Address</td></tr>
          <tr><td class="lbl">Nominee Name</td></tr>
          <tr><td class="lbl">Plan</td><td class="val">: ${activeInv.schemeId}</td>
              <td class="lbl">Period</td><td class="val">: ${activeInv.durationYears * 12} Months</td></tr>
          <tr><td class="lbl">Policy Amount(INR)</td><td class="val">: ${formatAmountRaw(activeInv.amount)}</td>
              <td class="lbl">Total Payable Amount(INR)</td>
              <td class="val">: ${formatAmountRaw(isRDSelected ? activeInv.amount * activeInv.durationYears * 12 : activeInv.amount)}</td></tr>
          <tr><td class="lbl">Maturity Date</td><td class="val">: ${activeInv.maturityDate}</td>
              <td class="lbl">Maturity Amount(INR)</td><td class="val">: ${formatAmountRaw(getMaturityAmount(activeInv))}</td></tr>
        </table></body></html>`);
      frameDoc.close();
      setTimeout(() => {
        try { printFrame.contentWindow?.focus(); printFrame.contentWindow?.print(); } catch (e) {}
        setTimeout(() => document.body.removeChild(printFrame), 1500);
      }, 500);
    }
  };

  const handlePrintLedgerPageOnly = () => {
    const printableChunk = activeChunk.filter(t => !excludedRowIndices[t.index]);
    if (printableChunk.length === 0) {
      alert("No active ledger rows are checked for printing. Please enable at least one line.");
      return;
    }
    const paddedChunk = activeChunk.map((t) => {
      if (excludedRowIndices[t.index] === true) {
        return { date: '', particulars: '', month: '', lateFees: '', amount: 0, balance: 0, isEmpty: true };
      }
      return t;
    });
    const printFrame = document.createElement('iframe');
    printFrame.name = 'nefc_print_ledger_page_iframe';
    Object.assign(printFrame.style, { position: 'absolute', top: '-9999px', left: '-9999px', width: '0', height: '0', border: '0' });
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html><html><head><title>NEFC Ledger Page ${currentPage}</title>
        <style>body{font-family:'Courier New',monospace;font-size:13px;font-weight:bold;margin:20mm 15mm;padding:0;background:white;color:black}
        .lt{width:100%;border-collapse:collapse;border:none}.lt td{padding:8px 0;border:none}
        .d{width:18%;text-align:left}.p{width:14%;text-align:center}.m{width:25%;text-align:center}
        .f{width:11%;text-align:center}.i{width:16%;text-align:right}.b{width:16%;text-align:right}
        @page{size:A4 portrait;margin:0}</style></head><body>
        <table class="lt"><tbody>${paddedChunk.map((t) => {
          const e = (t as any).isEmpty;
          return `<tr>
            <td class="d">${e ? '&nbsp;' : t.date}</td><td class="p">${e ? '&nbsp;' : t.particulars}</td>
            <td class="m">${e ? '&nbsp;' : t.month}</td><td class="f">${e ? '&nbsp;' : t.lateFees}</td>
            <td class="i">${e ? '&nbsp;' : formatAmountRaw(t.amount)}</td>
            <td class="b">${e ? '&nbsp;' : formatAmountRaw(t.balance || t.amount)}</td>
          </tr>`;
        }).join('')}</tbody></table></body></html>`);
      frameDoc.close();
      setTimeout(() => {
        try { printFrame.contentWindow?.focus(); printFrame.contentWindow?.print(); } catch (e) {}
        setTimeout(() => document.body.removeChild(printFrame), 1500);
      }, 500);
    }
  };

  const handlePrintSingleRow = (row: any) => {
    const printFrame = document.createElement('iframe');
    printFrame.name = 'nefc_print_row_iframe';
    Object.assign(printFrame.style, { position: 'absolute', top: '-9999px', left: '-9999px', width: '0', height: '0', border: '0' });
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html><html><head><title>NEFC Row ${row.index}</title>
        <style>body{font-family:'Courier New',monospace;font-size:13px;font-weight:bold;margin:20mm 15mm;padding:0;background:white;color:black}
        .lt{width:100%;border-collapse:collapse;border:none}.lt td{padding:8px 0;border:none}
        .d{width:18%}.p{width:14%;text-align:center}.m{width:25%;text-align:center}
        .f{width:11%;text-align:center}.i{width:16%;text-align:right}.b{width:16%;text-align:right}
        @page{size:A4 portrait;margin:0}</style></head><body>
        <table class="lt"><tbody><tr>
          <td class="d">${row.date}</td><td class="p">${row.particulars}</td>
          <td class="m">${row.month}</td><td class="f">${row.lateFees}</td>
          <td class="i">${formatAmountRaw(row.amount)}</td>
          <td class="b">${formatAmountRaw(row.balance || row.amount)}</td>
        </tr></tbody></table></body></html>`);
      frameDoc.close();
      setTimeout(() => {
        try { printFrame.contentWindow?.focus(); printFrame.contentWindow?.print(); } catch (e) {}
        setTimeout(() => document.body.removeChild(printFrame), 1500);
      }, 500);
    }
  };

  const activeChunk = txnChunks[currentPage - 1] || [];
  const activePaddedChunk = [...activeChunk];
  while (activePaddedChunk.length < 6) {
    activePaddedChunk.push({
      index: activePaddedChunk.length + 1,
      date: '--', particulars: '--', month: '--', lateFees: '--',
      amount: 0, balance: 0, type: '--', isEmpty: true
    } as any);
  }

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/90 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-slate-800 w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col shadow-2xl h-[95vh] border border-slate-700">
        
        {/* TOP BAR */}
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-blue-600 p-2 rounded-xl text-white"><BookOpen size={18} /></div>
            <div>
              <h3 className="font-sans text-xs sm:text-sm font-bold text-slate-100 leading-none">
                {member.name}'s Account Ledger Passbook
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-none">WYSIWYG Passbook View & Printing Control Panel</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeInvestments.length > 1 && (
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Account:</span>
                <select
                  value={selectedInvId}
                  onChange={(e) => { setSelectedInvId(e.target.value); setCurrentPage(1); setExcludedRowIndices({}); setExpandedReceiptIdx(null); }}
                  className="bg-slate-800 text-white text-xs font-semibold px-2 py-1.5 rounded-xl border border-slate-700 cursor-pointer focus:outline-none focus:border-blue-500"
                >
                  {activeInvestments.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.schemeType.toUpperCase()} - #{inv.id} ({inv.schemeId})</option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={handlePrintDetailsOnly} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold border border-slate-750" title="Print only customer and policy details cover page">
              <BookOpen size={14} className="text-amber-400" /><span>Print Details Only</span>
            </button>
            <button onClick={handlePrintLedgerPageOnly} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold border border-slate-750" title="Print only active page of 6 installments">
              <Printer size={14} className="text-emerald-400" /><span>Print Ledger Page (6 rows)</span>
            </button>
            <button onClick={handlePrint} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold border border-slate-750" title="Print combined details with ledger list">
              <Printer size={14} className="text-blue-400" /><span>Print Combined Statement</span>
            </button>
            <button onClick={handleDownloadPDF} className="p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold" title="Download Full Profile & Statement PDF">
              <Download size={14} /><span>Download Statement PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer" title="Close Panel" id="close-passbook">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* WORK AREA */}
        <div className="flex-1 overflow-y-auto bg-slate-700/80 flex flex-col justify-start items-center p-3 sm:p-6 space-y-4 scrollbar-thin">
          <div className="w-full max-w-[210mm] bg-white text-slate-950 shadow-2xl rounded-2xl md:rounded-3xl p-5 sm:p-10 flex flex-col justify-between border border-slate-400/30">
            <div>
              {/* BRAND HEADER */}
              <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-6">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 uppercase leading-none">{company.name}</h1>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-1">System Securities Division Ledger Booklet</span>
                </div>
                <div className="text-right text-[10px] text-slate-500 leading-normal">
                  <div className="font-semibold">Branch: Mohan Nagar, Ghaziabad</div>
                  <div>Email: {company.email}</div>
                  <div>Support: {company.phone}</div>
                </div>
              </div>

              {/* DETAILS TABLE */}
              <div className="overflow-x-auto">
                <table id="policy_style" className="w-full border-collapse border border-slate-950 text-xs">
                  <tbody>
                    <tr className="border-b border-slate-950">
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950 w-1/4">Member Id</td>
                      <td className="p-2 sm:p-2.5 border-r border-slate-950 w-1/4">: {member.id}</td>
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950 w-1/4">Policy No</td>
                      <td className="p-2 sm:p-2.5 w-1/4">: {activeInv.id}</td>
                    </tr>
                    <tr className="border-b border-slate-950">
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Member Name</td>
                      <td className="p-2 sm:p-2.5 border-r border-slate-950">: {member.name}</td>
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Policy Opening Date</td>
                      <td className="p-2 sm:p-2.5">: {activeInv.startDate}</td>
                    </tr>
                    <tr className="border-b border-slate-950">
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Address</td>
                    </tr>
                    <tr className="border-b border-slate-950">
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Nominee Name</td>
                    </tr>
                    <tr className="border-b border-slate-950">
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Plan</td>
                      <td className="p-2 sm:p-2.5 border-r border-slate-950">: {activeInv.schemeId}</td>
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Period</td>
                      <td className="p-2 sm:p-2.5">: {activeInv.durationYears * 12} Months</td>
                    </tr>
                    <tr className="border-b border-slate-950">
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Policy Amount(INR)</td>
                      <td className="p-2 sm:p-2.5 border-r border-slate-950">: {formatAmountRaw(activeInv.amount)}</td>
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Total Payable Amount(INR)</td>
                      <td className="p-2 sm:p-2.5">: {formatAmountRaw(isRDSelected ? activeInv.amount * activeInv.durationYears * 12 : activeInv.amount)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Maturity Date</td>
                      <td className="p-2 sm:p-2.5 border-r border-slate-950">: {activeInv.maturityDate}</td>
                      <td className="p-2 sm:p-2.5 font-bold bg-slate-100 border-r border-slate-950">Maturity Amount(INR)</td>
                      <td className="p-2 sm:p-2.5">: {formatAmountRaw(getMaturityAmount(activeInv))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* INSTALLMENTS HEADER */}
              <div className="font-bold font-sans text-xs sm:text-sm mt-6 mb-2 pb-1.5 border-b-2 border-slate-900 flex justify-between items-center text-slate-900">
                <span className="flex items-center gap-1.5">
                  <span className="bg-slate-900 text-white w-2 h-2 rounded-full"></span>
                  Ledger Installment List
                </span>
                <span className="text-[10px] font-bold text-slate-550 uppercase">
                  Sheet Page {currentPage} of {totalSimPages} &bull; <span className="text-blue-600 font-extrabold">Check box to selectively print</span>
                </span>
              </div>

              {/* LEDGER TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-950 text-xs text-center table-fixed">
                  <thead className="bg-[#111827] text-white font-bold h-10">
                    <tr>
                      <th className="border border-slate-950 text-center w-[6%] select-none">Print</th>
                      <th className="border border-slate-950 text-center w-[14%]">Date</th>
                      <th className="border border-slate-950 text-center w-[12%]">Particular</th>
                      <th className="border border-slate-950 text-center w-[25%]">Installment Month</th>
                      <th className="border border-slate-950 text-center w-[10%]">Late Fees</th>
                      <th className="border border-slate-950 text-right w-[14%]">Installment</th>
                      <th className="border border-slate-950 text-right w-[12%]">Amount</th>
                      <th className="border border-slate-950 text-center w-[16%] select-none">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePaddedChunk.map((t, idx) => {
                      const isPadded = (t as any).isEmpty;
                      const isRowExcluded = excludedRowIndices[t.index] === true;
                      const isReceiptOpen = expandedReceiptIdx === t.index;
                      return (
                        <React.Fragment key={idx}>
                          <tr className={`border-b border-slate-300 hover:bg-slate-50 transition-colors ${isRowExcluded ? 'opacity-40 bg-slate-50/70 border-dashed line-through decoration-slate-400' : ''}`}>
                            <td className="p-2 border border-slate-950 text-center">
                              {!isPadded ? (
                                <input type="checkbox" checked={!isRowExcluded} onChange={() => toggleRowSelect(t.index)}
                                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" title="Check to include in print or uncheck to exclude" />
                              ) : '--'}
                            </td>
                            <td className="p-2 sm:p-2.5 border border-slate-950 font-mono text-center">{isPadded ? '--' : t.date}</td>
                            <td className="p-2 sm:p-2.5 border border-slate-950 text-center">{isPadded ? '--' : t.particulars}</td>
                            <td className="p-2 sm:p-2.5 border border-slate-950 text-center capitalize italic">{isPadded ? '--' : t.month}</td>
                            <td className="p-2 sm:p-2.5 border border-slate-950 text-center font-bold">{isPadded ? '--' : t.lateFees}</td>
                            <td className="p-2 sm:p-2.5 border border-slate-950 text-right font-mono font-bold">{isPadded ? '--' : formatAmountRaw(t.amount)}</td>
                            <td className="p-2 sm:p-2.5 border border-slate-950 text-right font-mono font-bold">{isPadded ? '--' : formatAmountRaw(t.amount)}</td>
                            <td className="p-1 sm:p-1.5 border border-slate-950 text-center select-none">
                              {!isPadded ? (
                                <div className="flex flex-col gap-1">
                                  <button type="button" onClick={() => handlePrintSingleRow(t)}
                                    className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md border border-emerald-700 flex items-center justify-center gap-1 w-full cursor-pointer transition-all shadow-sm">
                                    <Printer size={10} /><span>Print Line</span>
                                  </button>
                                  <button type="button" onClick={() => setExpandedReceiptIdx(isReceiptOpen ? null : t.index)}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border flex items-center justify-center gap-1 w-full cursor-pointer transition-all ${isReceiptOpen ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'}`}>
                                    <span>Receipt</span>
                                    {isReceiptOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                  </button>
                                </div>
                              ) : '--'}
                            </td>
                          </tr>

                          {!isPadded && isReceiptOpen && (
                            <tr className="bg-slate-50 border border-slate-900 shadow-inner">
                              <td colSpan={8} className="p-4 sm:p-6 border border-slate-950">
                                <div className="border border-slate-400 border-dashed rounded-xl p-4 bg-white shadow-md relative overflow-hidden">
                                  <button onClick={() => handlePrintReceipt(t)} type="button"
                                    className="absolute top-4 right-4 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-600 transition-colors shadow-sm cursor-pointer">
                                    <Printer size={11} /><span>Print Receipt Only</span>
                                  </button>
                                  <div className="font-mono text-stone-700 max-w-2xl mx-auto space-y-4">
                                    <div className="text-center border-b border-dashed border-stone-300 pb-3">
                                      <h4 className="font-sans font-extrabold text-stone-900 tracking-wider text-sm">RENEWAL RECEIPT</h4>
                                      <p className="text-[9px] font-sans text-stone-500 mt-1 uppercase">Nation Empower Co-Operative Society</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-2 text-[11px] leading-relaxed">
                                      <div><span className="font-semibold text-stone-900">Issuing Branch:</span> Mohan Nagar</div>
                                      <div className="text-right font-semibold text-stone-900 uppercase">MEMBER ID : <span className="font-mono">{member.id}</span></div>
                                      <div className="col-span-2 border-b border-dashed border-stone-200 py-1">
                                        <span className="font-semibold text-stone-900">Certificate No / Account No:</span> <span className="font-mono font-bold">{activeInv.id}</span>
                                      </div>
                                      <div className="col-span-2 border-b border-dashed border-stone-200 py-1">
                                        <span className="font-semibold text-stone-900">Received From:</span> {member.name}
                                      </div>
                                      <div className="col-span-2 border-b border-dashed border-stone-200 py-1 italic text-stone-600">
                                        <span className="font-semibold text-stone-900 not-italic">Deposit Amount (In Words):</span> {numberToEnglish(t.amount)}
                                      </div>
                                    </div>
                                    <div className="border border-stone-800 rounded-lg overflow-hidden mt-3">
                                      <table className="w-full text-[10px] text-center font-mono bg-stone-50/50">
                                        <thead className="bg-stone-900 text-stone-100 font-semibold">
                                          <tr>
                                            <th className="p-1.5 border-r border-stone-800">Deposit Date</th>
                                            <th className="p-1.5 border-r border-stone-800">Period</th>
                                            <th className="p-1.5 border-r border-stone-800">Plan</th>
                                            <th className="p-1.5 border-r border-stone-800">Premium No</th>
                                            <th className="p-1.5 border-r border-stone-800">Amount</th>
                                            <th className="p-1.5 font-sans">Next Installment</th>
                                          </tr>
                                        </thead>
                                        <tbody className="border-t border-stone-800 text-stone-900">
                                          <tr>
                                            <td className="p-2 border-r border-stone-800">{t.date}</td>
                                            <td className="p-2 border-r border-stone-800">{activeInv.durationYears * 12} Mos</td>
                                            <td className="p-2 border-r border-stone-800">{activeInv.schemeId}</td>
                                            <td className="p-2 border-r border-stone-800">{t.particulars}</td>
                                            <td className="p-2 border-r border-stone-800 font-bold">₹{formatAmountRaw(t.amount)}</td>
                                            <td className="p-2 font-sans font-semibold text-indigo-600">{getNextInstallmentDate(t.date)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 text-[9px] text-stone-400 font-sans border-t border-dashed border-stone-200">
                                      <span>Authorized Agent Sign-Off Ledger Reference No: {activeInv.id}</span>
                                      <span className="font-bold text-stone-700 tracking-wider">OFFICIAL SYSTEM RECEIPT</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DOCUMENT FOOTER */}
            <div className="mt-12 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 pt-4 border-t border-slate-200 gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="font-bold text-slate-700 uppercase text-[9px]">Verified Passbook Booklet</div>
                <div>Mohan Nagar Branch central database ledger synchronized statement.</div>
              </div>
              <div className="border border-slate-300 px-4 py-2 text-center text-[9px] text-slate-550 font-bold rounded-lg bg-slate-50 transform hover:scale-105 transition-all">
                BRANCH MANAGER SEAL
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <button onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); setExpandedReceiptIdx(null); }}
              disabled={currentPage === 1}
              className={`p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-bold font-sans">Passbook Page {currentPage} / {totalSimPages}</span>
            <button onClick={() => { setCurrentPage(prev => Math.min(totalSimPages, prev + 1)); setExpandedReceiptIdx(null); }}
              disabled={currentPage === totalSimPages}
              className={`p-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 ${currentPage === totalSimPages ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
              <CheckCircle2 size={11} className="text-emerald-500" /> Digital Statement Sync Active
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold">
            Selected policy installments: {activeTxns.length} entries ({totalSimPages} Printable Pages)
          </div>
        </div>

      </div>
    </div>
  );
}
