import { LayoutDashboard, Globe } from 'lucide-react';
import { OrgSwitcher } from './OrgSwitcher';

interface NavigationHeaderProps {
    viewState: string;
    onSetViewState: (view: string) => void;
}

export default function NavigationHeader({
    viewState,
    onSetViewState,
}: NavigationHeaderProps) {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Organization Switcher */}
                    <div className="flex items-center gap-4">
                        <OrgSwitcher />
                    </div>

                    {/* View Toggles */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button
                            onClick={() => onSetViewState('CLASSIC_DEMO')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewState === 'CLASSIC_DEMO' || viewState === 'BOOKING_PAGE' || viewState === 'SUCCESS'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Globe className="w-4 h-4" />
                            Public View
                        </button>
                        <button
                            onClick={() => onSetViewState('DASHBOARD')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewState === 'DASHBOARD'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Admin
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
