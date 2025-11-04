import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName="User" userInitial="U" />
      <Sidebar />
      <main className="ml-64 pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
