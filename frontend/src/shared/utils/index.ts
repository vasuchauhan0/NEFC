import { SiteData } from '../types/index.ts';
import { DEFAULT_SITE_DATA } from '../constants/defaultData.ts';

export function formatRupee(amount: number): string {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
}

export function calculateFDMaturity(principal: number, annualRate: number, years: number): {
  maturityAmount: number;
  interestEarned: number;
} {
  const maturityAmount = Math.round(principal * Math.pow(1 + annualRate / 100, years));
  const interestEarned = maturityAmount - principal;
  return { maturityAmount, interestEarned };
}

export function calculateRDMaturity(monthlyDeposit: number, annualRate: number, years: number): {
  totalDeposited: number;
  maturityAmount: number;
  interestEarned: number;
} {
  const P = monthlyDeposit;
  const i = (annualRate / 100) / 12;
  const n = Math.round(years * 12);
  
  if (i === 0) {
    const totalDeposited = P * n;
    return {
      totalDeposited,
      maturityAmount: totalDeposited,
      interestEarned: 0
    };
  }

  const totalDeposited = P * n;
  const amount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const maturityAmount = Math.round(amount);
  const interestEarned = Math.max(0, maturityAmount - totalDeposited);

  return {
    totalDeposited,
    maturityAmount,
    interestEarned
  };
}

export function addYearsToDate(startDateStr: string, years: number): string {
  try {
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) {
      return startDateStr;
    }
    const monthsToAdd = Math.round(years * 12);
    date.setMonth(date.getMonth() + monthsToAdd);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return startDateStr;
  }
}

export function formatDateReadable(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

export function loadSiteData(): SiteData {
  try {
    const stored = localStorage.getItem('nefc_site_data_v1');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.adminPass && parsed.company && parsed.members && parsed.schemes) {
        return parsed as SiteData;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored site data, loading defaults', e);
  }
  
  localStorage.setItem('nefc_site_data_v1', JSON.stringify(DEFAULT_SITE_DATA));
  return DEFAULT_SITE_DATA;
}

export function saveSiteData(data: SiteData): void {
  try {
    localStorage.setItem('nefc_site_data_v1', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save site data to localStorage', e);
  }
}

export function formatDuration(years: number): string {
  const totalMonths = Math.round(years * 12);
  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;

  const parts: string[] = [];
  if (yrs > 0) {
    parts.push(`${yrs} ${yrs === 1 ? 'Year' : 'Years'}`);
  }
  if (mos > 0) {
    parts.push(`${mos} ${mos === 1 ? 'Month' : 'Months'}`);
  }
  if (parts.length === 0) {
    return '0 Months';
  }
  return parts.join(' ');
}

export function formatDurationShort(years: number): string {
  const totalMonths = Math.round(years * 12);
  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;

  const parts: string[] = [];
  if (yrs > 0) {
    parts.push(`${yrs} ${yrs === 1 ? 'Yr' : 'Yrs'}`);
  }
  if (mos > 0) {
    parts.push(`${mos} ${mos === 1 ? 'Mo' : 'Mos'}`);
  }
  if (parts.length === 0) {
    return '0 Mo';
  }
  return parts.join(' ');
}

