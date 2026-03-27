import { Suspense } from 'react';
import { MainDashboard } from '../components/MainDashboard';
import { PageSpinner } from '../components/Spinner';

export default function FoldersRootPage() {
    return (
        <Suspense fallback={<PageSpinner />}>
            <MainDashboard initialSection="folders" />
        </Suspense>
    );
}
