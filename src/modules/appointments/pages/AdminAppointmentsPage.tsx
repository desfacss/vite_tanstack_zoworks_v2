import { useAuthStore } from '@/lib/authStore';
import AdminLayout from '../components/admin/AdminLayout';
import { ToastProvider } from '../components/common/Toast';
import { OrgSwitcher } from '../components/OrgSwitcher';

export default function AdminAppointmentsPage() {
    const organization = useAuthStore((state) => state.organization);

    return (
        <ToastProvider>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
                    <OrgSwitcher />
                </div>

                {!organization ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                        <h2 className="text-xl font-semibold text-gray-900">Please select an organization to manage appointments</h2>
                    </div>
                ) : (
                    <AdminLayout organizationId={organization.id} />
                )}
            </div>
        </ToastProvider>
    );
}
