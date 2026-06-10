import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, 
  Download, 
  FileText, 
  Landmark, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Calendar, 
  BookOpen,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle
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

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  if (array.length === 0) return [[]];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export default function PassbookModal({ isOpen, onClose, member, company }: PassbookModalProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const activeInvestments = member.investments || [];

  if (!isOpen) return null;

  // Number of pages: 1 (cover) + activeInvestments.length
  const totalPages = 1 + activeInvestments.length;

  const totalRDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'rd') {
      return sum + inv.amount * (inv.paidMonths ? inv.paidMonths.length : 0);
    }
    return sum;
  }, 0);

  const totalFDPaid = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'fd') {
      return sum + inv.amount;
    }
    return sum;
  }, 0);

  const totalDepositValue = totalRDPaid + totalFDPaid;

  // Generate transaction dates for RD based on start date day
  const getRDTransactions = (inv: MemberInvestment) => {
    const paidMonths = [...(inv.paidMonths || [])].sort();
    const startDay = inv.startDate ? inv.startDate.split('-')[2] || '01' : '01';
    
    return paidMonths.map((monthStr, index) => {
      // Month format: "YYYY-MM"
      const dateStr = `${monthStr}-${startDay}`;
      return {
        index: index + 1,
        date: dateStr,
        particulars: `Monthly Installment #${index + 1}`,
        amount: inv.amount,
        balance: inv.amount * (index + 1),
        type: 'CR'
      };
    });
  };

  // PDF Export using jsPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color definitions
    const PRIMARY_COLOR = [22, 101, 192];  // #1665C0 (Cobalt)
    const GRAY_LIGHT = [241, 245, 249];    // #F1F5F9 (slate-100)
    const GRAY_DARK = [71, 85, 105];       // #475569 (slate-600)
    const TEXT_MAIN = [15, 23, 42];        // #0F172A (slate-900)

    // Helper: Draw header banner
    const drawHeader = (pageNumber: number) => {
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

    // Helper: Draw footer
    const drawFooter = (current: number, total: number) => {
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(15, 282, 195, 282);
      
      doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('This is a computer-generated ledger record. Physical seals/signatures are printed at branch dispatch.', 15, 287);
      doc.text(`Page ${current} of ${total}`, 180, 287);
    };

    // --- PAGE 1: COVER PAGE ---
    drawHeader(1);

    // Cover Page Banner / Title
    doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.rect(15, 36, 180, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('OFFICIAL MEMBER PASSBOOK', 25, 48);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Holding Statement Ledger Generated on ${new Date().toLocaleDateString()}`, 25, 54);

    // Member Information Section
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MEMBER ACCOUNT PROFILE', 15, 75);

    // Draw profile container
    doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
    doc.rect(15, 80, 180, 65, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(15, 80, 180, 65, 'S');

    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    
    // Labels & Value positioning
    const leftColLabelX = 20;
    const leftColValX = 55;
    const rightColLabelX = 110;
    const rightColValX = 145;

    // Row 1
    doc.text('Member Name:', leftColLabelX, 90);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.name, leftColValX, 90);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Member ID:', rightColLabelX, 90);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.id, rightColValX, 90);

    // Row 2
    doc.setFont('Helvetica', 'bold');
    doc.text('Email Address:', leftColLabelX, 102);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.email, leftColValX, 102);

    doc.setFont('Helvetica', 'bold');
    doc.text('Phone Number:', rightColLabelX, 102);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.phone, rightColValX, 102);

    // Row 3
    doc.setFont('Helvetica', 'bold');
    doc.text('Home Branch:', leftColLabelX, 114);
    doc.setFont('Helvetica', 'normal');
    doc.text('Mohan Nagar Branch', leftColValX, 114);

    doc.setFont('Helvetica', 'bold');
    doc.text('Branch City:', rightColLabelX, 114);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.city, rightColValX, 114);

    // Row 4
    doc.setFont('Helvetica', 'bold');
    doc.text('Member Since:', leftColLabelX, 126);
    doc.setFont('Helvetica', 'normal');
    doc.text(member.memberSince || 'N/A', leftColValX, 126);

    doc.setFont('Helvetica', 'bold');
    doc.text('Account Status:', rightColLabelX, 126);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(16, 124, 65); // Green color
    doc.text(member.status.toUpperCase(), rightColValX, 126);

    // Accounts Holdings Summary Box
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PORTFOLIO GENERAL LEDGER SUMMARY', 15, 160);

    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 165, 180, 48, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(15, 165, 180, 48, 'S');

    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    
    doc.text('Active Deposits Held:', 22, 175);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${activeInvestments.length} Active Accounts`, 85, 175);

    doc.setFont('Helvetica', 'normal');
    doc.text('Total RD Paid Accumulation:', 22, 185);
    doc.setFont('Helvetica', 'bold');
    doc.text(`INR ${totalRDPaid.toLocaleString('en-IN')}.00`, 85, 185);

    doc.setFont('Helvetica', 'normal');
    doc.text('Total FD Booking Deposits:', 22, 195);
    doc.setFont('Helvetica', 'bold');
    doc.text(`INR ${totalFDPaid.toLocaleString('en-IN')}.00`, 85, 195);

    // Draw line & main balance
    doc.setDrawColor(226, 232, 240);
    doc.line(22, 201, 188, 201);

    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Accumulated Remittance:', 22, 208);
    doc.text(`INR ${totalDepositValue.toLocaleString('en-IN')}.00`, 135, 208);

    // Certified stamp text at bottom of front page
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NEFC REGISTERED SECURITIES DIVISION', 15, 240);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('This booklet represents consolidated balance sheet of individual RD and FD ledger listings.', 15, 245);
    doc.text('The details inside have been formatted compatible with central Mohan Nagar repository database.', 15, 249);

    // Draw Signature circles helper
    doc.setDrawColor(203, 213, 225);
    doc.rect(142, 230, 48, 22, 'S');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('BRANCH SEAL & SIG', 151, 243);

    drawFooter(1, totalPages);

    // --- SUBSEQUENT PAGES: FOR EACH INVESTMENT ---
    activeInvestments.forEach((inv, pageIdx) => {
      doc.addPage();
      const pageNum = 2 + pageIdx;
      
      drawHeader(pageNum);

      // Ledger Title
      const isRD = inv.schemeType === 'rd';
      
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`LEDGER BOOKLET PAGE - CONTRACT ID: ${inv.id}`, 15, 34);

      // Info Table for individual contract
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

      // Ledger Table Header
      const tableTopY = 70;
      doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.rect(15, tableTopY, 180, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Sl No.', 20, tableTopY + 5.5);
      doc.text('Transaction Date', 38, tableTopY + 5.5);
      doc.text('Transaction Details / Particulars', 75, tableTopY + 5.5);
      doc.text('Tx Type', 132, tableTopY + 5.5);
      doc.text('Amount (CR)', 150, tableTopY + 5.5);
      doc.text('Balance Record', 174, tableTopY + 5.5);

      // Draw rows
      let rows: any[] = [];
      if (isRD) {
        rows = getRDTransactions(inv);
      } else {
        // FD transactions
        rows = [
          {
            index: 1,
            date: inv.startDate,
            particulars: 'Opening FD Principal Deposit Amount',
            amount: inv.amount,
            balance: inv.amount,
            type: 'CR'
          },
          {
            index: 2,
            date: inv.maturityDate,
            particulars: 'Maturity Yield Value (Compounding Earned Forecast)',
            amount: Math.round(inv.amount * Math.pow(1 + inv.interestPct/100, inv.durationYears)) - inv.amount,
            balance: Math.round(inv.amount * Math.pow(1 + inv.interestPct/100, inv.durationYears)),
            type: 'CR (Fcast)'
          }
        ];
      }

      let yOffset = tableTopY + 8;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);

      rows.forEach((row, rIdx) => {
        // Alternating row background
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, yOffset, 180, 8, 'F');
        }
        
        // Grid lines
        doc.setDrawColor(241, 245, 249);
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
        if (row.type.includes('Fcast')) {
          doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        } else {
          doc.setTextColor(16, 124, 65);
        }
        doc.text(row.balance.toLocaleString('en-IN'), 174, yOffset + 5.5);
        
        yOffset += 8;
      });

      // Show summary details at bottom of page
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
        doc.text(`Future pending installments: ${(inv.durationYears * 12) - (inv.paidMonths ? inv.paidMonths.length : 0)} installments.`, 15, ledgerSummaryY + 15);
      } else {
        doc.text(`Term Period duration: ${inv.durationYears} Years fully locked.`, 15, ledgerSummaryY + 11);
        doc.text(`Early redemption is subject to bank manager appraisal & early forfeit penalty policies.`, 15, ledgerSummaryY + 15);
      }

      drawFooter(pageNum, totalPages);
    });

    const fileName = `Passbook_${member.name.replace(/\s+/g, '_')}_${member.id}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = () => {
    // 1. Create a temporary, completely isolated iframe for printing to bypass parent page or nested iframe container layout boundaries
    const printFrame = document.createElement('iframe');
    printFrame.name = 'nefc_print_iframe';
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      // 2. Fetch the pre-compiled, split, and structured passbook printer markup prepared in print-passbook-container
      const printHTML = document.getElementById('print-passbook-container')?.innerHTML || '';

      frameDoc.open();
      // 3. Inject strict full-width A4 dimensions, clean styles, and standard font spacing definitions to ensure perfect document margins in PDF printed sheets
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>NEFC Passbook Register - ${member.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=JetBrains+Mono:wght@400;700&display=swap');
              
              body {
                font-family: 'Inter', system-ui, sans-serif;
                margin: 0;
                padding: 0;
                background-color: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .p-6 { padding: 24px; }
              .p-5 { padding: 20px; }
              .p-4 { padding: 16px; }
              .p-3 { padding: 12px; }
              .pb-4 { padding-bottom: 16px; }
              .pb-3 { padding-bottom: 12px; }
              .pt-4 { padding-top: 16px; }
              .pt-1 { padding-top: 4px; }
              .mb-6 { margin-bottom: 24px; }
              .mb-4 { margin-bottom: 16px; }
              .mb-3 { margin-bottom: 12px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-1\\.5 { margin-bottom: 6px; }
              .mb-8 { margin-bottom: 32px; }
              .mt-12 { margin-top: 48px; }
              .mt-4 { margin-top: 16px; }
              .mt-1 { margin-top: 4px; }
              
              .font-sans { font-family: 'Inter', sans-serif; }
              .font-serif { font-family: 'Playfair Display', serif; }
              .font-mono { font-family: 'JetBrains Mono', monospace; }
              
              .text-black { color: #000000 !important; }
              .text-white { color: #ffffff !important; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 13px; }
              .text-lg { font-size: 17px; }
              .text-xl { font-size: 19px; }
              .text-2xl { font-size: 23px; }
              .text-[10px] { font-size: 10px; }
              .text-[11px] { font-size: 11px; }
              .text-[9px] { font-size: 9px; }
              .text-[8px] { font-size: 8px; }
              .text-[7.5px] { font-size: 7.5px; }
              
              .font-bold { font-weight: 700; }
              .font-semibold { font-weight: 600; }
              .font-medium { font-weight: 500; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .tracking-tight { letter-spacing: -0.5px; }
              .tracking-wide { letter-spacing: 0.5px; }
              .tracking-widest { letter-spacing: 1.5px; }
              .leading-normal { line-height: 1.5; }
              .leading-relaxed { line-height: 1.625; }
              
              .border-b-2 { border-bottom: 2px solid #0f172a; }
              .border-t { border-top: 1px solid #cbd5e1; }
              .border { border: 1px solid #cbd5e1; }
              .border-l-4 { border-left: 4px solid #0f172a; }
              .border-slate-900 { border-color: #0f172a; }
              .border-slate-300 { border-color: #cbd5e1; }
              .border-slate-200 { border-color: #e2e8f0; }
              .border-slate-250 { border-color: #cbd5e1; }
              .border-slate-350 { border-color: #cbd5e1; }
              
              .bg-white { background-color: #ffffff !important; }
              .bg-slate-50 { background-color: #f8fafc !important; }
              .bg-slate-100 { background-color: #f1f5f9 !important; }
              .bg-slate-200 { background-color: #e2e8f0 !important; }
              .bg-slate-900 { background-color: #0f172a !important; }
              
              .text-slate-950 { color: #020617 !important; }
              .text-slate-900 { color: #0f172a !important; }
              .text-slate-800 { color: #1e293b !important; }
              .text-slate-700 { color: #334155 !important; }
              .text-slate-650 { color: #475569 !important; }
              .text-slate-600 { color: #475569 !important; }
              .text-slate-550 { color: #64748b !important; }
              .text-slate-500 { color: #64748b !important; }
              .text-slate-400 { color: #94a3b8 !important; }
              .text-blue-800 { color: #075985 !important; }
              .text-emerald-500 { color: #10b981 !important; }
              
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
              .gap-4 { gap: 16px; }
              .gap-2 { gap: 8px; }
              
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-end { align-items: flex-end; }
              .items-center { align-items: center; }
              .flex-col { flex-direction: column; }
              .justify-end { justify-content: flex-end; }
              
              .w-full { width: 100%; }
              .w-10 { width: 40px; }
              .w-12 { width: 48px; }
              .w-20 { width: 80px; }
              .w-24 { width: 96px; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .rounded { border-radius: 4px; }
              .rounded-lg { border-radius: 8px; }
              .overflow-hidden { overflow: hidden; }
              .inline-block { display: inline-block; }
              .px-1 { padding-left: 4px; padding-right: 4px; }
              .py-0\\.2 { padding-top: 1px; padding-bottom: 1px; }
              .px-2.5 { padding-left: 10px; padding-right: 10px; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .px-2 { padding-left: 8px; padding-right: 8px; }
              .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
              .px-4 { padding-left: 16px; padding-right: 16px; }
              .py-2 { padding-top: 8px; padding-bottom: 8px; }
              .px-3 { padding-left: 12px; padding-right: 12px; }
              .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
              
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                padding: 6px 12px;
                border-bottom: 1px solid #cbd5e1;
              }
              thead tr {
                background-color: #0f172a !important;
                color: #ffffff !important;
              }
              
              .print-page-break {
                page-break-after: always;
                break-after: page;
                box-sizing: border-box;
                background-color: white !important;
                color: black !important;
                min-height: 296mm;
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              
              @page {
                size: A4 portrait;
                margin: 0;
              }
              @media print {
                html, body {
                  width: 210mm;
                  height: 297mm;
                }
                .print-page-break {
                  padding: 20mm;
                  height: 297mm;
                }
              }
            </style>
          </head>
          <body>
            ${printHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      // 4. Wait for styles/images and font asset loading and then trigger system print safely
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (printErr) {
          console.error('Failure trigger printable iframe content window context', printErr);
        }
        // Cleanup document node safely
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1500);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      
      {/* Outer PDF Reader styled container */}
      <div className="bg-slate-850 w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col shadow-2xl h-[94vh] animate-scale-up border border-slate-700/50">
        
        {/* PDF Top Toolbar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-sans text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 leading-none">
                {member.name}'s Digital Passbook & Ledger
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none font-medium">Virtual PDF Opener Preview</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1"
              title="Print Passbook Window"
            >
              <Printer size={14} />
              <span className="hidden sm:inline font-bold">Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1"
              title="Download PDF File"
            >
              <Download size={14} />
              <span className="hidden sm:inline font-bold">Download PDF</span>
            </button>
            <div className="w-px h-6 bg-slate-850 mx-1 hidden sm:block"></div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer"
              title="Close System Viewer"
              id="close-passbook"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Outer body: grey pane like standard Chrome PDF viewer */}
        <div className="flex-1 overflow-y-auto bg-slate-700/65 flex flex-col justify-start items-center p-3 sm:p-6 space-y-4 relative scrollbar-thin">
          
          {/* Inner A4 Document page simulation */}
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl rounded-2xl md:rounded-3xl p-6 sm:p-12 relative flex flex-col justify-between border border-slate-350 select-none">
            
            {/* Header branding */}
            <div className="relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-3 gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-slate-900 leading-none">
                    {company.name}
                  </h1>
                  <span className="text-[9px] font-bold text-blue-800 uppercase tracking-widest font-mono">
                    System Securities Division Ledger Booklet
                  </span>
                </div>
                <div className="text-left sm:text-right text-[10px] text-slate-500 font-sans">
                  <div>Branch: Mohan Nagar, Ghaziabad</div>
                  <div>Email: {company.email}</div>
                  <div>Contact Support: {company.phone}</div>
                </div>
              </div>

              {/* Cover Page */}
              {currentPage === 1 ? (
                <div className="mt-8 animate-fade-in">
                  
                  {/* Big Banner */}
                  <div className="bg-blue-900 text-white rounded-2xl p-6 mb-8 border-l-4 border-blue-600">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">NEFC Branch Document</span>
                    <h2 className="text-2xl sm:text-3.5xl font-serif font-bold tracking-tight mt-1">
                      Registered Member Passbook
                    </h2>
                    <p className="text-xs text-blue-150 mt-1.5 font-medium max-w-lg">
                      This formal register includes structural balance ledger sheets of active deposits (Fixed & Recurring) linked to member identification profile.
                    </p>
                  </div>

                  {/* Profile Sheet */}
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1">
                    <span>I. Registered Account Particulars</span>
                  </h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/95 p-4 sm:p-6 rounded-2xl mb-8">
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Account Holder Name</span>
                        <span className="text-sm font-bold text-slate-900 font-sans">{member.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">System Unique ID</span>
                        <span className="text-xs font-bold text-slate-800 font-mono bg-slate-200 px-1.5 py-0.5 rounded">{member.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Register Since</span>
                        <span className="text-xs font-bold text-slate-700">{member.memberSince || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Contact Email</span>
                        <span className="text-xs font-bold text-slate-700">{member.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Phone Reference</span>
                        <span className="text-xs font-bold text-slate-700">{member.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Ledger Status</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-250 px-2 py-0.5 rounded-full inline-block">
                          {member.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Summary metrics inside cover */}
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <span>II. Total Accumulated Statements Overview</span>
                  </h3>
                  
                  <div className="border border-slate-150 rounded-2xl overflow-x-auto mb-6">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-150 text-[10px] text-slate-500 font-semibold uppercase">
                          <th className="px-4 py-3">Book Category Type</th>
                          <th className="px-4 py-3 text-right">Count</th>
                          <th className="px-4 py-3 text-right">Deposited Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Recurring Deposits (RD) Paid Months
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-650">
                            {activeInvestments.filter(i => i.schemeType==='rd').length} Accounts
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-850">
                            {formatRupee(totalRDPaid)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Fixed Deposits (FD) Principals
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-650">
                            {activeInvestments.filter(i => i.schemeType==='fd').length} Accounts
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-850">
                            {formatRupee(totalFDPaid)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 font-bold">
                          <td className="px-4 py-3 text-blue-900 border-t border-slate-200">
                            Total Consolidated Balance Remitted
                          </td>
                          <td className="px-4 py-3 text-right border-t border-slate-200">
                            {activeInvestments.length} Total
                          </td>
                          <td className="px-4 py-3 text-right text-blue-900 border-t border-slate-200 font-mono text-sm">
                            {formatRupee(totalDepositValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Stamp visual */}
                  <div className="flex justify-between items-center mt-12 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <div className="text-[10px] text-slate-500 space-y-0.5">
                      <div className="font-bold uppercase text-slate-700">Official Securities Stamp</div>
                      <div>NEFC Capital Mohan Nagar Branch</div>
                      <div>Moti Cinema Road, Ghaziabad, UP, India</div>
                    </div>
                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-350/70 flex flex-col justify-center items-center text-center p-1.5 transform rotate-12 rotate-[-6deg] opacity-75">
                      <span className="text-[7px] font-black text-slate-400 tracking-wider">NEFC SECURITY</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight">MOHAN NAGAR</span>
                      <span className="text-[7px] font-bold text-emerald-600">VERIFIED</span>
                    </div>
                  </div>

                </div>
              ) : (
                /* Detail pages for investments */
                (() => {
                  const inv = activeInvestments[currentPage - 2];
                  if (!inv) return null;
                  const isRD = inv.schemeType === 'rd';
                  const txns = isRD ? getRDTransactions(inv) : [
                    {
                      index: 1,
                      date: inv.startDate,
                      particulars: 'Opening FD Principal Deposit Amount',
                      amount: inv.amount,
                      balance: inv.amount,
                      type: 'CR'
                    },
                    {
                      index: 2,
                      date: inv.maturityDate,
                      particulars: 'Maturity Yield Value (Compounding Earned Forecast)',
                      amount: Math.round(inv.amount * Math.pow(1 + inv.interestPct/100, inv.durationYears)) - inv.amount,
                      balance: Math.round(inv.amount * Math.pow(1 + inv.interestPct/100, inv.durationYears)),
                      type: 'CR (Fcast)'
                    }
                  ];

                  return (
                    <div className="mt-8 animate-fade-in" key={inv.id}>
                      {/* Sub-Header with metadata */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-150 p-4 rounded-xl mb-6 gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-900">
                            {isRD ? <RefreshCw className="text-emerald-700" size={15} /> : <Landmark className="text-blue-700" size={15} />}
                            <span className="font-bold text-sm">
                              {isRD ? 'Recurring Deposit (RD)' : 'Fixed Deposit (FD)'} • Contract {inv.id}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold font-mono mt-0.5">
                            SCHEME: {inv.schemeId} • YIELD YIELD: {inv.interestPct.toFixed(1)}% p.a. • LOCK TERM: {inv.durationYears} YEARS
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">TERM DURATION</span>
                          <span className="text-[11px] font-bold text-slate-700 font-mono">{inv.startDate} to {inv.maturityDate}</span>
                        </div>
                      </div>

                      {/* Transaction grid */}
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <span>Ledger Entries / Record Transactions</span>
                      </h3>

                      <div className="border border-slate-200 rounded-xl overflow-x-auto mt-2">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-900 text-white font-semibold text-[9.5px] uppercase">
                              <th className="px-3 py-2 text-center w-12">No.</th>
                              <th className="px-3 py-2 w-28">Date</th>
                              <th className="px-3 py-2">Details Particulars</th>
                              <th className="px-3 py-2 text-center w-16">Type</th>
                              <th className="px-3 py-2 text-right w-24">Amount</th>
                              <th className="px-3 py-2 text-right w-24">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {txns.map((t, index) => (
                              <tr key={index} className={`border-b border-slate-150 hover:bg-slate-50/70 transition-colors ${index % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                                <td className="px-3 py-2 text-center font-bold text-slate-400 font-mono">{t.index}</td>
                                <td className="px-3 py-2 text-slate-500 font-mono font-medium">{t.date}</td>
                                <td className="px-3 py-2 text-slate-800 font-bold">{t.particulars}</td>
                                <td className="px-3 py-2 text-center text-[10px]"><span className="text-slate-500 bg-slate-100 font-bold px-1 py-0.5 rounded font-mono">{t.type}</span></td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-700 font-mono">{formatRupee(t.amount)}</td>
                                <td className={`px-3 py-2 text-right font-mono font-black ${t.type.includes('Fcast') ? 'text-blue-900':'text-emerald-800'}`}>
                                  {formatRupee(t.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary calculations for pages */}
                      <div className="mt-8 border-t border-slate-150 pt-4 flex flex-col sm:flex-row justify-between text-xs text-slate-500 gap-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-700 uppercase text-[9.5px]">Contract Summary Accrual</div>
                          {isRD ? (
                            <div>Monthly remittance of {formatRupee(inv.amount)} over {inv.durationYears * 12} installments.</div>
                          ) : (
                            <div>Principal deposit compounding calculated on annual cycles.</div>
                          )}
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                          <div className="text-slate-650 font-bold">
                            Total Realized Remittance:{' '}
                            <span className="font-mono text-emerald-800 text-sm font-black">
                              {formatRupee(isRD ? inv.amount * (inv.paidMonths ? inv.paidMonths.length : 0) : inv.amount)}
                            </span>
                          </div>
                          {isRD && (
                            <div className="text-[10px] font-semibold text-slate-400">
                              Paid: {inv.paidMonths ? inv.paidMonths.length : 0} of {inv.durationYears * 12} Installments
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

            </div>

            {/* Simulated PDF print footer mark */}
            <div className="mt-auto border-t border-slate-200 pt-3 text-[9px] text-slate-400 font-semibold flex justify-between items-center">
              <span>This is a formal electronic passbook register. Subject to branch audit logs compliance.</span>
              <span className="font-mono font-bold">Page {currentPage} of {totalPages}</span>
            </div>

          </div>

        </div>

        {/* PDF Reader Bottom navigation and indicator bar */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 ${currentPage === 1 ? 'opacity-40 cursor-not-allowed':''}`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2.5 font-bold font-sans">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed':''}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-350 font-bold">
              <Calendar size={11} /> Format: Standard DIN A4 Vertical
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-350 font-bold">
              <CheckCircle2 size={11} className="text-emerald-500" /> Digital Ledger Certified
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold font-sans">
            Pages: 1 (Index Cover) + {activeInvestments.length} (Ledger Records)
          </div>
        </div>

      </div>

      {/* PRINT-ONLY VISUAL CONTAINER (Fully responsive to A4 Portrait specs during page print layout) */}
      <div id="print-passbook-container" className="hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #print-passbook-container, #print-passbook-container * {
              visibility: visible;
            }
            #print-passbook-container {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
            }
            .print-page-break {
              page-break-after: always;
              break-after: page;
              background: white !important;
              color: black !important;
              box-sizing: border-box;
            }
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
          }
        `}} />

        {/* PRINT PAGE 1: COVER INDEX HEADER */}
        <div className="print-page-break p-6 font-sans bg-white text-black text-xs leading-normal">
          {/* Header branding */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-serif font-black tracking-tight text-slate-900 uppercase">
                {company.name}
              </h1>
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest font-mono">
                System Securities Division Ledger Booklet
              </span>
            </div>
            <div className="text-right text-[10px] text-slate-500 font-sans leading-relaxed">
              <div>Branch: Mohan Nagar, Ghaziabad</div>
              <div>Email: {company.email}</div>
              <div>Tel Support: {company.phone}</div>
            </div>
          </div>

          {/* Big Banner */}
          <div className="bg-slate-100 border-l-4 border-slate-900 p-5 mb-6 rounded">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Official Passbook Register</span>
            <h2 className="text-lg font-serif font-bold tracking-tight mt-1 text-slate-900">
              MEMBER DETAILS & ACCOUNT LEDGER
            </h2>
            <p className="text-[10px] text-slate-600 mt-1 max-w-xl">
              This document forms the registered physical passbook compilation of investments (Fixed & Recurring Deposits) linked securely with Central Reserve.
            </p>
          </div>

          {/* Profile Block */}
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
            I. Registered Member Accounts Profile
          </h3>
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded mb-6 text-xs leading-normal">
            <div className="space-y-2">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Account Holder Name</span>
                <span className="font-bold text-slate-900 text-sm">{member.name}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Unique Member ID</span>
                <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200 inline-block">{member.id}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">City Branch</span>
                <span className="font-semibold text-slate-700">Mohan Nagar ({member.city})</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Official Email Address</span>
                <span className="font-semibold text-slate-700">{member.email}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Phone Registration</span>
                <span className="font-semibold text-slate-700">{member.phone}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block">Registered Since</span>
                <span className="font-semibold text-slate-700">{member.memberSince || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Holdings summary table */}
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
            II. Cumulative Portfolio Balance Sheet
          </h3>
          <div className="border border-slate-300 rounded overflow-hidden mb-6">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[9px] text-slate-500 font-bold uppercase">
                  <th className="px-4 py-2">Deposit Schemes Class</th>
                  <th className="px-4 py-2 text-right">Accounts Active</th>
                  <th className="px-4 py-2 text-right">Deposited Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-2 font-medium text-slate-800">Recurring Deposit (RD) Remittance</td>
                  <td className="px-4 py-2 text-right font-mono">{activeInvestments.filter(i => i.schemeType==='rd').length}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatRupee(totalRDPaid)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-slate-800">Fixed Deposit (FD) Booking Capital</td>
                  <td className="px-4 py-2 text-right font-mono">{activeInvestments.filter(i => i.schemeType==='fd').length}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatRupee(totalFDPaid)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-950">
                  <td className="px-4 py-2">Total Accumulated Securities</td>
                  <td className="px-4 py-2 text-right font-mono">{activeInvestments.length} Total</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-950">{formatRupee(totalDepositValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Seal stamp box */}
          <div className="flex justify-between items-center mt-12 bg-slate-50 p-4 border border-slate-200 rounded">
            <div className="text-[9px] text-slate-500 space-y-0.5 leading-normal">
              <div className="font-bold uppercase text-slate-700">Official Securities Stamp</div>
              <div>NEFC Capital Mohan Nagar Branch</div>
              <div>Account Booklet Log Generated: {new Date().toLocaleDateString()}</div>
            </div>
            <div className="border border-slate-350 bg-white px-6 py-5 text-center text-[9px] text-slate-400 font-bold rounded">
              BRANCH MANAGER SEAL & SIGN
            </div>
          </div>
        </div>

        {/* PRINT PAGES 2+: INDIVIDUAL INVESTMENT CONTRACT LEDGERS IN PORTFOLIO */}
        {activeInvestments.map((inv, invIndex) => {
          const isRD = inv.schemeType === 'rd';
          const txns = isRD ? getRDTransactions(inv) : [
            {
              index: 1,
              date: inv.startDate,
              particulars: 'Opening FD Principal Deposit Amount',
              amount: inv.amount,
              balance: inv.amount,
              type: 'CR'
            },
            {
              index: 2,
              date: inv.maturityDate,
              particulars: 'Maturity Yield Value (Compounding Earned Forecast)',
              amount: Math.round(inv.amount * Math.pow(1 + inv.interestPct/100, inv.durationYears)) - inv.amount,
              balance: Math.round(inv.amount * Math.pow(1 + inv.interestPct/100, inv.durationYears)),
              type: 'CR (Fcast)'
            }
          ];

          // Chunk the RD transactions into arrays of of max size 6. FD has only 1 chunk of 2 transactions.
          const chunks = isRD ? chunkArray(txns, 6) : [txns];

          return chunks.map((chunk, chunkIdx) => (
            <div key={`${inv.id}-print-page-${chunkIdx}`} className="print-page-break p-6 font-sans bg-white text-black text-xs leading-normal relative min-h-screen flex flex-col justify-between">
              <div>
                {/* Header branding */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
                  <div>
                    <h1 className="text-xl font-serif font-black tracking-tight text-slate-900 uppercase">
                      {company.name}
                    </h1>
                    <span className="text-[9px] font-bold text-blue-800 uppercase tracking-widest font-mono">
                      System Securities Division Ledger Booklet
                    </span>
                  </div>
                  <div className="text-right text-[9px] text-slate-500 font-sans leading-relaxed">
                    <div>Branch: Mohan Nagar, Ghaziabad</div>
                    <div>Member: {member.name} ({member.id})</div>
                  </div>
                </div>

                {/* Investment Details Header */}
                <div className="bg-slate-50 border border-slate-300 rounded p-3 mb-4 text-[10px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1.5 bg-slate-200 px-2 py-0.5 rounded font-bold">
                    <span className="uppercase text-slate-800">
                      {isRD ? 'Recurring Deposit (RD)' : 'Fixed Deposit (FD)'} • Contract ID #{inv.id}
                    </span>
                    <span className="font-mono text-slate-600">Scheme ID: {inv.schemeId}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-medium">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase font-bold">Amount booking</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatRupee(inv.amount)}{isRD ? '/mo' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase font-bold">Interest Yield</span>
                      <span className="font-bold text-slate-800 font-mono">{inv.interestPct.toFixed(1)}% p.a.</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase font-bold">Booking Date</span>
                      <span className="font-bold text-slate-800 font-mono">{inv.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase font-bold">Maturity Date</span>
                      <span className="font-bold text-slate-800 font-mono">{inv.maturityDate}</span>
                    </div>
                  </div>
                </div>

                {/* Ledger entries subhead */}
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Ledger installment Entries (Page {chunkIdx + 1} of {chunks.length})
                </h3>

                {/* Transaction list table */}
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-[10px] text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white font-semibold uppercase text-[8px]">
                        <th className="px-3 py-1.5 text-center w-10">No.</th>
                        <th className="px-3 py-1.5 w-24">Date</th>
                        <th className="px-3 py-1.5">Details Particulars</th>
                        <th className="px-3 py-1.5 text-center w-12">Type</th>
                        <th className="px-3 py-1.5 text-right w-20">Amount</th>
                        <th className="px-3 py-1.5 text-right w-20">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {chunk.map((t, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center font-bold text-slate-400 font-mono">{t.index}</td>
                          <td className="px-3 py-1.5 text-slate-500 font-mono">{t.date}</td>
                          <td className="px-3 py-1.5 text-slate-800 font-bold">{t.particulars}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="text-slate-500 bg-slate-100 font-bold px-1 py-0.2 rounded font-mono text-[7.5px]">
                              {t.type}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-slate-700 font-mono">{formatRupee(t.amount)}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-black text-slate-950">
                            {formatRupee(t.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accrued summary metrics */}
              <div className="mt-4 pt-4 border-t border-slate-200 text-[9px] text-slate-550 flex flex-col justify-end">
                <div className="flex justify-between leading-normal mb-8">
                  <div>
                    <div className="font-bold text-slate-700 uppercase text-[8px]">Print Page sync log</div>
                    {isRD ? (
                      <div>Split ledger installments recursively (limit: exactly 6 entries per printed page).</div>
                    ) : (
                      <div>Single premium fixed deposit book index sheet.</div>
                    )}
                  </div>
                  <div className="text-right font-medium">
                    <span className="text-slate-650 font-bold block text-[10px]">
                      Contract Accumulated Value:{' '}
                      <span className="font-mono text-slate-900 font-black">
                        {formatRupee(isRD ? inv.amount * (inv.paidMonths ? inv.paidMonths.length : 0) : inv.amount)}
                      </span>
                    </span>
                    {isRD && (
                      <div className="text-[8px] text-slate-400 font-bold">
                        Installments Paid: {inv.paidMonths ? inv.paidMonths.length : 0} out of {inv.durationYears * 12} Scheduled
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer annotation */}
                <div className="border-t border-slate-250 pt-1 text-[8px] text-slate-400 flex justify-between">
                  <span>Subject to central system auditing. Verify with ledger ID {inv.id}.</span>
                  <span className="font-bold">
                    Page {chunkIdx + 1} of {chunks.length} (Contract {invIndex + 1}/{activeInvestments.length})
                  </span>
                </div>
              </div>
            </div>
          ));
        })}
      </div>

    </div>
  );
}
