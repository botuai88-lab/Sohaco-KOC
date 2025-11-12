import React, { useState, useEffect, useCallback } from 'react';
import { KOC, ViewType } from './types';
import { getKocs, addKoc, updateKoc as apiUpdateKoc, deleteKocs as apiDeleteKocs, batchAddKocs } from './services/googleSheetService';
import Dashboard from './components/Dashboard';
import KOCManagement from './components/KOCManagement';
import { MenuIcon, XIcon, ChartPieIcon, CollectionIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './components/common/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [kocs, setKocs] = useState<KOC[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // For desktop
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKocs();
      setKocs(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu từ Google Sheet. Vui lòng kiểm tra lại URL trong file services/googleSheetService.ts và thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKocs();
  }, [loadKocs]);

  const handleAddKoc = async (newKocData: Omit<KOC, 'rowId' | 'stt' | 'id'>) => {
    const newKoc = await addKoc(newKocData);
    setKocs(prevKocs => [...prevKocs, newKoc].sort((a,b) => a.stt - b.stt));
  };

  const handleUpdateKoc = async (updatedKoc: KOC) => {
    const result = await apiUpdateKoc(updatedKoc);
    setKocs(prevKocs => prevKocs.map(k => k.rowId === result.rowId ? result : k));
  };

  const handleDeleteKocs = async (rowIds: number[]) => {
    await apiDeleteKocs(rowIds);
    setKocs(prevKocs => prevKocs.filter(k => !rowIds.includes(k.rowId)));
  };

  const handleBatchAdd = async (newKocs: Omit<KOC, 'rowId' | 'stt' | 'id'>[]) => {
      const addedKocs = await batchAddKocs(newKocs);
      setKocs(prev => [...prev, ...addedKocs].sort((a,b) => a.stt - b.stt));
  };

  const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
  }> = ({ icon, label, isActive, onClick }) => (
    <li
      onClick={onClick}
      title={isSidebarCollapsed ? label : undefined}
      className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      } ${isSidebarCollapsed ? 'justify-center' : ''}`}
    >
      {icon}
      {!isSidebarCollapsed && <span className="ml-4 font-medium whitespace-nowrap">{label}</span>}
    </li>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white tracking-wider">
          {isSidebarCollapsed ? 'SK' : <>SOHA<span className="text-blue-400">KOC</span></>}
        </h1>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          <NavItem
            icon={<ChartPieIcon />}
            label="Dashboard"
            isActive={view === 'dashboard'}
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
          />
          <NavItem
            icon={<CollectionIcon />}
            label="Quản lý KOC"
            isActive={view === 'koc_management'}
            onClick={() => { setView('koc_management'); setIsSidebarOpen(false); }}
          />
        </ul>
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <div className={`flex items-center w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              {isSidebarCollapsed ? <ChevronDoubleRightIcon /> : <ChevronDoubleLeftIcon />}
              {!isSidebarCollapsed && <span className="ml-2 text-sm font-medium">Thu gọn</span>}
            </div>
          </button>
      </div>
      {!isSidebarCollapsed && (
        <div className="px-4 pb-4 text-center text-xs text-gray-400">
          <p>&copy; 2024 Sohaco Group</p>
        </div>
      )}
    </div>
  );
  
  const MainContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-full text-xl">Đang tải dữ liệu...</div>;
    }
    if (error) {
      return <div className="flex flex-col justify-center items-center h-full text-center">
          <p className="text-xl text-red-500">{error}</p>
          <button onClick={loadKocs} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Thử lại</button>
      </div>;
    }
    if (view === 'dashboard') {
        return <Dashboard kocs={kocs} />;
    }
    if (view === 'koc_management') {
        return <KOCManagement 
            kocs={kocs} 
            onAddKoc={handleAddKoc} 
            onUpdateKoc={handleUpdateKoc} 
            onDeleteKocs={handleDeleteKocs}
            onBatchAdd={handleBatchAdd}
        />;
    }
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      <aside className={`hidden lg:block bg-gray-800 dark:bg-gray-900 shadow-xl transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {sidebarContent}
      </aside>

      <div
        className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity lg:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-full bg-gray-800 dark:bg-gray-900 shadow-xl transform transition-transform lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 lg:justify-end">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden text-gray-600 dark:text-gray-300 focus:outline-none"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center">
             <span className="font-semibold mr-4">Xin chào, Admin!</span>
             <img src={`https://i.pravatar.cc/40?u=admin`} alt="Admin" className="w-10 h-10 rounded-full" />
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
            <MainContent />
        </main>
      </div>
    </div>
  );
};

export default App;