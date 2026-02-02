import { MainDashboard } from '../components/MainDashboard';

export default function FoldersRootPage() {
    return <MainDashboard initialSection="folders" hiddenSections={['recent', 'favorites']} />;
}
