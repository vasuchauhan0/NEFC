import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatRupee, formatDateReadable } from '../../../shared/utils/index.ts';

interface DashboardStatsProps {
  totalAmount: number;
  activeCount: number;
  memberSince: string;
}

export default function DashboardStats({ totalAmount, activeCount, memberSince }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Value Weight</div>
        <div className="text-xl sm:text-2xl font-bold text-blue-700 font-mono mt-2">
          {formatRupee(totalAmount)}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Lump FD + Total RD scale</p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Deposits</div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
          {activeCount}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Booked active schedules</p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Member Since</div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
          {formatDateReadable(memberSince || '2025-01-01')}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Initial registration logs</p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ledge Account Status</div>
        <div className="text-xl sm:text-2xl font-bold text-emerald-600 flex items-center gap-1.5 mt-2 text-sm sm:text-lg">
          <ShieldCheck size={18} className="text-emerald-500" />
          Active Certified
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Cooperative bylaws compliant</p>
      </div>
    </div>
  );
}
