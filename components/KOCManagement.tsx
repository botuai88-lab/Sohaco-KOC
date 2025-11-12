import React, { useState, useMemo, ChangeEvent, Fragment } from 'react';
import { KOC, Brand, KOCType, SortConfig } from '../types';
import { PROVINCES, BRANDS, MAIN_FIELDS } from '../constants';
import { exportToExcel, importFromExcel } from '../utils/helpers';
import KOCForm from './KOCForm';
import { PlusIcon, UploadIcon, DownloadIcon, TrashIcon, PencilIcon, ChevronUpIcon, ChevronDownIcon, FilterIcon } from './common/Icons';

interface KOCManagementProps {
    kocs: KOC[];
    onAddKoc: (koc: Omit<KOC, 'rowId' | 'id' | 'stt'>) => Promise<void>;
    onUpdateKoc: (koc: KOC) => Promise<void>;
    onDeleteKocs: (rowIds: number[]) => Promise<void>;
    onBatchAdd: (kocs: Omit<KOC, 'rowId' | 'id' | 'stt'>[]) => Promise<void>;
}

type GroupedKOC = {
    identifier: string;
    mainInfo: KOC;
    collaborations: KOC[];
};

const KOCManagement: React.FC<KOCManagementProps> = ({ kocs, onAddKoc, onUpdateKoc, onDeleteKocs, onBatchAdd }) => {
    const initialFilters = {
        brands: [],
        province: '',
        mainField: '',
        kocType: [],
        followersMin: '',
        followersMax: '',
    };
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<{
        brands: Brand[],
        province: string,
        mainField: string,
        kocType: KOCType[],
        followersMin: string,
        followersMax: string,
    }>(initialFilters);
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedKocRowIds, setSelectedKocRowIds] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKoc, setEditingKoc] = useState<KOC | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [expandedKocs, setExpandedKocs] = useState<Set<string>>(new Set());

    const ITEMS_PER_PAGE = 10;

    const groupedKocs = useMemo(() => {
        const groups: { [key: string]: KOC[] } = {};
        kocs.forEach(koc => {
            const key = koc.taxCode || `${koc.name.trim()}-${koc.phone.trim()}`;
            if (!key || key === '-') return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(koc);
        });

        return Object.values(groups).map((collaborations) => {
            collaborations.sort((a, b) => new Date(b.cooperationDate).getTime() - new Date(a.cooperationDate).getTime());
            return {
                identifier: collaborations[0].taxCode || `${collaborations[0].name.trim()}-${collaborations[0].phone.trim()}`,
                mainInfo: collaborations[0],
                collaborations,
            };
        });
    }, [kocs]);

    const dynamicKocTypes = useMemo(() => {
        const types = new Set(kocs.map(koc => koc.kocType).filter(Boolean));
        return Array.from(types).sort() as KOCType[];
    }, [kocs]);

    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleBrandFilterChange = (brand: Brand) => {
        setFilters(prev => ({...prev, brands: prev.brands.includes(brand) ? prev.brands.filter(b => b !== brand) : [...prev.brands, brand]}));
    };
    
    const handleKocTypeFilterChange = (kocType: KOCType) => {
        setFilters(prev => ({...prev, kocType: prev.kocType.includes(kocType) ? prev.kocType.filter(t => t !== kocType) : [...prev.kocType, kocType]}));
    };
    
    const resetFilters = () => {
        setFilters(initialFilters);
    };

    const filteredGroups = useMemo(() => {
        let filtered = groupedKocs.filter(group => {
            const searchLower = searchTerm.toLowerCase();
            return group.collaborations.some(koc =>
                koc.name.toLowerCase().includes(searchLower) ||
                koc.id.toLowerCase().includes(searchLower) ||
                (koc.taxCode && koc.taxCode.includes(searchLower)) ||
                koc.phone.includes(searchTerm) ||
                koc.email.toLowerCase().includes(searchLower)
            );
        });

        if (filters.brands.length > 0) {
            filtered = filtered.filter(group => group.collaborations.some(koc => filters.brands.includes(koc.brand)));
        }
        if (filters.province) {
            filtered = filtered.filter(group => group.mainInfo.address === filters.province);
        }
        if (filters.mainField) {
            filtered = filtered.filter(group => group.mainInfo.mainField === filters.mainField);
        }
        if (filters.kocType.length > 0) {
            filtered = filtered.filter(group => filters.kocType.includes(group.mainInfo.kocType));
        }
        if (filters.followersMin) {
            filtered = filtered.filter(group => group.mainInfo.followers >= parseInt(filters.followersMin, 10));
        }
        if (filters.followersMax) {
            filtered = filtered.filter(group => group.mainInfo.followers <= parseInt(filters.followersMax, 10));
        }

        return filtered;
    }, [groupedKocs, searchTerm, filters]);

    const sortedGroups = useMemo(() => {
        let sortableGroups = [...filteredGroups];
        if (sortConfig !== null) {
            sortableGroups.sort((a, b) => {
                const valA = a.mainInfo[sortConfig.key];
                const valB = b.mainInfo[sortConfig.key];

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableGroups;
    }, [filteredGroups, sortConfig]);

    const paginatedGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedGroups, currentPage]);

    const totalPages = Math.ceil(sortedGroups.length / ITEMS_PER_PAGE);

    const requestSort = (key: keyof KOC) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const handleSelectOne = (rowId: number) => {
        setSelectedKocRowIds(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
    };

    const openAddModal = () => { setEditingKoc(null); setIsModalOpen(true); };
    const openEditModal = (koc: KOC) => { setEditingKoc(koc); setIsModalOpen(true); };
    
    const handleDelete = async (rowIds: number[]) => {
        if(window.confirm(`Bạn có chắc muốn xóa ${rowIds.length} lần hợp tác?`)) {
            setIsDeleting(true);
            try {
                await onDeleteKocs(rowIds);
                setSelectedKocRowIds(prev => prev.filter(id => !rowIds.includes(id)));
            } catch (error) { alert("Đã xảy ra lỗi khi xóa."); console.error(error); } 
            finally { setIsDeleting(false); }
        }
    };

    const handleSaveKoc = async (kocData: KOC | Omit<KOC, 'rowId' | 'id' | 'stt'>) => {
        if ('rowId' in kocData) await onUpdateKoc(kocData);
        else await onAddKoc(kocData);
        setIsModalOpen(false);
    };

    const handleFileImport = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsImporting(true);
            try {
                const newKocs = await importFromExcel(file);
                await onBatchAdd(newKocs);
                alert(`${newKocs.length} KOC đã được nhập thành công!`);
            } catch (error) { console.error("Import error: ", error); alert("Không thể nhập tệp."); } 
            finally { setIsImporting(false); }
            e.target.value = '';
        }
    };
    
    const handleExport = () => exportToExcel(kocs, "danh_sach_koc_chi_tiet");

    const toggleExpand = (identifier: string) => {
        setExpandedKocs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(identifier)) newSet.delete(identifier);
            else newSet.add(identifier);
            return newSet;
        });
    };

    const SortableHeader: React.FC<{ label: string; sortKey: keyof KOC; className?: string }> = ({ label, sortKey, className = '' }) => (
        <th onClick={() => requestSort(sortKey)} className={`p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer ${className}`}>
            <div className="flex items-center">{label} <span className="ml-1">{sortConfig?.key === sortKey ? (sortConfig.direction === 'ascending' ? <ChevronUpIcon /> : <ChevronDownIcon />) : ''}</span></div>
        </th>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Quản lý KOC</h2>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                {/* Search and Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <input type="text" placeholder="Tìm kiếm KOC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-1/3 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"/>
                     <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setIsFiltersVisible(!isFiltersVisible)} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"><FilterIcon/> <span className="ml-2">Bộ lọc</span></button>
                        <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"><PlusIcon /> Thêm hợp tác</button>
                         <label className={`flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 cursor-pointer ${isImporting ? 'opacity-50' : ''}`}><UploadIcon /> {isImporting ? 'Đang xử lý...' : 'Import'}<input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} disabled={isImporting} /></label>
                        <button onClick={handleExport} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600"><DownloadIcon /> Export</button>
                     </div>
                </div>
                {/* Filters Panel */}
                {isFiltersVisible && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thương hiệu phụ trách</label>
                                <div className="flex flex-wrap gap-2">
                                    {BRANDS.map(brand => (
                                        <button
                                            key={brand}
                                            onClick={() => handleBrandFilterChange(brand)}
                                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                filters.brands.includes(brand)
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {brand}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Loại KOC</label>
                                <div className="flex flex-wrap gap-2">
                                    {dynamicKocTypes.map(kocType => (
                                        <button
                                            key={kocType}
                                            onClick={() => handleKocTypeFilterChange(kocType)}
                                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                filters.kocType.includes(kocType)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {kocType}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="province" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tỉnh/Thành phố</label>
                                <select id="province" name="province" value={filters.province} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                                    <option value="">Tất cả</option>
                                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="mainField" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lĩnh vực chính</label>
                                <select id="mainField" name="mainField" value={filters.mainField} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                                    <option value="">Tất cả</option>
                                    {MAIN_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Số lượng Followers</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" name="followersMin" placeholder="Từ" value={filters.followersMin} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                                    <span className="text-gray-500">-</span>
                                    <input type="number" name="followersMax" placeholder="Đến" value={filters.followersMax} onChange={handleFilterChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end">
                            <button onClick={resetFilters} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <div className="p-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Danh sách KOC ({sortedGroups.length})</h3>
                    {selectedKocRowIds.length > 0 && (
                        <button onClick={() => handleDelete(selectedKocRowIds)} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center disabled:opacity-50"><TrashIcon /> <span className="ml-2">{isDeleting ? 'Đang xóa...' : `Xóa (${selectedKocRowIds.length})`}</span></button>
                    )}
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 w-4"></th>
                            <SortableHeader label="Họ & Tên" sortKey="name" />
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MST</th>
                            <SortableHeader label="Followers" sortKey="followers" />
                            <SortableHeader label="Địa chỉ" sortKey="address" />
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thương hiệu đã hợp tác</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Số lần HT</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedGroups.map((group) => (
                            <Fragment key={group.identifier}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => toggleExpand(group.identifier)}>
                                    <td className="p-3">
                                        <button className="transition-transform duration-200" style={{ transform: expandedKocs.has(group.identifier) ? 'rotate(0deg)' : 'rotate(-90deg)' }}><ChevronDownIcon /></button>
                                    </td>
                                    <td className="p-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">{group.mainInfo.name}</td>
                                    <td className="p-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{group.mainInfo.taxCode}</td>
                                    <td className="p-3 whitespace-nowrap text-sm">{group.mainInfo.followers.toLocaleString('vi-VN')}</td>
                                    <td className="p-3 whitespace-nowrap text-sm">{group.mainInfo.address}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(new Set(group.collaborations.map(c => c.brand))).map(b => <span key={b} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{b}</span>)}
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap text-center text-sm font-semibold">{group.collaborations.length}</td>
                                </tr>
                                {expandedKocs.has(group.identifier) && (
                                    <tr className="bg-gray-50 dark:bg-gray-900">
                                        <td colSpan={7} className="p-0">
                                            <div className="p-4">
                                                <h4 className="font-semibold mb-2 text-sm">Lịch sử hợp tác:</h4>
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-md overflow-hidden">
                                                    <thead className="bg-gray-200 dark:bg-gray-700">
                                                        <tr>
                                                            <th className="p-2 w-4"></th>
                                                            <th className="p-2 text-left text-xs font-medium">Thương hiệu</th>
                                                            <th className="p-2 text-left text-xs font-medium">Ngày hợp tác</th>
                                                            <th className="p-2 text-left text-xs font-medium">Đơn giá</th>
                                                            <th className="p-2 text-left text-xs font-medium">Doanh số 1M</th>
                                                            <th className="p-2 text-left text-xs font-medium">Hành động</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800">
                                                        {group.collaborations.map(collab => (
                                                            <tr key={collab.rowId} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                                                <td className="p-2"><input type="checkbox" checked={selectedKocRowIds.includes(collab.rowId)} onChange={() => handleSelectOne(collab.rowId)} /></td>
                                                                <td className="p-2 whitespace-nowrap text-sm font-medium">{collab.brand}</td>
                                                                <td className="p-2 whitespace-nowrap text-sm">{collab.cooperationDate}</td>
                                                                <td className="p-2 whitespace-nowrap text-sm">{collab.unitPrice.toLocaleString('vi-VN')} đ</td>
                                                                <td className="p-2 whitespace-nowrap text-sm">{collab.revenue1m.toLocaleString('vi-VN')} đ</td>
                                                                <td className="p-2 whitespace-nowrap text-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => openEditModal(collab)} className="text-yellow-500 hover:text-yellow-700"><PencilIcon /></button>
                                                                        <button onClick={() => handleDelete([collab.rowId])} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
                 <div className="p-4 flex items-center justify-between border-t dark:border-gray-700">
                    <span className="text-sm text-gray-700 dark:text-gray-400">Hiển thị {paginatedGroups.length} KOC trên tổng {sortedGroups.length}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50">Trước</button>
                        <span>Trang {currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50">Sau</button>
                    </div>
                 </div>
            </div>

            <KOCForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveKoc}
                koc={editingKoc}
                kocs={kocs}
            />
        </div>
    );
};

export default KOCManagement;