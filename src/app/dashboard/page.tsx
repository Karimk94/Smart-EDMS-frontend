import { Suspense } from 'react';
import { MainDashboard } from '../components/MainDashboard';

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-[#1f1f1f]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <MainDashboard initialSection="recent" hiddenSections={[]} />
        </Suspense>
    );
}
