import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { X, Download, Landmark, RefreshCw, Wallet } from 'lucide-react';
import { Member, MemberInvestment } from '../../../shared/types/index.ts';
import { formatRupee, formatDateReadable } from '../../../shared/utils/index.ts';

interface MemberTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
}

// Helper: turn month names out of a "YYYY-MM" style string
const getInstallmentMonthLabel = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[monthIndex] || ''} ${parts[0]}`.trim();
  } catch (e) {
    return dateStr;
  }
};

// Build a simple transaction list for one investment (deposits only)
const getTransactions = (inv: MemberInvestment) => {
  if (inv.schemeType === 'rd') {
    const paidMonths = [...(inv.paidMonths || [])].sort();
    const startDay = inv.startDate ? inv.startDate.split('-')[2] || '01' : '01';
    return paidMonths.map((monthStr, index) => {
      const dateStr = `${monthStr}-${startDay}`;
      return {
        date: dateStr,
        label: getInstallmentMonthLabel(monthStr),
        amount: inv.amount,
        runningTotal: inv.amount * (index + 1)
      };
    });
  }
  return [
    {
      date: inv.startDate,
      label: 'Opening deposit',
      amount: inv.amount,
      runningTotal: inv.amount
    }
  ];
};

export default function MemberTransactionsModal({ isOpen, onClose, member, company }: MemberTransactionsModalProps) {
  const activeInvestments = member.investments || [];
  const [selectedInvId, setSelectedInvId] = useState<string>(
    activeInvestments.length > 0 ? activeInvestments[0].id : ''
  );

  if (!isOpen) return null;

  const activeInv = activeInvestments.find(inv => inv.id === selectedInvId) || activeInvestments[0];

  if (!activeInv) {
    return (
      <div className="fixed inset-0 z-[60000] bg-slate-900/85 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-slate-800">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <Landmark size={40} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold">No deposits found</h3>
          <p className="text-xs text-slate-500">
            You don't have any active Fixed or Recurring Deposit accounts yet.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isRD = activeInv.schemeType === 'rd';
  const transactions = getTransactions(activeInv);
  const totalDeposited = transactions.length > 0 ? transactions[transactions.length - 1].runningTotal : 0;

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PRIMARY = [22, 101, 192];
    const TEXT_MAIN = [15, 23, 42];
    const TEXT_MUTED = [100, 116, 139];

    doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
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
    doc.text('DEPOSIT & TRANSACTION SUMMARY', 130, 20);

    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${member.name}`, 15, 34);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Member ID: ${member.id}  |  Account: ${activeInv.id}  |  Scheme: ${isRD ? 'Recurring Deposit' : 'Fixed Deposit'} (${activeInv.schemeId})`, 15, 40);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 45, 195, 45);

    doc.setFillColor(241, 245, 249);
    doc.rect(15, 50, 180, 10);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.text('Date', 18, 56.5);
    doc.text('Particulars', 60, 56.5);
    doc.text('Amount (INR)', 195, 56.5, { align: 'right' });

    let y = 65;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    transactions.forEach((t) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatDateReadable(t.date), 18, y);
      doc.text(t.label, 60, y);
      doc.text(t.amount.toLocaleString('en-IN'), 195, y, { align: 'right' });
      y += 8;
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y - 4, 195, y - 4);
    });

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total deposited till date:', 60, y);
    doc.text(totalDeposited.toLocaleString('en-IN'), 195, y, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('This is a computer-generated summary for reference purposes only.', 15, 287);

    doc.save(`${member.name.replace(/\s+/g, '_')}_deposits_${activeInv.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/90 backdrop-blur-sm flex flex-col justify-center items-center p-2 sm:p-4 text-slate-800">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh] border border-slate-200">
        {/* HEADER */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-white min-w-0">
            <div className="bg-blue-600 p-2 rounded-xl flex-shrink-0">
              <Wallet size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="font-sans text-sm font-bold leading-none truncate">My Deposits & Transactions</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-none">View and download your deposit history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer flex-shrink-0"
            title="Close"
            id="close-member-transactions"
          >
            <X size={16} />
          </button>
        </div>

        {/* ACCOUNT SELECTOR (only if more than one investment) */}
        {activeInvestments.length > 1 && (
          <div className="px-5 pt-4">
            <select
              value={selectedInvId}
              onChange={(e) => setSelectedInvId(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer focus:outline-none focus:border-blue-500"
            >
              {activeInvestments.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.schemeType.toUpperCase()} - #{inv.id} ({inv.schemeId})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* SUMMARY */}
        <div className="px-5 pt-4">
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl flex-shrink-0 ${isRD ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                {isRD ? <RefreshCw size={16} /> : <Landmark size={16} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {isRD ? 'Recurring Deposit' : 'Fixed Deposit'} ({activeInv.schemeId})
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Account: {activeInv.id}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Deposited</p>
              <p className="text-sm font-bold text-emerald-700 font-mono">{formatRupee(totalDeposited)}</p>
            </div>
          </div>
        </div>

        {/* TRANSACTION LIST */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-8">
              No deposits recorded yet for this account.
            </div>
          ) : (
            transactions.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 bg-white border border-slate-150 rounded-xl px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{t.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDateReadable(t.date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-900 font-mono">{formatRupee(t.amount)}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">Total: {formatRupee(t.runningTotal)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={handleDownloadPDF}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-xs cursor-pointer transition-all"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}