import React, { useState } from 'react';
import { X, IdCard, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Member, MemberInvestment } from '../../../shared/types/index.ts';
import { calculateFDMaturity, calculateRDMaturity } from '../../../shared/utils/index.ts';

interface PolicyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  company: {
    name: string;
    email: string;
    phone: string;
  };
}

const formatAmountRaw = (num: number): string => {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const getMaturityAmount = (inv: MemberInvestment) => {
  if (inv.schemeType === 'fd') {
    return calculateFDMaturity(inv.amount, inv.interestPct, inv.durationYears).maturityAmount;
  } else {
    return calculateRDMaturity(inv.amount, inv.interestPct, inv.durationYears).maturityAmount;
  }
};

const Row = ({ label1, value1, label2, value2 }: { label1: string; value1: string; label2: string; value2: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-200 last:border-b-0">
    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[130px_1fr] border-b sm:border-b-0 sm:border-r border-slate-200">
      <div className="bg-slate-50 px-3 py-2.5 text-[11px] sm:text-xs font-bold text-slate-700">{label1}</div>
      <div className="px-3 py-2.5 text-[11px] sm:text-xs text-slate-800 font-medium break-words">: {value1}</div>
    </div>
    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr]">
      <div className="bg-slate-50 px-3 py-2.5 text-[11px] sm:text-xs font-bold text-slate-700">{label2}</div>
      <div className="px-3 py-2.5 text-[11px] sm:text-xs text-slate-800 font-medium break-words">: {value2}</div>
    </div>
  </div>
);

export default function PolicyDetailsModal({ isOpen, onClose, member, company }: PolicyDetailsModalProps) {
  const activeInvestments = member.investments || [];
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!isOpen) return null;

  const activeInv = activeInvestments[selectedIdx];

  const handleDownloadPDF = () => {
    if (!activeInv) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PRIMARY = [22, 101, 192];
    const GRAY = [241, 245, 249];
    const TEXT = [15, 23, 42];

    doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company.name.toUpperCase(), 15, 10);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Email: ${company.email} | Tel: ${company.phone}`, 15, 16);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('POLICY DETAILS', 170, 14);

    const rows: [string, string, string, string][] = [
      ['Member Id', member.id, 'Policy No', activeInv.id],
      ['Member Name', member.name, 'Policy Opening Date', activeInv.startDate],
      ['Address / City', member.city || 'N/A', 'Nominee Name', member.nomineeName ? `${member.nomineeName} (${member.nomineeRelation || 'N/A'})` : 'N/A'],
      ['Plan', activeInv.schemeId, 'Period', `${activeInv.durationYears * 12} Months`],
      ['Policy Amount (INR)', formatAmountRaw(activeInv.amount), 'Total Payable Amount (INR)',
        formatAmountRaw(activeInv.schemeType === 'rd' ? activeInv.amount * activeInv.durationYears * 12 : activeInv.amount)],
      ['Maturity Date', activeInv.maturityDate, 'Maturity Amount (INR)', formatAmountRaw(getMaturityAmount(activeInv))],
      ['Status', activeInv.status, 'Support', company.phone],
    ];

    let y = 35;
    const rowH = 10;
    rows.forEach((r, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(GRAY[0], GRAY[1], GRAY[2]);
        doc.rect(15, y, 180, rowH, 'F');
      }
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(r[0], 17, y + 6.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(`: ${r[1]}`, 55, y + 6.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(r[2], 108, y + 6.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(`: ${r[3]}`, 150, y + 6.5);
      y += rowH;
    });

    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 35, 180, rowH * rows.length, 'S');

    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | This is a computer-generated excerpt.`, 15, y + 10);

    doc.save(`${member.id}_${activeInv.id}_Policy_Details.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60000] bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden h-full sm:h-auto sm:max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-150 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <IdCard size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Member & Policy Details</h3>
              <p className="text-[10px] text-slate-400">{company.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadPDF}
              disabled={!activeInv}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
            >
              <Download size={13} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto">
          {!activeInv ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No active policy found for this member yet.
            </div>
          ) : (
            <>
              {activeInvestments.length > 1 && (
                <div className="mb-4">
                  <label htmlFor="policy-select" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Select Policy
                  </label>
                  <select
                    id="policy-select"
                    value={selectedIdx}
                    onChange={(e) => setSelectedIdx(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {activeInvestments.map((inv, idx) => (
                      <option key={inv.id} value={idx}>
                        {inv.schemeId} &bull; {inv.id} ({inv.schemeType === 'rd' ? 'Recurring Deposit' : 'Fixed Deposit'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <Row label1="Member Id" value1={member.id} label2="Policy No" value2={activeInv.id} />
                <Row label1="Member Name" value1={member.name} label2="Policy Opening Date" value2={activeInv.startDate} />
                <Row
                  label1="Address / City"
                  value1={member.city || 'N/A'}
                  label2="Nominee Name"
                  value2={member.nomineeName ? `${member.nomineeName} (${member.nomineeRelation || 'N/A'})` : 'N/A'}
                />
                <Row label1="Plan" value1={activeInv.schemeId} label2="Period" value2={`${activeInv.durationYears * 12} Months`} />
                <Row
                  label1="Policy Amount (INR)"
                  value1={formatAmountRaw(activeInv.amount)}
                  label2="Total Payable Amount (INR)"
                  value2={formatAmountRaw(
                    activeInv.schemeType === 'rd' ? activeInv.amount * activeInv.durationYears * 12 : activeInv.amount
                  )}
                />
                <Row
                  label1="Maturity Date"
                  value1={activeInv.maturityDate}
                  label2="Maturity Amount (INR)"
                  value2={formatAmountRaw(getMaturityAmount(activeInv))}
                />
                <Row label1="Status" value1={activeInv.status} label2="Support" value2={company.phone} />
              </div>

              <p className="text-[10px] text-slate-400 mt-4 text-center">
                For an official printable/downloadable copy of this ledger, use "View &amp; Download Deposits".
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}