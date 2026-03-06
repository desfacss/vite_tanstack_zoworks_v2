import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, ChevronDown } from 'lucide-react';
import { Organization } from '../lib/types';
import { useAuthStore } from '@/lib/authStore';

export function OrgSwitcher() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const selectedOrganization = useAuthStore((state) => state.organization);
    const setOrganization = useAuthStore((state) => state.setOrganization);

    useEffect(() => {
        loadOrganizations();
    }, []);

    async function loadOrganizations() {
        try {
            const { data, error } = await supabase
                .schema('calendar')
                .from('organizations')
                .select('id, name, slug, logo_url')
                .order('name');

            if (error) throw error;
            setOrganizations((data || []) as any);

            // Auto-select first if none selected
            if (data && data.length > 0 && !selectedOrganization) {
                setOrganization(data[0] as any);
            }
        } catch (error) {
            console.error('Error loading organizations:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSelectOrganization = (org: Organization) => {
        setOrganization(org as any);
        // Refresh to ensure all data-dependent components reload
        window.location.reload();
    };

    if (loading && !selectedOrganization) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg animate-pulse min-w-[200px]">
                <div className="w-8 h-8 bg-gray-200 rounded-md" />
                <div className="flex-1 space-y-2">
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 min-w-[200px]">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center overflow-hidden">
                    {selectedOrganization?.logo_url ? (
                        <img src={selectedOrganization.logo_url} alt={selectedOrganization.name} className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="w-5 h-5 text-blue-600" />
                    )}
                </div>
                <div className="flex-1 text-left">
                    <p className="text-[10px] text-gray-500 font-medium uppercase leading-tight">Active Org</p>
                    <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                        {selectedOrganization?.name || 'Select Organization'}
                    </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]">
                <div className="p-2 max-h-[400px] overflow-y-auto">
                    <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Select Organization
                    </p>
                    {organizations.map((org) => (
                        <button
                            key={org.id}
                            onClick={() => handleSelectOrganization(org)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedOrganization?.id === org.id
                                ? 'bg-blue-50 text-blue-700'
                                : 'hover:bg-gray-50 text-gray-700'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${selectedOrganization?.id === org.id ? 'bg-blue-600' : 'bg-gray-300'}`} />
                            <span className="text-sm font-medium">{org.name}</span>
                        </button>
                    ))}
                    {organizations.length === 0 && (
                        <p className="px-3 py-4 text-sm text-gray-500 text-center italic">
                            No organizations found
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
