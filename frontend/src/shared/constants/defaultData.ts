import { SiteData } from '../types/index.ts';

export const DEFAULT_SITE_DATA: SiteData = {
  adminPass: 'nefc@admin',
  company: {
    name: 'Nation Empower Finance Capital',
    short: 'NEFC',
    address: '4th Floor, Plot No F-32, Crown Plaza, Mohan Nagar, Ghaziabad, Uttar Pradesh — 201007',
    email: 'nefcpay@gmail.com',
    phone: '+91 98765 43210',
    website: 'www.nefc.co.in',
    copyright: '© 2026 Nation Empower Finance Capital. All rights reserved.',
    about: 'Nation Empower Finance Capital (NEFC) is a private finance institution based in Ghaziabad, Uttar Pradesh. With over 4 years of unwavering trust, we have been helping thousands of active members grow their savings securely through robust Fixed Deposit and Recurring Deposit schemes.\n\nOur mission is to offer stable, secure financial alternatives that exceed traditional return rates, driven by legal compliance, prompt payouts, and ethical management. We operate with standard receipt-backed formal processes, maintaining full transparency in every account ledger.'
  },
  hero: {
    tag: 'Trusted Investment partner since 4+ years',
    title: 'Your trusted partner for FD & RD investments',
    subtitle: 'Nation Empower Finance Capital — helping thousands of members grow their savings safely. Transparent, secure, and always by your side.'
  },
  announcement: '🔥 New RS-4 Scheme active! Get up to 11.0% annual interest on Recurring Deposits. Contact us today!',
  stats: [
    { value: '4+', label: 'Years of Trust' },
    { value: '5,000+', label: 'Active Members' },
    { value: '₹12 Cr+', label: 'Assets Managed' },
    { value: '11.0%', label: 'Max Return Rate' }
  ],
  steps: [
    { num: 1, title: 'Choose tenure', desc: 'Browse our range of high-yield FD & RD investment options.' },
    { num: 2, title: 'Register Account', desc: 'Obtain an official Member ID registered at our branch offices.' },
    { num: 3, title: 'Secure Deposits', desc: 'Allocate funds securely with automated receipt and passbook ledger entries.' },
    { num: 4, title: 'Earn Higher Returns', desc: 'Collect maximum interest paid exactly on the date of maturity with zero hassle.' }
  ],
  trust: [
    { icon: 'Shield', title: '100% Capital Safety', desc: 'Deploying asset-backed funds and conservative commercial credit protocols.' },
    { icon: 'Clock', title: 'On-Time Payouts', desc: 'Commitment to zero delay. Funds are remitted directly on the calendar maturity date.' },
    { icon: 'FileCheck', title: 'Formally Certified', desc: 'Compliant with credit cooperative rules, backed by stamped receipt bonds.' },
    { icon: 'HeartHandshake', title: 'Branch Support', desc: 'Direct access to your Ghaziabad office and prompt telephone customer service.' }
  ],
  schemes: [
    { id: 'FS-1', type: 'fd', durationYears: 1, interestPct: 7.5, maturityAmountPreview: 107500, status: 'Active' },
    { id: 'FS-2', type: 'fd', durationYears: 2, interestPct: 8.2, maturityAmountPreview: 117070, status: 'Active' },
    { id: 'FS-3', type: 'fd', durationYears: 3, interestPct: 9.0, maturityAmountPreview: 129500, status: 'Popular' },
    { id: 'FS-4', type: 'fd', durationYears: 5, interestPct: 10.5, maturityAmountPreview: 164740, status: 'Active' },
    { id: 'RS-1', type: 'rd', durationYears: 1, interestPct: 7.8, maturityAmountPreview: 62580, status: 'Active' },
    { id: 'RS-2', type: 'rd', durationYears: 2, interestPct: 8.5, maturityAmountPreview: 130980, status: 'Active' },
    { id: 'RS-3', type: 'rd', durationYears: 3, interestPct: 9.2, maturityAmountPreview: 206340, status: 'Popular' },
    { id: 'RS-4', type: 'rd', durationYears: 5, interestPct: 11.0, maturityAmountPreview: 395400, status: 'Active' }
  ],
  members: [
    {
      id: 'NEFC-2025-001',
      name: 'Amit Sharma',
      email: 'amit@gmail.com',
      phone: '9876543210',
      city: 'Ghaziabad',
      password: 'amit',
      status: 'Active',
      memberSince: '2025-01-15',
      investments: [
        {
          id: 'INV-101',
          schemeId: 'FS-3',
          schemeType: 'fd',
          amount: 100000,
          interestPct: 9.0,
          durationYears: 3,
          startDate: '2025-01-20',
          maturityDate: '2028-01-20',
          status: 'Active'
        },
        {
          id: 'INV-102',
          schemeId: 'RS-3',
          schemeType: 'rd',
          amount: 5000,
          interestPct: 9.2,
          durationYears: 3,
          startDate: '2025-02-01',
          maturityDate: '2028-02-01',
          status: 'Active'
        }
      ]
    },
    {
      id: 'NEFC-2025-002',
      name: 'Priyanka Verma',
      email: 'priyanka@gmail.com',
      phone: '9123456789',
      city: 'Noida',
      password: 'priyanka',
      status: 'Active',
      memberSince: '2025-03-10',
      investments: [
        {
          id: 'INV-201',
          schemeId: 'FS-1',
          schemeType: 'fd',
          amount: 50000,
          interestPct: 7.5,
          durationYears: 1,
          startDate: '2025-03-12',
          maturityDate: '2026-03-12',
          status: 'Active'
        }
      ]
    },
    {
      id: 'NEFC-2025-003',
      name: 'Rajesh Kumar',
      email: 'kumar@gmail.com',
      phone: '9988776655',
      city: 'Delhi',
      password: 'kumar',
      status: 'Inactive',
      memberSince: '2025-05-01',
      investments: []
    }
  ],
  messages: [
    {
      id: 'MSG-001',
      name: 'Vikas Gupta',
      contact: 'vikas@gmail.com',
      subject: 'Fixed Deposit query for 5 years',
      message: 'Hello, I want to invest ₹5 Lakhs in your FS-4 scheme. What documents are needed to verify membership, and do you issue physical certificate bonds for the deposit? Please call or email me back.',
      date: '2026-06-05T10:15:30.000Z',
      read: false
    },
    {
      id: 'MSG-002',
      name: 'Sunita Roy',
      contact: '9898774433',
      subject: 'RD maturity query',
      message: 'My brother Amit is already a member. I am looking to initiate an RD of ₹10,000 per month. Do you support online bank transfers or auto-debit for monthly deposits?',
      date: '2026-06-06T14:45:00.000Z',
      read: true
    }
  ]
};
