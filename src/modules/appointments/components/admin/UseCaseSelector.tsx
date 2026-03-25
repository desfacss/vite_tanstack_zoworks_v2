import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Loader2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  // logo_url?: string;
}

interface UseCaseSelectorProps {
  selectedOrganizationId: string | null;
  onOrganizationChange: (orgId: string | null) => void;
}

export function UseCaseSelector({ selectedOrganizationId, onOrganizationChange }: UseCaseSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      const { data, error } = await supabase
        .schema('identity')
        .from('organizations')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);
      if (data && data.length > 0 && !selectedOrganizationId) {
        onOrganizationChange(data[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  const selectedOrg = organizations.find((org: Organization) => org.id === selectedOrganizationId);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading organizations...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No organizations found. Please seed data first.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
      >
        {selectedOrg && (
          <>
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-500">Active Organization</span>
              <span className="text-sm font-medium text-gray-900">{selectedOrg.name}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {organizations.map((org: Organization) => (
              <button
                key={org.id}
                onClick={() => {
                  onOrganizationChange(org.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selectedOrganizationId === org.id ? 'bg-blue-50' : ''
                  }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-500">{org.name}</div>
                </div>
                {selectedOrganizationId === org.id && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
