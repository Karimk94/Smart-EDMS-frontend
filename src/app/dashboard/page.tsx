import { Suspense } from 'react';
import { MainDashboard } from '../components/MainDashboard';
import { PageSpinner } from '../components/Spinner';

export default function DashboardPage() {
    return (
        <Suspense fallback={<PageSpinner />}>
            <MainDashboard initialSection="recent" />
        </Suspense>
    );
}
