import { MainDashboard } from '../../components/MainDashboard';

export default function FolderPage({ params }: { params: { folderId: string } }) {
    return <MainDashboard initialSection="folders" initialFolderId={params.folderId} />;
}
