import { useQuery } from '@tanstack/react-query';
import type { Contact, Account, Segment, Ticket } from '../types';
import { mockContacts, mockAccounts, mockSegments, mockTickets } from '../data/mockData';

// These hooks use mock data for now
// TODO: Connect to Supabase when CRM tables are available

export const useContacts = () => {
    return useQuery({
        queryKey: ['contacts'],
        queryFn: async (): Promise<Contact[]> => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockContacts;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useAccounts = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: async (): Promise<Account[]> => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockAccounts;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useSegments = () => {
    return useQuery({
        queryKey: ['segments'],
        queryFn: async (): Promise<Segment[]> => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockSegments;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useTickets = () => {
    return useQuery({
        queryKey: ['tickets'],
        queryFn: async (): Promise<Ticket[]> => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockTickets;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useContactById = (contactId: string | null) => {
    return useQuery({
        queryKey: ['contact', contactId],
        queryFn: async (): Promise<Contact | null> => {
            if (!contactId) return null;
            await new Promise(resolve => setTimeout(resolve, 200));
            return mockContacts.find(c => c.id === contactId) || null;
        },
        enabled: !!contactId,
        staleTime: 1000 * 60 * 5,
    });
};

export const useAccountById = (accountId: string | null) => {
    return useQuery({
        queryKey: ['account', accountId],
        queryFn: async (): Promise<Account | null> => {
            if (!accountId) return null;
            await new Promise(resolve => setTimeout(resolve, 200));
            return mockAccounts.find(a => a.id === accountId) || null;
        },
        enabled: !!accountId,
        staleTime: 1000 * 60 * 5,
    });
};
