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
  id: string;
  type: 'fd' | 'rd';
  durationYears: number;
  interestPct: number;
  maturityAmountPreview: number;
  status: 'Active' | 'Popular' | 'Closed';
}

export interface MemberInvestment {
  id: string;
  schemeId: string;
  schemeType: 'fd' | 'rd';
  amount: number;
  interestPct: number;
  durationYears: number;
  startDate: string;
  maturityDate: string;
  status: 'Active' | 'Completed';
  paidMonths?: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  status: 'Active' | 'Inactive';
  memberSince: string;
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
  subject: string;
  phone?: string;
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
  adminFailedAttempts?: number;
  adminLockoutUntil?: number;
}
