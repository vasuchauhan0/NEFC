/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { 
  Users, 
  Landmark, 
  RefreshCw, 
  FileText, 
  MessageSquare, 
  Settings, 
  Activity, 
  Plus, 
  Edit, 
  Trash, 
  Download, 
  ShieldAlert, 
  Sparkles, 
  PlusCircle, 
  Check, 
  X, 
  Phone, 
  Mail, 
  Globe, 
  Lock, 
  VolumeX, 
  Volume2, 
  Info,
  Calendar,
  LogOut,
  TrendingUp,
  BookOpen,
  Menu,
  Search
} from 'lucide-react';
import { SiteData, Member, InvestmentScheme, ContactMessage, MemberInvestment } from '../shared/types/index.ts';
import { formatRupee, formatDateReadable, addYearsToDate, calculateFDMaturity, calculateRDMaturity } from '../shared/utils/index.ts';
import PassbookModal from '../features/member/components/PassbookModal.tsx';

interface AdminPortalProps {
  siteData: SiteData;
  onUpdateData: (newData: SiteData) => Promise<void>;
  onExit: () => void;
}

export default function AdminPortal({ siteData, onUpdateData, onExit }: AdminPortalProps) {
  // Safe fallbacks — prevents crash if admin data not loaded yet
  const safeData = {
    ...siteData,
    members:  siteData.members  ?? [],
    messages: siteData.messages ?? [],
    schemes:  siteData.schemes  ?? [],
  };
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [adminMobileOpen, setAdminMobileOpen] = useState<boolean>(false);
  
  // Search & Filter
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [memberFilter, setMemberFilter] = useState<string>('');

  // Modals
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [showSchemeModal, setShowSchemeModal] = useState<boolean>(false);
  const [selectedScheme, setSelectedScheme] = useState<InvestmentScheme | null>(null);

  // Nested Investment Drawer/Modal
  const [showInvestmentModal, setShowInvestmentModal] = useState<boolean>(false);
  const [investingMemberId, setInvestingMemberId] = useState<string>('');
  const [newInvestment, setNewInvestment] = useState({
    schemeId: '',
    amount: 100000,
    startDate: new Date().toISOString().split('T')[0]
  });

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // State for unified member details & investment control modal
  const [selectedDetailMemberId, setSelectedDetailMemberId] = useState<string | null>(null);
  const [passbookMember, setPassbookMember] = useState<Member | null>(null);
  const [activeInvestmentSubTab, setActiveInvestmentSubTab] = useState<'fd' | 'rd'>('fd');
  const [inlineInvestment, setInlineInvestment] = useState({
    schemeId: '',
    amount: 100000,
    startDate: new Date().toISOString().split('T')[0]
  });

  // State for local inline investment editing
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null);
  const [editingInvestmentAmount, setEditingInvestmentAmount] = useState<number>(0);
  const [editingPaidMonthsId, setEditingPaidMonthsId] = useState<string | null>(null);
  const [editingPaidMonthsCount, setEditingPaidMonthsCount] = useState<number>(0);

  // Rates Update Sheet
  const [ratesSheet, setRatesSheet] = useState<Record<string, { interestPct: number; maturityAmountPreview: number }>>({});

  // Pagination state for local RD instalments list
  const [instalmentsPage, setInstalmentsPage] = useState<number>(1);
  const [instalmentsSearch, setInstalmentsSearch] = useState<string>('');

  // Pagination state for local registered members list
  const [membersPage, setMembersPage] = useState<number>(1);

  // Synchronize state with current data
  React.useEffect(() => {
    if (siteData && safeData.schemes) {
      const sheet: Record<string, { interestPct: number; maturityAmountPreview: number }> = {};
      safeData.schemes.forEach(s => {
        sheet[s.id] = {
          interestPct: s.interestPct,
          maturityAmountPreview: s.maturityAmountPreview
        };
      });
      setRatesSheet(sheet);
    }
  }, [safeData.schemes]);

  const handleRatesSheetChange = (schemeId: string, interestPct: number, maturityAmountPreview: number) => {
    setRatesSheet(prev => ({
      ...prev,
      [schemeId]: {
        interestPct,
        maturityAmountPreview
      }
    }));
  };

  const handleSaveRatesSheet = async () => {
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: ratesSheet })
      });
      const data = await res.json();
      if (data.success) {
        await onUpdateData({
          ...siteData,
          schemes: data.schemes
        });
        triggerToast('Interest rates and maturity values updated in bulk!', 'success');
      } else {
        triggerToast(data.error || 'Failed to update rates', 'error');
      }
    } catch (e) {
      triggerToast('Server connection failed', 'error');
    }
  };

  // Form states
  const [heroForm, setHeroForm] = useState({ ...siteData.hero });
  const [companyForm, setCompanyForm] = useState({ ...siteData.company });
  const [announcementText, setAnnouncementText] = useState<string>(siteData.announcement || '');
  const [adminPassForm, setAdminPassForm] = useState({ newPass: '', confirmPass: '' });

  // OTP password verification states
  const [adminPhone, setAdminPhone] = useState(siteData.company.phone || '');
  const [adminOtpCode, setAdminOtpCode] = useState<string>('');
  const [adminOtpInput, setAdminOtpInput] = useState<string>('');
  const [isAdminOtpSent, setIsAdminOtpSent] = useState<boolean>(false);
  const [isAdminOtpVerified, setIsAdminOtpVerified] = useState<boolean>(false);
  const [otpNotification, setOtpNotification] = useState<{ text: string; isOpen: boolean }>({ text: '', isOpen: false });

  const handleSendAdminOtp2 = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/otp/send`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setIsAdminOtpSent(true);
      setIsAdminOtpVerified(false);
      setAdminOtpInput('');
      triggerToast('OTP sent to admin Gmail inbox!', 'success');
    } else {
      triggerToast(data.error || 'Failed to send OTP', 'error');
    }
  } catch {
    triggerToast('Unable to reach OTP service', 'error');
  }
};

  const handleVerifyAdminOtp2 = async () => {
  if (!adminOtpInput.trim()) {
    triggerToast('Please enter the OTP first', 'error');
    return;
  }
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: adminOtpInput.trim() })
    });
    const data = await res.json();
    if (data.success) {
      setIsAdminOtpVerified(true);
      triggerToast('Email verified! You can now save the new password.', 'success');
    } else {
      triggerToast(data.error || 'Invalid OTP', 'error');
    }
  } catch {
    triggerToast('Unable to reach OTP service', 'error');
  }
  };
  const handleVerifyOtpAndChangePassword = async () => {
  if (!adminOtpInput.trim()) {
    triggerToast('Please enter the OTP first', 'error');
    return;
  }
  if (!adminPassForm.newPass) {
    triggerToast('Please type the new password phrase first', 'error');
    return;
  }
  if (adminPassForm.newPass !== adminPassForm.confirmPass) {
    triggerToast('Passwords mismatch!', 'error');
    return;
  }
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: adminOtpInput.trim() })
    });
    const data = await res.json();
    if (data.success) {
      setIsAdminOtpVerified(true);
      const updated = { ...siteData, adminPass: adminPassForm.newPass };
      await handleSaveData(updated, 'Admin password changed via OTP verification');
      setAdminPassForm({ newPass: '', confirmPass: '' });
      setIsAdminOtpSent(false);
      setIsAdminOtpVerified(false);
      setAdminOtpInput('');
      setAdminOtpCode('');
      setOtpNotification({ text: '', isOpen: false });
      triggerToast('Password changed successfully!', 'success');
    } else {
      triggerToast(data.error || 'Invalid OTP', 'error');
    }
  } catch {
    triggerToast('Unable to reach OTP service', 'error');
  }
};

  const [schemeForm, setSchemeForm] = useState({
    id: '',
    type: 'fd' as 'fd' | 'rd',
    durationYears: 3,
    interestPct: 9.5,
    maturityAmountPreview: 135000,
    status: 'Active' as InvestmentScheme['status']
  });

  // Keep schemeForm in sync with the modal trigger
  React.useEffect(() => {
    if (showSchemeModal) {
      if (selectedScheme) {
        setSchemeForm({
          id: selectedScheme.id,
          type: selectedScheme.type,
          durationYears: selectedScheme.durationYears,
          interestPct: selectedScheme.interestPct,
          maturityAmountPreview: selectedScheme.maturityAmountPreview || 100000,
          status: selectedScheme.status
        });
      } else {
        setSchemeForm({
          id: '',
          type: 'fd',
          durationYears: 3,
          interestPct: 9.5,
          maturityAmountPreview: 133120,
          status: 'Active'
        });
      }
    }
  }, [showSchemeModal, selectedScheme]);

  const recalculateMaturity = (type: 'fd' | 'rd', duration: number, interest: number) => {
    if (type === 'fd') {
      const { maturityAmount } = calculateFDMaturity(100000, interest, duration);
      return maturityAmount;
    } else {
      const { maturityAmount } = calculateRDMaturity(5000, interest, duration);
      return maturityAmount;
    }
  };

  // Notifications
  const [toast, setToast] = useState<{ text: string; mode: 'success' | 'error' | '' }>({ text: '', mode: '' });

  const triggerToast = (text: string, mode: 'success' | 'error' = 'success') => {
    setToast({ text, mode });
    setTimeout(() => setToast({ text: '', mode: '' }), 3500);
  };

  const handleSaveData = async (updated: SiteData, msg = 'Data published successfully') => {
    try {
      await onUpdateData(updated);
      triggerToast(msg, 'success');
    } catch (e) {
      triggerToast('Server sync fail', 'error');
    }
  };

  // MEMBERS MGMT
  const handleOpenAddMember = () => {
    setSelectedMember(null);
    setShowMemberModal(true);
  };

  const getUniqueGeneratedMemberId = (): string => {
    let index = safeData.members.length + 11;
    let attemptedId = `NEFC-2026-0${index}`;
    while (safeData.members.some(m => m.id === attemptedId)) {
      index++;
      attemptedId = `NEFC-2026-0${index}`;
    }
    return attemptedId;
  };

  const handleOpenEditMember = (m: Member) => {
    setSelectedMember(m);
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Auto-generate a secure unique ID on creation, or use edited/pre-existing ID on update
    let mId = (fd.get('id') || selectedMember?.id) as string;
    if (!selectedMember) {
      mId = getUniqueGeneratedMemberId();
    }
    
    const mName = fd.get('name') as string;
    const mEmail = fd.get('email') as string;
    const mPhone = fd.get('phone') as string;
    const mCity = fd.get('city') as string;
    const mPass = fd.get('password') as string;
    const mStatus = fd.get('status') as Member['status'];
    const mMemberSince = fd.get('memberSince') as string;
    const mFatherName = fd.get('fatherName') as string;
    const mAadhar = fd.get('aadharNumber') as string;
    const mPan = fd.get('panNumber') as string;
    const mNomineeName = fd.get('nomineeName') as string;
    const mNomineeRelation = fd.get('nomineeRelation') as string;

    if (!mId || !mName || !mEmail) {
      triggerToast('Fill in all key credentials', 'error');
      return;
    }

    // Verify Unique Email Requirement
    const isEmailRegistered = safeData.members.some(
      m => m.email.trim().toLowerCase() === mEmail.trim().toLowerCase() && m.id !== mId
    );
    if (isEmailRegistered) {
      triggerToast('this email is already registered', 'error');
      return;
    }

    const updatedMembers = [...safeData.members];
    const memberObj: Member = {
      id: mId,
      name: mName,
      email: mEmail,
      phone: mPhone,
      city: mCity,
      password: mPass || 'nefc@123',
      status: mStatus,
      memberSince: mMemberSince || selectedMember?.memberSince || new Date().toISOString().split('T')[0],
      investments: selectedMember?.investments || [],
      fatherName: mFatherName || undefined,
      aadharNumber: mAadhar || undefined,
      panNumber: mPan || undefined,
      nomineeName: mNomineeName || undefined,
      nomineeRelation: mNomineeRelation || undefined,
    };

    if (selectedMember) {
      const idx = updatedMembers.findIndex(m => m.id === selectedMember.id);
      if (idx !== -1) updatedMembers[idx] = memberObj;
    } else {
      updatedMembers.unshift(memberObj);
    }

    const nextData = { ...siteData, members: updatedMembers };
    await handleSaveData(nextData, 'Member profile saved');
    setShowMemberModal(false);
  };

  const handleDeleteMember = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member Account',
      message: 'Are you sure you want to delete this member? All of their active and historical investment records will be permanently discarded from the system.',
      onConfirm: async () => {
        const nextMembers = safeData.members.filter(m => m.id !== id);
        try {
          const API = import.meta.env.VITE_API_URL || '';
          await fetch(`${API}/api/members`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': localStorage.getItem('nefc_admin_token') || '',
            },
            body: JSON.stringify({ action: 'delete', id }),
          });
        } catch (err) {
          console.error('Failed to delete member on backend:', err);
        }
        await handleSaveData({ ...siteData, members: nextMembers }, 'Member account deleted');
        setSelectedDetailMemberId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // SCHEMES MGMT
  const handleOpenAddScheme = () => {
    setSelectedScheme(null);
    setShowSchemeModal(true);
  };

  const handleOpenEditScheme = (s: InvestmentScheme) => {
    setSelectedScheme(s);
    setShowSchemeModal(true);
  };

  const handleSaveScheme = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sId = schemeForm.id;
    const sType = schemeForm.type;
    const sYears = schemeForm.durationYears;
    const sInterest = schemeForm.interestPct;
    const sMaturity = schemeForm.maturityAmountPreview;
    const sStatus = schemeForm.status;

    if (!sId) {
      triggerToast('Scheme ID is required', 'error');
      return;
    }

    // Build the clean Scheme object 
    const schemeObj: InvestmentScheme = {
      id: sId,
      type: sType,
      durationYears: sYears,
      interestPct: sInterest,
      maturityAmountPreview: sMaturity,
      status: sStatus
    };

    try {
      const API = import.meta.env.VITE_API_URL || '';
      
      // Send a dedicated save command to the proper backend schemes controller
      const response = await fetch(`${API}/api/schemes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem('nefc_admin_token') || '',
        },
        body: JSON.stringify({ 
          action: 'save', 
          scheme: schemeObj 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Sync local React frontend state with returned backend database records
        await onUpdateData({ 
          ...siteData, 
          schemes: data.schemes || [] 
        });
        
        triggerToast('Investment scheme configurations saved', 'success');
        setShowSchemeModal(false);
      } else {
        triggerToast(data.error || 'Failed to save scheme on backend', 'error');
      }
    } catch (err) {
      console.error('Failed to save scheme on backend:', err);
      triggerToast('Server connection failed', 'error');
    }
  };

  const handleDeleteScheme = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Scheme Model',
      message: `Are you sure you want to delete the scheme "${id}"? This catalog plan option will no longer be visible to newly booked investments.`,
      onConfirm: async () => {
        const next = safeData.schemes.filter(s => s.id !== id);
        try {
          const API = import.meta.env.VITE_API_URL || '';
          await fetch(`${API}/api/schemes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': localStorage.getItem('nefc_admin_token') || '',
            },
            body: JSON.stringify({ action: 'delete', id }),
          });
        } catch (err) {
          console.error('Failed to delete scheme on backend:', err);
        }
        await handleSaveData({ ...siteData, schemes: next }, 'Scheme discarded');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // INVESTMENTS BOOKING
  const handleOpenAddInvestment = (memberId: string) => {
    setInvestingMemberId(memberId);
    const firstScheme = safeData.schemes.length > 0 ? safeData.schemes[0].id : '';
    setNewInvestment({ schemeId: firstScheme, amount: 100000, startDate: new Date().toISOString().split('T')[0] });
    setShowInvestmentModal(true);
  };

  const handleAddInvestment = async () => {
    const mem = safeData.members.find(m => m.id === investingMemberId);
    const scheme = safeData.schemes.find(s => s.id === newInvestment.schemeId);
    if (!mem || !scheme) {
      triggerToast('Invalid member or scheme parameters select', 'error');
      return;
    }

    const item: MemberInvestment = {
      id: `INV-${Date.now()}`,
      schemeId: scheme.id,
      schemeType: scheme.type,
      amount: newInvestment.amount,
      interestPct: scheme.interestPct,
      durationYears: scheme.durationYears,
      startDate: newInvestment.startDate,
      maturityDate: addYearsToDate(newInvestment.startDate, scheme.durationYears),
      status: 'Active'
    };

    const updatedMembers = safeData.members.map(m => {
      if (m.id === investingMemberId) {
        return {
          ...m,
          investments: [item, ...m.investments]
        };
      }
      return m;
    });

    await handleSaveData({ ...siteData, members: updatedMembers }, 'New investment transaction booked successfully');
    setShowInvestmentModal(false);
  };

  const handleInlineAddInvestment = async (schemeType: 'fd' | 'rd') => {
    if (!selectedDetailMemberId) return;
    const mem = safeData.members.find(m => m.id === selectedDetailMemberId);
    
    // Find the chosen scheme or dynamic default
    let targetSchemeId = inlineInvestment.schemeId;
    let scheme = safeData.schemes.find(s => s.id === targetSchemeId);
    if (!scheme || scheme.type !== schemeType) {
      const candidates = safeData.schemes.filter(s => s.type === schemeType && s.status !== 'Closed');
      if (candidates.length > 0) {
        scheme = candidates[0];
        targetSchemeId = scheme.id;
      }
    }

    if (!mem || !scheme) {
      triggerToast(`Please add an active ${schemeType.toUpperCase()} scheme to the Catalog first.`, 'error');
      return;
    }

    const item: MemberInvestment = {
      id: `INV-${Date.now()}`,
      schemeId: scheme.id,
      schemeType: scheme.type,
      amount: inlineInvestment.amount,
      interestPct: scheme.interestPct,
      durationYears: scheme.durationYears,
      startDate: inlineInvestment.startDate,
      maturityDate: addYearsToDate(inlineInvestment.startDate, scheme.durationYears),
      status: 'Active'
    };

    const updatedMembers = safeData.members.map(m => {
      if (m.id === selectedDetailMemberId) {
        return {
          ...m,
          investments: [item, ...(m.investments || [])]
        };
      }
      return m;
    });

    await handleSaveData({ ...siteData, members: updatedMembers }, `New ${schemeType.toUpperCase()} investment booked for ${mem.name}`);
    
    setInlineInvestment({
      schemeId: '',
      amount: schemeType === 'fd' ? 100000 : 5000,
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteInvestment = (memberId: string, investmentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Ledger Transaction',
      message: 'Are you sure you want to permanently revoke and delete this active investment ledger item? This action is irreversible and affects the member portfolio balance calculations.',
      onConfirm: async () => {
        const updatedMembers = safeData.members.map(m => {
          if (m.id === memberId) {
            return {
              ...m,
              investments: m.investments.filter(i => i.id !== investmentId)
            };
          }
          return m;
        });
        try {
          const API = import.meta.env.VITE_API_URL || '';
          await fetch(`${API}/api/members`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': localStorage.getItem('nefc_admin_token') || '',
            },
            body: JSON.stringify({ action: 'delete-investment', memberId, investmentId }),
          });
        } catch (err) {
          console.error('Failed to delete investment on backend:', err);
        }
        await handleSaveData({ ...siteData, members: updatedMembers }, 'Investment ledger record deleted');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateInvestmentAmount = async (memberId: string, investmentId: string, newAmount: number) => {
    if (newAmount <= 0 || isNaN(newAmount)) {
      triggerToast('Investment amount must be a positive number', 'error');
      return;
    }

    const updatedMembers = safeData.members.map(m => {
      if (m.id === memberId) {
        const nextInvestments = (m.investments || []).map(inv => {
          if (inv.id === investmentId) {
            return {
              ...inv,
              amount: newAmount
            };
          }
          return inv;
        });
        return { ...m, investments: nextInvestments };
      }
      return m;
    });

    await handleSaveData({ ...siteData, members: updatedMembers }, 'Investment ledger amount modified successfully');
    setEditingInvestmentId(null);
  };

  const handleUpdatePaidMonths = async (memberId: string, investmentId: string, count: number, startDateStr: string) => {
    if (count < 0 || isNaN(count)) {
      triggerToast('Number of paid months cannot be negative', 'error');
      return;
    }

    const nextPaidMonths: string[] = [];
    let baseYear = 2026;
    let baseMonth = 1; // January

    if (startDateStr) {
      const parts = startDateStr.split('-');
      if (parts.length >= 2) {
        const parsedYear = parseInt(parts[0], 10);
        const parsedMonth = parseInt(parts[1], 10);
        if (!isNaN(parsedYear) && !isNaN(parsedMonth)) {
          baseYear = parsedYear;
          baseMonth = parsedMonth;
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const currentMonthNum = ((baseMonth - 1 + i) % 12) + 1;
      const currentYearNum = baseYear + Math.floor((baseMonth - 1 + i) / 12);
      const monthStr = `${currentYearNum}-${currentMonthNum.toString().padStart(2, '0')}`;
      nextPaidMonths.push(monthStr);
    }

    const updatedMembers = safeData.members.map(m => {
      if (m.id === memberId) {
        const nextInvestments = (m.investments || []).map(inv => {
          if (inv.id === investmentId) {
            return {
              ...inv,
              paidMonths: nextPaidMonths
            };
          }
          return inv;
        });
        return { ...m, investments: nextInvestments };
      }
      return m;
    });

    await handleSaveData({ ...siteData, members: updatedMembers }, 'Number of paid months updated successfully');
    setEditingPaidMonthsId(null);
  };

  // OTHER ADMIN WRITES
  const handleSaveAnnouncement = async () => {
    await handleSaveData({ ...siteData, announcement: announcementText }, 'Announcement updated');
  };

  const handleClearAnnouncement = async () => {
    setAnnouncementText('');
    await handleSaveData({ ...siteData, announcement: '' }, 'Announcement banner disabled');
  };

  const handleSaveHero = async () => {
    await handleSaveData({ ...siteData, hero: heroForm }, 'Homepage hero updated');
  };

  const handleSaveCompany = async () => {
    const updated = {
      ...siteData,
      company: companyForm
    };
    await handleSaveData(updated, 'Corporate registry details updated');
  };



  const handleMessageDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to permanently delete this support request message from the inbox records?',
      onConfirm: async () => {
        const remainingMsgs = safeData.messages.filter(m => m.id !== id);
        try {
          const API = import.meta.env.VITE_API_URL || '';
          await fetch(`${API}/api/messages/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': localStorage.getItem('nefc_admin_token') || '',
            },
            body: JSON.stringify({ id }),
          });
        } catch (err) {
          console.error('Failed to delete message on backend:', err);
        }
        await handleSaveData({ ...siteData, messages: remainingMsgs }, 'Message deleted from inbox');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filters for render list
  const filteredMembers = safeData.members.filter(m => {
    const matchQuery = m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                       m.id.toLowerCase().includes(memberSearch.toLowerCase());
    const matchFilter = memberFilter === '' ? true : m.status === memberFilter;
    return matchQuery && matchFilter;
  });

  // Calculate Metrics totals for Admin overview pane
  const totalBonds = safeData.members.reduce((sum, m) => sum + (m.investments?.length || 0), 0);
  const totalCapitalInPlay = safeData.members.reduce((sum, m) => {
    return sum + (m.investments || []).reduce((acc, inv) => {
      if (inv.schemeType === 'fd') return acc + inv.amount;
      const paidMonthsCount = inv.paidMonths ? inv.paidMonths.length : 0;
      return acc + (inv.amount * paidMonthsCount);
    }, 0);
  }, 0);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      
      {/* Toast Alert Widget */}
      {toast.text && (
        <div className={`fixed bottom-6 right-6 z-[50000] px-5 py-3.5 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 animate-bounce ${
          toast.mode === 'success' 
            ? 'bg-emerald-550 border-emerald-600 text-white bg-emerald-600' 
            : 'bg-red-550 border-red-600 text-white bg-red-600'
        }`}>
          <Check size={16} />
          {toast.text}
        </div>
      )}

      {/* SMS Simulation Alert Banner */}
      {otpNotification.isOpen && (
        <div className="fixed top-6 right-6 z-[60000] max-w-sm w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl p-4 animate-bounce border-l-4 border-l-blue-500">
          <div className="flex gap-3">
            <div className="bg-blue-600/25 p-2 rounded-xl text-blue-400 self-start">
              💬
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">SMS Gateway Dispatch</span>
                <button 
                  onClick={() => setOtpNotification(prev => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-white cursor-pointer select-none"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="text-xs text-slate-200 font-medium mt-1 leading-relaxed">
                {otpNotification.text}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[9px] text-slate-500 font-mono font-bold">Sender: NEFC_SECURE</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(adminOtpCode);
                    triggerToast('OTP code copied with success!', 'success');
                  }}
                  className="text-[10.5px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  Copy Code: {adminOtpCode} &larr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {adminMobileOpen && (
        <div 
          onClick={() => setAdminMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />
      )}

      {/* Admin Panel Side rail */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-950 text-slate-300 flex flex-col justify-between flex-shrink-0 select-none transition-transform duration-200 lg:static lg:translate-x-0 ${
        adminMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          {/* Logo Brand Title */}
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-serif text-lg font-black tracking-tight text-white flex items-center gap-2">
                <ShieldAlert className="text-blue-500" size={18} />
                {siteData.company.short} Control
              </h3>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mt-1">
                Ledger Administrator
              </span>
            </div>
            <button 
              onClick={() => setAdminMobileOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Side rail Menus */}
          <nav className="p-4 space-y-1 text-sm bg-slate-900">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider py-1 pl-3">Overview</div>
            <button
              onClick={() => { setActiveTab('dashboard'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Activity size={16} />
              Admin Dashboard
            </button>

            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pt-4 pb-1 pl-3">Management</div>
            <button
              onClick={() => { setActiveTab('members'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'members' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Users size={16} />
              Registered Members
            </button>
            <button
              onClick={() => { setActiveTab('schemes'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'schemes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Landmark size={16} />
              Investment Schemes
            </button>
            <button
              onClick={() => { setActiveTab('instalments'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'instalments' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Calendar size={16} />
              Due Instalments
            </button>
            <button
              onClick={() => { setActiveTab('rates'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'rates' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
              id="admin-nav-rates"
            >
              <TrendingUp size={16} />
              Interest Rates Manager
            </button>

            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pt-4 pb-1 pl-3">Design &amp; Communication</div>
            <button
              onClick={() => { setActiveTab('homepage'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'homepage' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <FileText size={16} />
              Website Layout
            </button>
            <button
              onClick={() => { setActiveTab('announce'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'announce' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Volume2 size={16} />
              Announcements
            </button>
            <button
              onClick={() => { setActiveTab('messages'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'messages' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <MessageSquare size={16} />
                Prospect Messages
              </span>
              {safeData.messages.filter(m => !m.read).length > 0 && (
                <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full tracking-wider uppercase animate-pulse">
                  NEW
                </span>
              )}
            </button>

            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pt-4 pb-1 pl-3">Systems</div>
            <button
              onClick={() => { setActiveTab('security'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'security' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Lock size={16} />
              Password Security
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setAdminMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <Settings size={16} />
              Wipe &amp; Backup
            </button>
          </nav>
        </div>

        {/* Exit link */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={() => { onExit(); setAdminMobileOpen(false); }}
            className="w-full bg-slate-850 hover:bg-slate-800 hover:text-white px-3 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            Exit Admin Center
          </button>
        </div>
      </aside>

      {/* Main Panel Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex justify-between items-center px-4 sm:px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAdminMobileOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-center transition-colors"
              id="admin-mobile-burger"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base sm:text-lg font-serif font-bold text-slate-800 capitalize select-none">
              Module: {activeTab}
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse" />
            Active Administrator Session Secured
          </div>
        </header>

        {/* Operational Scroll Containers */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Members</div>
                  <div className="text-2xl sm:text-3xl font-serif text-slate-800 font-bold mt-2">
                    {safeData.members.length}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Registries listed in system</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Bookings</div>
                  <div className="text-2xl sm:text-3xl font-serif text-slate-800 font-bold mt-2">
                    {totalBonds}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Booked active investment ledgers</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Deposits Weight</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-700 font-mono mt-2 text-lg sm:text-xl lg:text-3xl">
                    {formatRupee(totalCapitalInPlay)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Total combined asset capital</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Messages</div>
                  <div className="text-xl sm:text-3xl font-serif text-slate-800 font-bold mt-2">
                    {safeData.messages.filter(m => !m.read).length}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Unread support inquiries</p>
                </div>
                <div 
                  onClick={() => setActiveTab('instalments')}
                  className="bg-white border border-amber-200 hover:border-amber-400 p-5 rounded-2xl shadow-xs transition-colors cursor-pointer select-none group col-span-2 sm:col-span-1"
                >
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Due Instalments</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 block animate-pulse animate-none" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono mt-2 group-hover:text-amber-850 transition-colors">
                    {(() => {
                      let count = 0;
                      safeData.members.forEach(m => {
                        if (m.status === 'Active') {
                          (m.investments || []).forEach(inv => {
                            if (inv.schemeType === 'rd' && inv.status === 'Active' && !(inv.paidMonths || []).includes('2026-06')) {
                              count++;
                            }
                          });
                        }
                      });
                      return count;
                    })()} Due
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Outstanding Due</span>
                    <span className="font-semibold text-amber-700 font-mono text-[9px]">
                      {formatRupee(
                        safeData.members.reduce((sum, m) => {
                          if (m.status !== 'Active') return sum;
                          return sum + (m.investments || []).reduce((acc, inv) => {
                            if (inv.schemeType === 'rd' && inv.status === 'Active' && !(inv.paidMonths || []).includes('2026-06')) {
                              return acc + inv.amount;
                            }
                            return acc;
                          }, 0);
                        }, 0)
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {/* Message inbox logs and member rosters highlights */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Inbox Panel */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex justify-between items-center">
                    <span>Recent support messages</span>
                    <button onClick={() => setActiveTab('messages')} className="text-xs font-semibold text-blue-700 hover:underline">
                      See Inbox
                    </button>
                  </h4>
                  <div className="divide-y divide-slate-100 mt-3 max-h-80 overflow-y-auto">
                    {safeData.messages.slice(0, 3).map((m) => (
                      <div key={m.id} className="py-3 text-xs">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{m.name} ({m.subject})</span>
                          <span className="text-slate-400 font-mono text-[10px]">{m.date.split('T')[0]}</span>
                        </div>
                        <p className="text-slate-500 mt-1 line-clamp-2 leading-relaxed">{m.message}</p>
                      </div>
                    ))}
                    {safeData.messages.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-8">No current message logs.</p>
                    )}
                  </div>
                </div>

                {/* Member Highlights Panel */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex justify-between items-center">
                    <span>Recently registered members</span>
                    <button onClick={() => setActiveTab('members')} className="text-xs font-semibold text-blue-700 hover:underline">
                      Manage Rosters
                    </button>
                  </h4>
                  <div className="divide-y divide-slate-100 mt-3">
                    {safeData.members.slice(0, 3).map((m) => (
                      <div key={m.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{m.name}</div>
                          <span className="text-slate-400 font-mono text-[10px]">ID: {m.id}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                    {safeData.members.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-8">No registered members roster in system database.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Due Instalments Dashboard Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Pending Due Instalments (June 2026)
                  </span>
                  <button onClick={() => setActiveTab('instalments')} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
                    See All Due Instalments
                  </button>
                </h4>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                        <th className="py-2.5 px-3">Member ID</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Plan/Scheme ID</th>
                        <th className="py-2.5 px-3">Due Instalment</th>
                        <th className="py-2.5 px-3 text-right">Instant Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {(() => {
                        const dueRds: Array<{
                          member: Member;
                          investment: MemberInvestment;
                        }> = [];
                        safeData.members.forEach(m => {
                          if (m.status === 'Active') {
                            (m.investments || []).forEach(inv => {
                              if (inv.schemeType === 'rd' && inv.status === 'Active' && !(inv.paidMonths || []).includes('2026-06')) {
                                dueRds.push({ member: m, investment: inv });
                              }
                            });
                          }
                        });

                        if (dueRds.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 font-medium italic">
                                ✓ Verified: All Recurring Deposit (RD) instalments are cleanly collected for June 2026!
                              </td>
                            </tr>
                          );
                        }

                        return dueRds.slice(0, 4).map(({ member, investment }) => (
                          <tr key={investment.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-700">{member.id}</td>
                            <td className="py-3.5 px-3 font-semibold text-slate-900">{member.name}</td>
                            <td className="py-3.5 px-3">
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                {investment.schemeId}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-bold font-mono text-amber-700">
                              {formatRupee(investment.amount)}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <button
                                onClick={async () => {
                                  const updatedMembers = safeData.members.map(m => {
                                    if (m.id === member.id) {
                                      const updatedInvestments = m.investments.map(inv => {
                                        if (inv.id === investment.id) {
                                          const paid = inv.paidMonths || [];
                                          return {
                                            ...inv,
                                            paidMonths: [...paid, '2026-06']
                                          };
                                        }
                                        return inv;
                                      });
                                      return { ...m, investments: updatedInvestments };
                                    }
                                    return m;
                                  });
                                  await handleSaveData({ ...siteData, members: updatedMembers }, `Monthly RD instalment for ${member.name} registered as Paid from Dashboard`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                              >
                                ✓ Recieve Payment
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS DIRECTORY SECTION */}
          {activeTab === 'members' && (() => {
            const itemsPerPage = 10;
            const totalItems = filteredMembers.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
            const currentPage = Math.max(1, Math.min(membersPage, totalPages));
            const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            // Calculate pagination window pages (up to 5 page numbers)
            const pages: number[] = [];
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) {
              startPage = Math.max(1, endPage - 4);
            }
            for (let i = startPage; i <= endPage; i++) {
              pages.push(i);
            }

            return (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setMembersPage(1); // Reset to first page
                      }}
                      className="px-4 py-2 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 w-64 shadow-xs"
                      placeholder="Search query (name, ID)..."
                    />
                    <select
                      value={memberFilter}
                      onChange={(e) => {
                        setMemberFilter(e.target.value);
                        setMembersPage(1); // Reset to first page
                      }}
                      className="px-3 py-2 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">All Statuses Models</option>
                      <option value="Active">Active Models Only</option>
                      <option value="Inactive">Suspended Accounts Only</option>
                    </select>
                  </div>

                  <button
                    onClick={handleOpenAddMember}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 text-sm shadow-xs transition-transform"
                  >
                    <PlusCircle size={16} />
                    Register New Member
                  </button>
                </div>

                {/* Members table list */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Member ID</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Profile Name</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Contact Channels</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">City</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Ledge Items</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">System Access</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {paginatedMembers.map((m) => {
                          const mInvests = m.investments || [];
                          return (
                            <tr 
                              key={m.id} 
                              onClick={() => {
                                setSelectedDetailMemberId(m.id);
                                setActiveInvestmentSubTab('fd');
                              }}
                              className="hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <td className="py-4 px-4 font-mono font-bold text-slate-800 text-xs">{m.id}</td>
                              <td className="py-4 px-4 font-semibold text-slate-900">{m.name}</td>
                              <td className="py-4 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-slate-700">{m.email}</span>
                                  <span className="text-slate-400 font-mono text-[10px]">{m.phone}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-slate-600">{m.city}</td>
                              <td className="py-4 px-4">
                                <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">
                                  {mInvests.length} Active Plan
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {m.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-1.5 items-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditMember(m);
                                    }}
                                    className="text-slate-600 hover:text-blue-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Edit member details"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMember(m.id);
                                    }}
                                    className="text-slate-400 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete member from registry"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paginatedMembers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No members registry found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 text-slate-600 flex items-center justify-center gap-6 py-4 px-6 select-none shadow-xs">
                      {currentPage > 1 && (
                        <button
                          onClick={() => setMembersPage(currentPage - 1)}
                          className="font-bold text-xs text-slate-700 hover:text-blue-600 active:scale-95 transition-all cursor-pointer tracking-wider uppercase border border-slate-200 px-3.5 py-1.5 rounded-xl bg-white shadow-xs hover:border-slate-300"
                        >
                          Prev
                        </button>
                      )}

                      <div className="flex items-center gap-2 text-sm font-bold">
                        {pages.map(p => {
                          const isActive = p === currentPage;
                          return (
                            <button
                              key={p}
                              onClick={() => setMembersPage(p)}
                              className={`relative flex items-center justify-center h-8 w-8 rounded-xl cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-blue-600 text-white shadow-xs font-bold' 
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                              }`}
                            >
                              <span className="text-xs">{p}</span>
                            </button>
                          );
                        })}
                      </div>

                      {currentPage < totalPages && (
                        <button
                          onClick={() => setMembersPage(currentPage + 1)}
                          className="font-bold text-xs text-slate-700 hover:text-blue-600 active:scale-95 transition-all cursor-pointer tracking-wider uppercase border border-slate-200 px-3.5 py-1.5 rounded-xl bg-white shadow-xs hover:border-slate-300"
                        >
                          Next
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: SCHEME MODEL CONFIGS */}
          {activeTab === 'schemes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Configure financial schemes listed on your public sites.</span>
                <button
                  onClick={handleOpenAddScheme}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1 text-sm shadow-xs transition-colors"
                >
                  <Plus size={16} />
                  Add Plan SKU
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* FD Model listings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h4 className="font-serif text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                    <Landmark size={16} className="text-blue-600" />
                    Fixed Deposits Catalog SKU
                  </h4>
                  <div className="divide-y divide-slate-150 mt-3">
                    {safeData.schemes.filter(s => s.type === 'fd').map((s) => (
                      <div key={s.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-mono font-bold text-slate-800 text-sm">{s.id}</div>
                          <span className="text-slate-400 font-sans mt-0.5 block">
                            Term: {s.durationYears} {s.durationYears === 1 ? 'year' : 'years'} | @ {s.interestPct.toFixed(1)}% compound
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                            s.status === 'Popular' ? 'bg-amber-100 text-amber-800' : s.status === 'Closed' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {s.status}
                          </span>
                          <button onClick={() => handleOpenEditScheme(s)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => handleDeleteScheme(s.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-700">
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RD Model listings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h4 className="font-serif text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                    <RefreshCw size={16} className="text-emerald-700" />
                    Recurring Deposits Catalog SKU
                  </h4>
                  <div className="divide-y divide-slate-150 mt-3">
                    {safeData.schemes.filter(s => s.type === 'rd').map((s) => (
                      <div key={s.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-mono font-bold text-slate-800 text-sm">{s.id}</div>
                          <span className="text-slate-400 font-sans mt-0.5 block">
                            Term: {s.durationYears} {s.durationYears === 1 ? 'year' : 'years'} | @ {s.interestPct.toFixed(1)}% compound
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                            s.status === 'Popular' ? 'bg-amber-100 text-amber-800' : s.status === 'Closed' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {s.status}
                          </span>
                          <button onClick={() => handleOpenEditScheme(s)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => handleDeleteScheme(s.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-700">
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DUE INSTALMENTS */}
          {activeTab === 'instalments' && (() => {
            const instalmentsList: Array<{
              key: string;
              member: Member;
              investment: MemberInvestment;
              monthKey: string;
              isPaid: boolean;
              monthLabel: string;
              dueDay: number;
              dueDate: Date;
            }> = [];

            safeData.members.forEach(m => {
              if (m.status === 'Active') {
                (m.investments || []).forEach(inv => {
                  if (inv.schemeType === 'rd' && inv.status === 'Active') {
                    const paidMonths = inv.paidMonths || [];
                    const start = new Date(inv.startDate);
                    const now = new Date();
                    const dueDay = start.getDate();

                    let d = new Date(start.getFullYear(), start.getMonth(), 1);
                    const limit = new Date(now.getFullYear(), now.getMonth(), 1);

                    while (d <= limit) {
                      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                      const isPaid = paidMonths.includes(monthKey);
                      const monthLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                      const dDate = new Date(d.getFullYear(), d.getMonth(), dueDay);

                      instalmentsList.push({
                        key: `${inv.id}-${monthKey}`,
                        member: m,
                        investment: inv,
                        monthKey,
                        isPaid,
                        monthLabel,
                        dueDay,
                        dueDate: dDate,
                      });
                      d.setMonth(d.getMonth() + 1);
                    }
                  }
                });
              }
            });

            // "those installment are pending it show first also" -> unpaid (isPaid=false) first
            // secondary sort by dueDate descending (most recent first)
            instalmentsList.sort((a, b) => {
              if (a.isPaid !== b.isPaid) {
                return a.isPaid ? 1 : -1;
              }
              return b.dueDate.getTime() - a.dueDate.getTime();
            });

            // Filter instalmentsList based on the search state query
            const filteredInstalments = instalmentsList.filter(item => {
              if (!instalmentsSearch) return true;
              const term = instalmentsSearch.toLowerCase().trim();
              return (
                item.member.name.toLowerCase().includes(term) ||
                item.member.id.toLowerCase().includes(term) ||
                item.investment.schemeId.toLowerCase().includes(term) ||
                item.monthLabel.toLowerCase().includes(term)
              );
            });

            const itemsPerPage = 10;
            const totalItems = filteredInstalments.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
            const currentPage = Math.max(1, Math.min(instalmentsPage, totalPages));
            const paginatedItems = filteredInstalments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            // Calculate pagination window pages (up to 5 page numbers)
            const pages: number[] = [];
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) {
              startPage = Math.max(1, endPage - 4);
            }
            for (let i = startPage; i <= endPage; i++) {
              pages.push(i);
            }

            return (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-slate-800">Due Instalments ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Members with Recurring Deposit (RD) instalments due this month
                    </p>
                  </div>
                  
                  {/* Visual stats mini summary */}
                  <div className="flex gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Received This Month</span>
                      <strong className="text-emerald-800 text-sm font-bold font-mono">
                        {formatRupee(
                          safeData.members.reduce((sum, m) => {
                            if (m.status !== 'Active') return sum;
                            return sum + (m.investments || []).reduce((acc, inv) => {
                              if (inv.schemeType === 'rd' && inv.status === 'Active' && (inv.paidMonths || []).includes('2026-06')) {
                                return acc + inv.amount;
                              }
                              return acc;
                            }, 0);
                          }, 0)
                        )}
                      </strong>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-xs">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Outstanding Due</span>
                      <strong className="text-amber-800 text-sm font-bold font-mono">
                        {formatRupee(
                          safeData.members.reduce((sum, m) => {
                            if (m.status !== 'Active') return sum;
                            return sum + (m.investments || []).reduce((acc, inv) => {
                              if (inv.schemeType === 'rd' && inv.status === 'Active' && !(inv.paidMonths || []).includes('2026-06')) {
                                return acc + inv.amount;
                              }
                              return acc;
                            }, 0);
                          }, 0)
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Search Bar matching website style */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 border border-slate-150 p-4 rounded-2xl shadow-2xs">
                  <div className="relative w-full sm:w-80">
                    <input
                      type="text"
                      value={instalmentsSearch}
                      onChange={(e) => {
                        setInstalmentsSearch(e.target.value);
                        setInstalmentsPage(1); // Reset page selection on search
                      }}
                      className="w-full pl-9 pr-8 py-2 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs placeholder-slate-400 font-medium"
                      placeholder="Search by name, member ID, scheme ID..."
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={14} />
                    </div>
                    {instalmentsSearch && (
                      <button
                        onClick={() => {
                          setInstalmentsSearch('');
                          setInstalmentsPage(1);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {instalmentsSearch && (
                    <div className="text-xs text-slate-500 font-medium">
                      Found <strong className="text-blue-600 font-semibold">{totalItems}</strong> matching instalments
                    </div>
                  )}
                </div>

                {/* Installments Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Member ID</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Member Name</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Scheme ID</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Due Date</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Amount</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500">Status</th>
                          <th className="py-3 px-4 font-semibold uppercase text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {paginatedItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                              No active Recurring Deposit (RD) accounts found.
                            </td>
                          </tr>
                        ) : (
                          paginatedItems.map(({ key, member, investment, monthKey, isPaid, monthLabel, dueDay }) => (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="py-4 px-4 font-mono font-bold text-xs text-[#185FA5]">{member.id}</td>
                              <td className="py-4 px-4 font-semibold text-slate-900">{member.name}</td>
                              <td className="py-4 px-4">
                                <span className="bg-slate-100 font-mono font-bold text-slate-800 px-2 py-0.5 rounded text-xs">
                                  {investment.schemeId}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-slate-650 font-semibold font-mono">
                                {monthLabel.split(' ')[0]} {dueDay}, {monthLabel.split(' ')[1]}
                              </td>
                              <td className="py-4 px-4 font-mono font-black text-slate-800">{formatRupee(investment.amount)}</td>
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {isPaid ? 'Paid & Audited' : 'Monthly Due'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isPaid ? (
                                  <span className="text-xs text-emerald-700 font-bold flex items-center justify-end gap-1">
                                    <Check size={14} /> Remitted
                                  </span>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      const updatedMembers = safeData.members.map(m => {
                                        if (m.id === member.id) {
                                          return {
                                            ...m,
                                            investments: m.investments.map(inv => {
                                              if (inv.id === investment.id) {
                                                return { ...inv, paidMonths: [...(inv.paidMonths || []), monthKey] };
                                              }
                                              return inv;
                                            })
                                          };
                                        }
                                        return m;
                                      });
                                      await handleSaveData({ ...siteData, members: updatedMembers }, `RD instalment ${monthLabel} for ${member.name} marked as Paid`);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1 ml-auto"
                                  >
                                    <Check size={12} /> Mark paid
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 text-slate-600 flex items-center justify-center gap-6 py-4 px-6 select-none shadow-xs">
                      {currentPage > 1 && (
                        <button
                          onClick={() => setInstalmentsPage(currentPage - 1)}
                          className="font-bold text-xs text-slate-700 hover:text-blue-600 active:scale-95 transition-all cursor-pointer tracking-wider uppercase border border-slate-200 px-3.5 py-1.5 rounded-xl bg-white shadow-xs hover:border-slate-300"
                        >
                          Prev
                        </button>
                      )}

                      <div className="flex items-center gap-2 text-sm font-bold">
                        {pages.map(p => {
                          const isActive = p === currentPage;
                          return (
                            <button
                              key={p}
                              onClick={() => setInstalmentsPage(p)}
                              className={`relative flex items-center justify-center h-8 w-8 rounded-xl cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-blue-600 text-white shadow-xs font-bold' 
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                              }`}
                            >
                              <span className="text-xs">{p}</span>
                            </button>
                          );
                        })}
                      </div>

                      {currentPage < totalPages && (
                        <button
                          onClick={() => setInstalmentsPage(currentPage + 1)}
                          className="font-bold text-xs text-slate-700 hover:text-blue-600 active:scale-95 transition-all cursor-pointer tracking-wider uppercase border border-slate-200 px-3.5 py-1.5 rounded-xl bg-white shadow-xs hover:border-slate-300"
                        >
                          Next
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 8: DYNAMIC INTEREST RATES MANAGEMENT */}
          {activeTab === 'rates' && (
            <div className="space-y-6 animate-fade-in max-w-5xl">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-950">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="text-blue-400" size={20} />
                      Interest Rates Management System
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                      Adjust interest rates model-wide and propagate maturity calculators instantly. Use the automatic compound calculator assistants to sync exact yields for members.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleSaveRatesSheet}
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs px-6 py-3 rounded-xl transition-all duration-155 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Check size={14} />
                      Publish &amp; Commit Rates
                    </button>
                  </div>
                </div>
              </div>

              {/* FD Interest Rates Pane */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="font-serif text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-1.5 uppercase tracking-wider mb-4">
                  <Landmark size={16} className="text-blue-600" />
                  Fixed Deposit (FD) Rates &amp; Compounding (Principal: ₹1,00,000 standard)
                </h4>

                <div className="space-y-4">
                  {safeData.schemes.filter(s => s.type === 'fd').map((s) => {
                    const currentRateObj = ratesSheet[s.id] || { interestPct: s.interestPct, maturityAmountPreview: s.maturityAmountPreview };
                    const autoFD = calculateFDMaturity(100000, currentRateObj.interestPct, s.durationYears);
                    
                    return (
                      <div key={s.id} className="border border-slate-150 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                        <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Scheme SKU</span>
                            <span className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              {s.id}
                              {s.status === 'Popular' && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded">Popular</span>
                              )}
                            </span>
                            <span className="text-slate-400 text-[10px] mt-0.5 block">Term: {s.durationYears} {s.durationYears === 1 ? 'Year' : 'Years'}</span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Interest Rate (% P.A.)</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="30"
                                value={currentRateObj.interestPct}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleRatesSheetChange(s.id, val, currentRateObj.maturityAmountPreview);
                                }}
                                className="w-24 px-2 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-right"
                              />
                              <span className="text-xs text-slate-500 font-medium">%</span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Maturity Preview (for ₹1L)</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 font-semibold">₹</span>
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={currentRateObj.maturityAmountPreview}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  handleRatesSheetChange(s.id, currentRateObj.interestPct, val);
                                }}
                                className="w-28 px-2 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-right font-mono"
                              />
                            </div>
                          </div>

                          <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 border-slate-100 pt-2 lg:pt-0">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Math Assistant</span>
                            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                              Yields <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{formatRupee(autoFD.maturityAmount)}</strong>
                            </div>
                            <span className="text-[9px] text-slate-400 italic font-medium block mt-0.5">Interest: {formatRupee(autoFD.interestEarned)}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 md:pt-0">
                          <button
                            onClick={() => {
                              handleRatesSheetChange(s.id, currentRateObj.interestPct, autoFD.maturityAmount);
                              triggerToast(`Applied compounding yield ${formatRupee(autoFD.maturityAmount)} FD preview`, 'success');
                            }}
                            className="bg-slate-100 hover:bg-blue-50 text-slate-755 hover:text-blue-700 font-bold text-[10px] uppercase px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-200 cursor-pointer transition-colors"
                          >
                            Apply compound math
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RD Interest Rates Pane */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="font-serif text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-1.5 uppercase tracking-wider mb-4">
                  <RefreshCw size={16} className="text-emerald-700" />
                  Recurring Deposit (RD) Rates &amp; Yield (Monthly: ₹5,000 standard)
                </h4>

                <div className="space-y-4">
                  {safeData.schemes.filter(s => s.type === 'rd').map((s) => {
                    const currentRateObj = ratesSheet[s.id] || { interestPct: s.interestPct, maturityAmountPreview: s.maturityAmountPreview };
                    const autoRD = calculateRDMaturity(5000, currentRateObj.interestPct, s.durationYears);
                    
                    return (
                      <div key={s.id} className="border border-slate-150 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                        <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Scheme SKU</span>
                            <span className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              {s.id}
                              {s.status === 'Popular' && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded">Popular</span>
                              )}
                            </span>
                            <span className="text-slate-400 text-[10px] mt-0.5 block">Term: {s.durationYears} {s.durationYears === 1 ? 'Year' : 'Years'}</span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Interest Rate (% P.A.)</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="30"
                                value={currentRateObj.interestPct}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleRatesSheetChange(s.id, val, currentRateObj.maturityAmountPreview);
                                }}
                                className="w-24 px-2 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-right"
                              />
                              <span className="text-xs text-slate-500 font-medium">%</span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Maturity Preview (for ₹5K/m)</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 font-semibold">₹</span>
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={currentRateObj.maturityAmountPreview}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  handleRatesSheetChange(s.id, currentRateObj.interestPct, val);
                                }}
                                className="w-28 px-2 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-right font-mono"
                              />
                            </div>
                          </div>

                          <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 border-slate-100 pt-2 lg:pt-0">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Math Assistant</span>
                            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                              Yields <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{formatRupee(autoRD.maturityAmount)}</strong>
                            </div>
                            <span className="text-[9px] text-slate-400 italic font-medium block mt-0.5">Deposited: {formatRupee(autoRD.totalDeposited)} | Earned {formatRupee(autoRD.interestEarned)}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 md:pt-0">
                          <button
                            onClick={() => {
                              handleRatesSheetChange(s.id, currentRateObj.interestPct, autoRD.maturityAmount);
                              triggerToast(`Applied compounding yield ${formatRupee(autoRD.maturityAmount)} RD preview`, 'success');
                            }}
                            className="bg-slate-100 hover:bg-blue-50 text-slate-755 hover:text-blue-700 font-bold text-[10px] uppercase px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-200 cursor-pointer transition-colors"
                          >
                            Apply compound math
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HOMEPAGE DESIGN WRITES */}
          {activeTab === 'homepage' && (
            <div className="space-y-8 animate-fade-in max-w-4xl">
              {/* Header hero writes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h4 className="font-serif text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-blue-500" />
                  Hero Segment Copywriting
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tagline banner</label>
                  <input
                    type="text"
                    value={heroForm.tag}
                    onChange={(e) => setHeroForm({ ...heroForm, tag: e.target.value })}
                    className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-sm font-medium focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Main display heading</label>
                  <input
                    type="text"
                    value={heroForm.title}
                    onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                    className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-sm font-semibold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subtitle description</label>
                  <textarea
                    rows={3}
                    value={heroForm.subtitle}
                    onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                    className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-sm leading-relaxed focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={handleSaveHero}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl cursor-pointer"
                >
                  Publish layout translations
                </button>
              </div>

              {/* Corporate details edit block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h4 className="font-serif text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <Landmark size={16} className="text-blue-500" />
                  Corporate Headquarters details &amp; Editorial Body
                </h4>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Registered Name</label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Acronym / logo brand Text</label>
                    <input
                      type="text"
                      value={companyForm.short}
                      onChange={(e) => setCompanyForm({ ...companyForm, short: e.target.value })}
                      className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Post Address registry</label>
                  <textarea
                    rows={3}
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Office Contact Phone</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inquiry Email Box</label>
                    <input
                      type="text"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registered domain</label>
                    <input
                      type="text"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Editorial Profile Narratives</label>
                  <textarea
                    rows={6}
                    value={companyForm.about}
                    onChange={(e) => setCompanyForm({ ...companyForm, about: e.target.value })}
                    className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs leading-relaxed font-sans"
                  />
                </div>

                <div className="flex pt-4">
                  <button
                    onClick={handleSaveCompany}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Save Corporate Registry Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANNOUNCEMENTS AREA */}
          {activeTab === 'announce' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs-md space-y-4">
                <h4 className="font-serif text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <Volume2 className="text-yellow-500" size={18} />
                  Top Announcement Banner
                </h4>
                <p className="text-slate-500 text-xs">
                  Active texts render in a high-contrast banner at the top of all public-facing pages instantly.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Banner notification text</label>
                  <textarea
                    rows={3}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs sm:text-sm font-medium"
                    placeholder="Enter deal alerts, e.g., New FS plans launched!"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveAnnouncement}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Publish alert
                  </button>
                  <button
                    onClick={handleClearAnnouncement}
                    className="bg-slate-100 hover:bg-slate-250 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Clear alert and hide banner
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SUPPORT CHAT INBOX MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-6 animate-fade-in max-w-4xl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 uppercase font-black tracking-wider">
                  Support communications messages Ledger
                </span>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/messages/mark-all-read', { method: 'POST' });
                      const updated = {
                        ...siteData,
                        messages: safeData.messages.map(m => ({ ...m, read: true }))
                      };
                      await onUpdateData(updated);
                      triggerToast('Marked all as read', 'success');
                    } catch (_) {}
                  }}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Mark all messages as read
                </button>
              </div>

              <div className="space-y-4">
                {safeData.messages.map((m) => (
                  <div 
                    key={m.id}
                    className={`border rounded-2xl p-5 shadow-xs bg-white transition-all duration-150 ${
                      m.read ? 'border-slate-150 bg-slate-50/40' : 'border-blue-200 bg-blue-50/10 border-l-4 border-l-blue-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans font-bold text-slate-900 text-sm">{m.name}</h4>
                          {!m.read && (
                            <span className="bg-blue-100 text-blue-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Unread
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="font-mono">
  Email: {m.contact}
  {m.phone ? ` • Phone: ${m.phone}` : ''}
</span>
                          <span>•</span>
                          <span>Logs: {formatDateReadable(m.date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!m.read && (
                          <button
                            onClick={async () => {
                              try {
                                await fetch('/api/messages/read', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: m.id, read: true })
                                });
                                const arr = safeData.messages.map(item => item.id === m.id ? { ...item, read: true } : item);
                                await onUpdateData({ ...siteData, messages: arr });
                                triggerToast('Message read');
                              } catch (_) {}
                            }}
                            className="text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 px-2 py-1 rounded cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleMessageDelete(m.id)}
                          className="text-slate-400 hover:text-red-700 p-1.5 rounded hover:bg-red-50 flex cursor-pointer"
                          title="Discard log"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100/70 text-xs sm:text-sm text-slate-600 font-medium">
                      <strong className="block text-[10px] text-slate-400 uppercase font-sans tracking-wide mb-1">
                        Inquiry Title: {m.subject}
                      </strong>
                      <p className="whitespace-pre-line leading-relaxed mt-1 text-slate-700 font-sans">{m.message}</p>
                    </div>
                  </div>
                ))}
                {safeData.messages.length === 0 && (
                  <div className="bg-white border border-slate-150 p-12 rounded-2xl text-center text-slate-400">
                    No communication logs saved in backup.
                  </div>
                )}
              </div>
            </div>
          )}

            

              

          {/* TAB 8: ADMIN SECURE PASSWORD CHANGES WITH MOBILE OTP */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h4 className="font-serif text-base text-slate-900 font-bold pb-2 border-b border-slate-100 flex items-center gap-1.5 font-sans">
                  <Lock size={18} className="text-blue-600" />
                  Admin Passkey & Security Settings
                </h4>
                <p className="text-slate-500 text-xs leading-normal">
                  Configure and update the master administrator password used for ledger access. Changing the credential requires verifying ownership of the registered company mobile number.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">New password phrase</label>
                    <input
                      type="password"
                      value={adminPassForm.newPass}
                      onChange={(e) => setAdminPassForm({ ...adminPassForm, newPass: e.target.value })}
                      className="block w-full px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-800 rounded-lg text-xs font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Confirm password phrase</label>
                    <input
                      type="password"
                      value={adminPassForm.confirmPass}
                      onChange={(e) => setAdminPassForm({ ...adminPassForm, confirmPass: e.target.value })}
                      className="block w-full px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-800 rounded-lg text-xs font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Always visible OTP block */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 animate-fade-in mt-4">
                  <div className="flex items-center gap-1.5">
                    <Lock size={14} className="text-blue-600" />
                    <h5 className="text-[11px] font-bold text-slate-705 uppercase tracking-wide font-sans">OTP Mobile Verification Safeguard</h5>
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed font-sans">
                    To authorize saving the new password, verify your identity via email OTP. A 6-digit code will be sent to the registered admin Gmail.
                  </p>

                  <div className="grid sm:grid-cols-3 items-end gap-3 pt-1">
                    

                    {!isAdminOtpSent ? (
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={handleSendAdminOtp2}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-1.5 px-4 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 h-[32px]"
                        >
                          Send OTP to Gmail
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Enter 4-Digit OTP</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={adminOtpInput}
                            onChange={(e) => setAdminOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="block w-full px-3 py-1.5 border border-slate-200 bg-white text-slate-850 rounded-lg text-xs font-mono text-center tracking-widest font-black"
                            placeholder="000000"
                            disabled={isAdminOtpVerified}
                          />
                        </div>
                        <div className="sm:col-span-1">
                          {!isAdminOtpVerified ? (
                            <button
                              type="button"
                              onClick={handleVerifyOtpAndChangePassword}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-4 rounded-lg cursor-pointer transition-all h-[32px] flex items-center justify-center gap-1"
                            >
                              Verify OTP & Save Password
                            </button>
                          ) : (
                            <div className="w-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs py-1.5 px-4 rounded-lg flex items-center justify-center gap-1 h-[32px]">
                              ✓ Password Saved!
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {isAdminOtpSent && !isAdminOtpVerified && (
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Verify simulation using top-right SMS message balloon</span>
                      <button
                        type="button"
                        onClick={handleSendAdminOtp2}
                        className="text-blue-500 hover:underline font-semibold cursor-pointer"
                      >
                        Resend OTP Code
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL 1: REGISTER MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowMemberModal(false)} 
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded text-slate-400"
            >
              <X size={18} />
            </button>
            <h4 className="font-serif text-lg font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100 select-none">
              {selectedMember ? 'Modify Registered Member' : 'Register New Member ID'}
            </h4>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unique Member ID</label>
                  <input
                    type="text"
                    name="id"
                    readOnly
                    value={selectedMember ? selectedMember.id : getUniqueGeneratedMemberId()}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-550 rounded-xl text-xs font-semibold font-mono opacity-65 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">System Password prefix</label>
                  <input
                    type="text"
                    name="password"
                    defaultValue={selectedMember?.password || 'amit'}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Profile Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={selectedMember?.name || ''}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-medium"
                  placeholder="Amit Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registrant Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={selectedMember?.email || ''}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-medium"
                    placeholder="amit@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={selectedMember?.phone || ''}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold font-mono"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div>
  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Member Since</label>
  <input
    type="date"
    name="memberSince"
    defaultValue={selectedMember?.memberSince || new Date().toISOString().split('T')[0]}
       className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold font-mono"
       />
        </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registrant City</label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={selectedMember?.city || 'Ghaziabad'}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ledger access Status</label>
                  <select
                    name="status"
                    defaultValue={selectedMember?.status || 'Active'}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold"
                  >
                    <option value="Active">Active Ledger</option>
                    <option value="Inactive">Suspended / Inactive</option>
                  </select>
                </div>
              </div>

              {/* KYC Details Section */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">KYC Details</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Father's Name</label>
                    <input
                      type="text"
                      name="fatherName"
                      defaultValue={selectedMember?.fatherName || ''}
                      className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-medium"
                      placeholder="Ramesh Sharma"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Aadhaar Number</label>
                      <input
                        type="text"
                        name="aadharNumber"
                        defaultValue={selectedMember?.aadharNumber || ''}
                        maxLength={12}
                        className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-mono"
                        placeholder="XXXXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PAN Number</label>
                      <input
                        type="text"
                        name="panNumber"
                        defaultValue={selectedMember?.panNumber || ''}
                        maxLength={10}
                        style={{ textTransform: 'uppercase' }}
                        className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-mono"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nominee Name</label>
                      <input
                        type="text"
                        name="nomineeName"
                        defaultValue={selectedMember?.nomineeName || ''}
                        className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-medium"
                        placeholder="Sunita Sharma"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nominee Relation</label>
                      <select
                        name="nomineeRelation"
                        defaultValue={selectedMember?.nomineeRelation || ''}
                        className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold"
                      >
                        <option value="">Select...</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Save Member Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT INVESTMENT SCHEME */}
      {showSchemeModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-xl overflow-hidden">
            <button 
              onClick={() => setShowSchemeModal(false)} 
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded text-slate-400"
            >
              <X size={18} />
            </button>
            <h4 className="font-serif text-lg font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100 select-none">
              {selectedScheme ? 'Modify Plan Configurations' : 'Introduce New Scheme SKU'}
            </h4>

            <form onSubmit={handleSaveScheme} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scheme SKU ID</label>
                  <input
                    type="text"
                    name="id"
                    required
                    disabled={!!selectedScheme}
                    value={schemeForm.id}
                    onChange={(e) => setSchemeForm({ ...schemeForm, id: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-bold font-mono"
                    placeholder="e.g. FS-5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scheme Type Class</label>
                  <select
                    name="type"
                    value={schemeForm.type}
                    onChange={(e) => {
                      const nextType = e.target.value as 'fd' | 'rd';
                      const rep = recalculateMaturity(nextType, schemeForm.durationYears, schemeForm.interestPct);
                      setSchemeForm({ ...schemeForm, type: nextType, maturityAmountPreview: rep });
                    }}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold"
                  >
                    <option value="fd">Fixed Deposit</option>
                    <option value="rd">Recurring Deposit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tenure term (years)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="durationYears"
                    required
                    value={schemeForm.durationYears}
                    onChange={(e) => {
                      const nextVal = parseFloat(e.target.value) || 0;
                      const rep = recalculateMaturity(schemeForm.type, nextVal, schemeForm.interestPct);
                      setSchemeForm({ ...schemeForm, durationYears: nextVal, maturityAmountPreview: rep });
                    }}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Interest Yield % p.a.</label>
                  <input
                    type="number"
                    step="0.05"
                    name="interestPct"
                    required
                    value={schemeForm.interestPct}
                    onChange={(e) => {
                      const nextVal = parseFloat(e.target.value) || 0;
                      const rep = recalculateMaturity(schemeForm.type, schemeForm.durationYears, nextVal);
                      setSchemeForm({ ...schemeForm, interestPct: nextVal, maturityAmountPreview: rep });
                    }}
                    className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Maturity preview balance payouts</label>
                <input
                  type="number"
                  name="maturityAmountPreview"
                  required
                  value={schemeForm.maturityAmountPreview}
                  onChange={(e) => {
                    const nextVal = parseInt(e.target.value, 10) || 0;
                    setSchemeForm({ ...schemeForm, maturityAmountPreview: nextVal });
                  }}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-bold font-mono"
                  placeholder="e.g. 135000 representing (₹1L principal or ₹5K RD)"
                />
                <span className="text-[9px] text-slate-400 mt-1 block leading-normal">
                  * Note: Preview for FD computed on ₹1 Lakh. For RD computed on ₹5,000/month installment.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Badge visibility</label>
                <select
                  name="status"
                  value={schemeForm.status}
                  onChange={(e) => setSchemeForm({ ...schemeForm, status: e.target.value as InvestmentScheme['status'] })}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold"
                >
                  <option value="Active">Active Models</option>
                  <option value="Popular">Flag Popular Badge</option>
                  <option value="Closed">Discontinued / Closed Plans</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSchemeModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Save Plan Type Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BOOK NEW INVESTMENT LEDGER PANE */}
      {showInvestmentModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-xl overflow-hidden select-none">
            <button 
              onClick={() => setShowInvestmentModal(false)} 
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded text-slate-400"
            >
              <X size={18} />
            </button>
            <h4 className="font-serif text-lg font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">
              Book Investment Transaction
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Member Registration</label>
                <span className="font-sans font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded-xl block text-xs">
                  {safeData.members.find(m => m.id === investingMemberId)?.name} ({investingMemberId})
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Select Catalog Option Plan</label>
                <select
                  value={newInvestment.schemeId}
                  onChange={(e) => setNewInvestment({ ...newInvestment, schemeId: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-semibold"
                >
                  {safeData.schemes.filter(s => s.status !== 'Closed').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.type.toUpperCase()} / {s.durationYears} Yr (@ {s.interestPct}% P.A.)
                    </option>
                  ))}
                  {safeData.schemes.length === 0 && <option value="">No Active Models in Catalog</option>}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Invested Amount (Principal/Monthly)</label>
                <input
                  type="number"
                  value={newInvestment.amount}
                  onChange={(e) => setNewInvestment({ ...newInvestment, amount: parseInt(e.target.value) || 0 })}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-black font-mono"
                  placeholder="e.g. 100000"
                />
                <span className="text-[9px] text-slate-400 mt-1 block">
                  * Note: Principal lump sum amount for FD, or monthly installment amount for RD models.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ledger Booking Start Date</label>
                <input
                  type="date"
                  value={newInvestment.startDate}
                  onChange={(e) => setNewInvestment({ ...newInvestment, startDate: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-850 rounded-xl text-xs font-semibold font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowInvestmentModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddInvestment}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Book Secure Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAILED MEMBER VIEW & PORTFOLIO INVESTMENT CONTROL */}
      {selectedDetailMemberId && (() => {
        const detailMember = safeData.members.find(m => m.id === selectedDetailMemberId);
        if (!detailMember) return null;

        const mInvestments = detailMember.investments || [];
        const fdBonds = mInvestments.filter(i => i.schemeType === 'fd');
        const rdBonds = mInvestments.filter(i => i.schemeType === 'rd');

        const totalFDValue = fdBonds.reduce((acc, curr) => acc + curr.amount, 0);
        const totalRDCommitment = rdBonds.reduce((acc, curr) => acc + curr.amount, 0);

        // Filter scheme choices for the active inline adding tab
        const activeSchemes = safeData.schemes.filter(
          s => s.type === activeInvestmentSubTab && s.status !== 'Closed'
        );

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl p-6 sm:p-8 relative shadow-2xl border border-slate-200 flex flex-col lg:flex-row gap-8 max-h-[95vh] lg:max-h-[90vh] overflow-y-auto lg:overflow-hidden select-none animate-scale-up">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedDetailMemberId(null)} 
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-150 rounded-xl text-slate-400 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* LEFT COLUMN: MEMBER CARD & CORE STATS (1/3 Width) */}
              <div className="w-full lg:w-80 flex flex-col gap-6 lg:border-r lg:border-slate-100 lg:pr-8 lg:overflow-y-auto">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50/70 flex items-center justify-center text-blue-700 font-serif text-lg font-bold">
                      {detailMember.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900">{detailMember.name}</h3>
                      <p className="text-[10px] font-mono font-bold text-slate-400">UID: {detailMember.id}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3.5 border-t border-b border-slate-100 py-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">City Location</span>
                      <span className="font-semibold text-slate-700">{detailMember.city || 'Not declared'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Contact Email</span>
                      <span className="font-semibold text-slate-700 break-all">{detailMember.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Phone Access</span>
                      <span className="font-semibold text-slate-700">{detailMember.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">System Credentials</span>
                      <span className="font-semibold text-blue-600 font-mono text-[10px]">Pass: {detailMember.password}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">System Access</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        detailMember.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {detailMember.status}
                      </span>
                    </div>
                  </div>

                  {/* KYC Details */}
                  {(detailMember.fatherName || detailMember.aadharNumber || detailMember.panNumber || detailMember.nomineeName) && (
                    <div className="mt-4 space-y-2 border border-slate-100 rounded-2xl p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">KYC Details</p>
                      {detailMember.fatherName && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Father's Name</span>
                          <span className="font-semibold text-slate-700">{detailMember.fatherName}</span>
                        </div>
                      )}
                      {detailMember.aadharNumber && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Aadhaar</span>
                          <span className="font-semibold text-slate-700 font-mono">{'••••••••'}{detailMember.aadharNumber.slice(-4)}</span>
                        </div>
                      )}
                      {detailMember.panNumber && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">PAN</span>
                          <span className="font-semibold text-slate-700 font-mono">{detailMember.panNumber.toUpperCase()}</span>
                        </div>
                      )}
                      {detailMember.nomineeName && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Nominee</span>
                          <span className="font-semibold text-slate-700">{detailMember.nomineeName}{detailMember.nomineeRelation ? ` (${detailMember.nomineeRelation})` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Member Profile Actions Inside Modal */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleOpenEditMember(detailMember)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors border border-slate-250"
                    >
                      <Edit size={12} />
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleDeleteMember(detailMember.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors border border-red-200"
                    >
                      <Trash size={12} />
                      Delete Member Ledger
                    </button>
                  </div>
                  <button
                    onClick={() => setPassbookMember(detailMember)}
                    className="w-full mt-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <BookOpen size={13} />
                    View & Download Passbook
                  </button>
                </div>

                {/* Portfolio aggregators summary */}
                <div className="space-y-3 mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Portfolio summary</h4>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total FD Principal:</span>
                    <span className="font-mono text-base font-black text-slate-800">{formatRupee(totalFDValue)}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{fdBonds.length} accounts booked</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 block">RD Monthly Installment:</span>
                    <span className="font-mono text-base font-black text-slate-800">{formatRupee(totalRDCommitment)}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{rdBonds.length} accounts booked</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: INVESTMENT CONTROLLER & LEDGERS (2/3 Width) */}
              <div className="flex-1 flex flex-col gap-6 lg:overflow-hidden">
                <div>
                  <h4 className="font-serif text-lg font-bold text-slate-900 mb-1">
                    Live Investment Ledger Control
                  </h4>
                  <p className="text-xs text-slate-400">
                    Manage active deposit bookings, see schedules, or book new plans inline.
                  </p>
                </div>

                {/* Subclass selectors (FD and RD options) */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => {
                      setActiveInvestmentSubTab('fd');
                      setInlineInvestment(prev => ({ ...prev, amount: 100000 }));
                    }}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                      activeInvestmentSubTab === 'fd' 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/20' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'
                    }`}
                  >
                    Fixed Deposits (FD) Roster
                  </button>
                  <button
                    onClick={() => {
                      setActiveInvestmentSubTab('rd');
                      setInlineInvestment(prev => ({ ...prev, amount: 5000 }));
                    }}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                      activeInvestmentSubTab === 'rd' 
                        ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'
                    }`}
                  >
                    Recurring Deposits (RD) Roster
                  </button>
                </div>

                {/* View Panel Lists & Action */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-6 max-h-[50vh]">
                  
                  {/* Ledger list */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                      <span>Booked {activeInvestmentSubTab.toUpperCase()} ledgers</span>
                      <span className="font-mono text-slate-500">
                        ({activeInvestmentSubTab === 'fd' ? fdBonds.length : rdBonds.length} items)
                      </span>
                    </h5>

                    {/* Filtered Active Deposits list */}
                    <div className="space-y-2.5">
                      {activeInvestmentSubTab === 'fd' ? (
                        fdBonds.map(inv => (
                          <div key={inv.id} className="border border-slate-100 p-3 rounded-2xl bg-slate-50/60 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 flex-1 text-xs">
                              <div>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Secure SKU ID</span>
                                <span className="font-mono font-bold text-slate-700 text-[10px]">{inv.id}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Scheme Model</span>
                                <span className="font-semibold text-slate-700 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5">{inv.schemeId} ({inv.durationYears} Yr @ {inv.interestPct}% P.A.)</span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Principal Booked</span>
                                {editingInvestmentId === inv.id ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <input
                                      type="number"
                                      value={editingInvestmentAmount}
                                      onChange={(e) => setEditingInvestmentAmount(parseInt(e.target.value) || 0)}
                                      className="w-24 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleUpdateInvestmentAmount(detailMember.id, inv.id, editingInvestmentAmount)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-55 rounded transition-colors cursor-pointer"
                                      title="Save Amount"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      onClick={() => setEditingInvestmentId(null)}
                                      className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 mt-0.5 group/amt">
                                    <span className="font-mono font-black text-blue-800 text-xs">{formatRupee(inv.amount)}</span>
                                    <button
                                      onClick={() => {
                                        setEditingInvestmentId(inv.id);
                                        setEditingInvestmentAmount(inv.amount);
                                      }}
                                      className="text-slate-400 hover:text-slate-650 p-0.5 cursor-pointer"
                                      title="Edit amount"
                                    >
                                      <Edit size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2 md:col-span-3 text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 border-t border-slate-100/50 pt-1">
                                <Calendar size={10} />
                                <span>Term: {inv.startDate} to {inv.maturityDate}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteInvestment(detailMember.id, inv.id)}
                              className="text-slate-400 hover:text-red-700 p-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-xl cursor-pointer transition-all"
                              title="Delete / Revoke deposit ledgers"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        rdBonds.map(inv => (
                          <div key={inv.id} className="border border-slate-100 p-3 rounded-2xl bg-slate-50/60 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 flex-1 text-xs">
                              <div>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Secure SKU ID</span>
                                <span className="font-mono font-bold text-slate-700 text-[10px]">{inv.id}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Scheme Model</span>
                                <span className="font-semibold text-slate-700 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5">{inv.schemeId} ({inv.durationYears} Yr @ {inv.interestPct}% P.A.)</span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Monthly Installment</span>
                                {editingInvestmentId === inv.id ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <input
                                      type="number"
                                      value={editingInvestmentAmount}
                                      onChange={(e) => setEditingInvestmentAmount(parseInt(e.target.value) || 0)}
                                      className="w-24 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleUpdateInvestmentAmount(detailMember.id, inv.id, editingInvestmentAmount)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-55 rounded transition-colors cursor-pointer"
                                      title="Save Amount"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      onClick={() => setEditingInvestmentId(null)}
                                      className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 mt-0.5 group/amt">
                                    <span className="font-mono font-black text-emerald-800 text-xs">{formatRupee(inv.amount)}/mo</span>
                                    <button
                                      onClick={() => {
                                        setEditingInvestmentId(inv.id);
                                        setEditingInvestmentAmount(inv.amount);
                                      }}
                                      className="text-slate-400 hover:text-slate-650 p-0.5 cursor-pointer"
                                      title="Edit amount"
                                    >
                                      <Edit size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2 md:col-span-3 text-[10px] text-slate-400 flex items-center justify-between gap-2 mt-0.5 border-t border-slate-100/50 pt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  <span>Term: {inv.startDate} to {inv.maturityDate}</span>
                                </span>
                                
                                {editingPaidMonthsId === inv.id ? (
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-100 p-2 rounded-xl mt-1.5 border border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase">Paid Months:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={editingPaidMonthsCount}
                                        onChange={(e) => {
                                          const count = Math.max(0, parseInt(e.target.value) || 0);
                                          setEditingPaidMonthsCount(count);
                                        }}
                                        className="w-14 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs focus:outline-none bg-white text-slate-800"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="text-[10px] text-slate-650 font-bold whitespace-nowrap">
                                      Total Received: <span className="font-mono text-emerald-700">{formatRupee(inv.amount * editingPaidMonthsCount)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button
                                        onClick={() => handleUpdatePaidMonths(detailMember.id, inv.id, editingPaidMonthsCount, inv.startDate)}
                                        className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded transition-colors cursor-pointer"
                                        title="Save Months Paid"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button
                                        onClick={() => setEditingPaidMonthsId(null)}
                                        className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded transition-colors cursor-pointer"
                                        title="Cancel"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-500 font-bold bg-slate-150 px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1">
                                        Months Paid: {inv.paidMonths ? inv.paidMonths.length : 0}
                                      </span>
                                      <button
                                        onClick={() => {
                                          setEditingPaidMonthsId(inv.id);
                                          setEditingPaidMonthsCount(inv.paidMonths ? inv.paidMonths.length : 0);
                                        }}
                                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                        title="Edit payment months"
                                      >
                                        <Edit size={11} />
                                      </button>
                                    </div>
                                    <span className="text-[9px] text-slate-650 font-semibold font-mono text-right block">
                                      Total Rec.: {formatRupee(inv.amount * (inv.paidMonths ? inv.paidMonths.length : 0))}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteInvestment(detailMember.id, inv.id)}
                              className="text-slate-400 hover:text-red-700 p-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-xl cursor-pointer transition-all"
                              title="Delete / Revoke deposit ledgers"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))
                      )}

                      {((activeInvestmentSubTab === 'fd' ? fdBonds.length : rdBonds.length) === 0) && (
                        <p className="text-center text-slate-450 text-xs py-10 bg-slate-50 rounded-2xl border border-slate-100 italic">
                          No active {activeInvestmentSubTab.toUpperCase()} plans found in member's account.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Booking Portal Panel Inline */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 select-none">
                      <Sparkles size={12} className={activeInvestmentSubTab === 'fd' ? 'text-blue-600' : 'text-emerald-600'} />
                      <span>Book Instant {activeInvestmentSubTab.toUpperCase()} Secure Account</span>
                    </h5>

                    {activeSchemes.length === 0 ? (
                      <p className="text-red-700 text-xs bg-red-50 p-2.5 rounded-xl border border-red-100">
                        * There are currently no active {activeInvestmentSubTab.toUpperCase()} options configured in the system. Add an active model in the Schemes tab first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Target Scheme Plan</label>
                          <select
                            value={inlineInvestment.schemeId || (activeSchemes[0]?.id || '')}
                            onChange={(e) => setInlineInvestment({ ...inlineInvestment, schemeId: e.target.value })}
                            className="block w-full px-2.5 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400"
                          >
                            {activeSchemes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id} ({s.durationYears} Yr @ {s.interestPct}%)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                            {activeInvestmentSubTab === 'fd' ? 'Lump Sum Principal' : 'Monthly Share instalment'}
                          </label>
                          <input
                            type="number"
                            value={inlineInvestment.amount}
                            onChange={(e) => setInlineInvestment({ ...inlineInvestment, amount: parseInt(e.target.value) || 0 })}
                            className="block w-full px-2.5 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Booking Start Date</label>
                          <input
                            type="date"
                            value={inlineInvestment.startDate}
                            onChange={(e) => setInlineInvestment({ ...inlineInvestment, startDate: e.target.value })}
                            className="block w-full px-2.5 py-1.5 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs font-semibold font-mono focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 text-right mt-1">
                          <button
                            onClick={() => handleInlineAddInvestment(activeInvestmentSubTab)}
                            className={`font-semibold text-xs px-5 py-2 rounded-xl text-white cursor-pointer transition-all hover:scale-102 hover:shadow-xs ${
                              activeInvestmentSubTab === 'fd' 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            ✓ Confirm and Book {activeInvestmentSubTab.toUpperCase()}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: CUSTOM CONFIRMATION DIALOG */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl animate-scale-up">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="text-red-600 bg-red-50 p-1.5 rounded-lg">
                <Trash size={18} />
              </span>
              {confirmModal.title}
            </h3>
            
            <p className="text-slate-600 text-xs sm:text-sm my-4 leading-relaxed font-sans">
              {confirmModal.message}
            </p>
            
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                No, cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await confirmModal.onConfirm();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-xs font-sans"
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PASSBOOK VIEWER & DOWNLOADER */}
      {passbookMember && (
        <PassbookModal
          isOpen={!!passbookMember}
          onClose={() => setPassbookMember(null)}
          member={passbookMember}
          company={siteData.company}
        />
      )}

    </div>
  );
}