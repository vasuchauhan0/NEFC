export interface Company {
  name: string;
  short: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  copyright: string;
  about: string;
}

export interface HeroContent {
  tag: string;
  title: string;
  subtitle: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface StepItem {
  num: number;
  title: string;
  desc: string;
}

export interface TrustItem {
  icon: string;
  title: string;
  desc: string;
}

export interface InvestmentScheme {
  id: string; // e.g. "FS-3" or "RI-5"
  type: 'fd' | 'rd';
  durationYears: number;
  interestPct: number; // Annual interest rate
  maturityAmountPreview: number; // preview for FD (e.g. ₹1 Lakh) or RD (₹5,000/mo)
  status: 'Active' | 'Popular' | 'Closed';
}

export interface MemberInvestment {
  id: string;
  schemeId: string;
  schemeType: 'fd' | 'rd';
  amount: number; // Principal for FD, monthly amount for RD
  interestPct: number; // Annual interest percentage
  durationYears: number;
  startDate: string; // ISO date format YYYY-MM-DD
  maturityDate: string; // ISO date format YYYY-MM-DD
  status: 'Active' | 'Completed';
  paidMonths?: string[];
}

export interface Member {
  id: string; // Member ID
  name: string;
  email: string;
  phone: string;
  city: string;
  password: string; // login password
  status: 'Active' | 'Inactive';
  memberSince: string; // Format e.g., "June 2024" or date string
  investments: MemberInvestment[];
  // KYC Details
  fatherName?: string;
  aadharNumber?: string;
  panNumber?: string;
  nomineeName?: string;
  nomineeRelation?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  contact: string;
  phone?: string;
  subject: string;
  message: string;
  date: string;
  read: boolean;
}

export interface SiteData {
  adminPass: string;
  company: Company;
  hero: HeroContent;
  announcement: string;
  stats: StatItem[];
  steps: StepItem[];
  trust: TrustItem[];
  schemes: InvestmentScheme[];
  members: Member[];
  messages: ContactMessage[];
}