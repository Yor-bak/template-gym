'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Member, Payment, AccessLog, Membership, Staff } from '@/types';
import { members as initialMembers } from '@/data/members';
import { payments as initialPayments } from '@/data/payments';
import { accessLogs as initialAccessLogs } from '@/data/accesses';
import { memberships as initialMemberships } from '@/data/memberships';
import { staff as initialStaff } from '@/data/staff';

interface AppStore {
  members: Member[];
  payments: Payment[];
  accessLogs: AccessLog[];
  memberships: Membership[];
  staff: Staff[];
  addMember: (member: Member) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  addPayment: (payment: Payment) => void;
  cancelPayment: (id: string, cancelledBy: string, reason: string) => void;
  addAccessLog: (log: AccessLog) => void;
  updateMembership: (id: string, updates: Partial<Membership>) => void;
  addMembership: (membership: Membership) => void;
  addStaff: (member: Staff) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
}

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(initialAccessLogs);
  const [memberships, setMemberships] = useState<Membership[]>(initialMemberships);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);

  const addMember = useCallback((member: Member) => {
    setMembers(prev => [member, ...prev]);
  }, []);

  const updateMember = useCallback((id: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const addPayment = useCallback((payment: Payment) => {
    setPayments(prev => [payment, ...prev]);
  }, []);

  const cancelPayment = useCallback((id: string, cancelledBy: string, reason: string) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' as const, cancelledBy, cancelReason: reason, cancelledAt: new Date().toISOString() } : p));
  }, []);

  const addAccessLog = useCallback((log: AccessLog) => {
    setAccessLogs(prev => [log, ...prev]);
  }, []);

  const updateMembership = useCallback((id: string, updates: Partial<Membership>) => {
    setMemberships(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const addMembership = useCallback((membership: Membership) => {
    setMemberships(prev => [membership, ...prev]);
  }, []);

  const addStaff = useCallback((member: Staff) => {
    setStaff(prev => [member, ...prev]);
  }, []);

  const updateStaff = useCallback((id: string, updates: Partial<Staff>) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  return (
    <StoreContext.Provider value={{ members, payments, accessLogs, memberships, staff, addMember, updateMember, addPayment, cancelPayment, addAccessLog, updateMembership, addMembership, addStaff, updateStaff }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
