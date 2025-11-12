import React, { useMemo, useState } from 'react';
import { KOC, Brand } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BRANDS } from '../constants';

interface DashboardProps {
  kocs: KOC[];
}

const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-700 p-2 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
                <p className="label font-bold">{`${label}`}</p>
                <p className="intro text-blue-500">{`Số lượng : ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

const Dashboard: React.FC<DashboardProps> = ({ kocs }) => {
    const [top10Brand, setTop10Brand] = useState<Brand>(BRANDS[0]);
    const [top5Brand, setTop5Brand] = useState<Brand>(BRANDS[0]);
    const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
        start: null,
        end: null,
    });

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value || null }));
    };

    const filteredKocs = useMemo(() => {
        if (!dateRange.start && !dateRange.end) {
            return kocs;
        }
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;

        if (endDate) {
            endDate.setUTCHours(23, 59, 59, 999);
        }

        return kocs.filter(koc => {
            if (!koc.cooperationDate) return false;
            const cooperationDate = new Date(koc.cooperationDate);
            if (isNaN(cooperationDate.getTime())) return false;

            const isAfterStart = startDate ? cooperationDate >= startDate : true;
            const isBeforeEnd = endDate ? cooperationDate <= endDate : true;

            return isAfterStart && isBeforeEnd;
        });
    }, [kocs, dateRange]);

    const totalKocs = useMemo(() => {
        const uniqueIdentifiers = new Set();
        filteredKocs.forEach(koc => {
            const identifier = koc.taxCode || `${koc.name}-${koc.phone}`;
            if (identifier !== '-') uniqueIdentifiers.add(identifier);
        });
        return uniqueIdentifiers.size;
    }, [filteredKocs]);

    const totalRevenue = useMemo(() => {
        return filteredKocs.reduce((sum, koc) => sum + koc.revenue3m, 0);
    }, [filteredKocs]);
    
    const bestPerformingBrand = useMemo(() => {
        if (filteredKocs.length === 0) {
            return { name: 'N/A', revenue: 0 };
        }

        const revenueByBrand = filteredKocs.reduce((acc, koc) => {
            acc[koc.brand] = (acc[koc.brand] || 0) + koc.revenue3m;
            return acc;
        }, {} as { [key in Brand]: number });

        const bestBrand = Object.entries(revenueByBrand).sort(([, a], [, b]) => b - a)[0];
        
        if (!bestBrand) {
            return { name: 'N/A', revenue: 0 };
        }

        return { name: bestBrand[0], revenue: bestBrand[1] };
    }, [filteredKocs]);


    const brandData = useMemo(() => {
        const brandCount: { [key: string]: number } = {};
        filteredKocs.forEach(koc => {
            if (koc.brand) {
                brandCount[koc.brand] = (brandCount[koc.brand] || 0) + 1;
            }
        });
        return Object.entries(brandCount).map(([name, value]) => ({ name, value }));
    }, [filteredKocs]);

    const locationData = useMemo(() => {
        const locationCount: { [key: string]: number } = {};
        filteredKocs.forEach(koc => {
            if (koc.address) {
                locationCount[koc.address] = (locationCount[koc.address] || 0) + 1;
            }
        });
        const sorted = Object.entries(locationCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length > 7) {
            const others = sorted.slice(6).reduce((acc, curr) => acc + curr.value, 0);
            return [...sorted.slice(0, 6), { name: 'Khác', value: others }];
        }
        return sorted;
    }, [filteredKocs]);

    const trendData = useMemo(() => {
        const trendCount: { [key: string]: number } = {};
        filteredKocs.forEach(koc => {
            if (koc.cooperationDate && /^\d{4}-\d{2}-\d{2}$/.test(koc.cooperationDate)) {
                const date = new Date(koc.cooperationDate);
                if (!isNaN(date.getTime())) {
                    const month = date.getUTCMonth() + 1;
                    const year = date.getUTCFullYear();
                    const monthYear = `${month}/${year}`;
                    trendCount[monthYear] = (trendCount[monthYear] || 0) + 1;
                }
            }
        });
        
        return Object.entries(trendCount)
          .map(([name, value]) => ({ name, 'Số lần hợp tác': value }))
          .sort((a, b) => {
              const [monthA, yearA] = a.name.split('/').map(Number);
              const [monthB, yearB] = b.name.split('/').map(Number);
              return new Date(yearA, monthA - 1).getTime() - new Date(yearB, monthB - 1).getTime();
          });
    }, [filteredKocs]);

    const top10Kocs = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return filteredKocs
            .filter(koc => {
                if (koc.brand !== top10Brand || !koc.cooperationDate) {
                    return false;
                }
                const cooperationDate = new Date(koc.cooperationDate);
                return !isNaN(cooperationDate.getTime()) &&
                       cooperationDate.getUTCMonth() === currentMonth &&
                       cooperationDate.getUTCFullYear() === currentYear;
            })
            .sort((a, b) => b.revenue1m - a.revenue1m)
            .slice(0, 10);
    }, [filteredKocs, top10Brand]);

    const top5Kocs = useMemo(() => {
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

        return filteredKocs
            .filter(koc => {
                if (koc.brand !== top5Brand || !koc.cooperationDate) {
                    return false;
                }
                const cooperationDate = new Date(koc.cooperationDate);
                return !isNaN(cooperationDate.getTime()) && cooperationDate >= threeMonthsAgo;
            })
            .sort((a, b) => b.revenue3m - a.revenue3m)
            .slice(0, 5);
    }, [filteredKocs, top5Brand]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    const Leaderboard: React.FC<{
        title: string;
        data: KOC[];
        metricKey: 'revenue1m' | 'revenue3m';
        emptyMessage: string;
        selectedBrand: Brand;
        onBrandSelect: (brand: Brand) => void;
    }> = ({
        title,
        data,
        metricKey,
        emptyMessage,
        selectedBrand,
        onBrandSelect
    }) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="font-semibold mb-4 text-lg">{title}</h3>
            <div className="flex flex-wrap gap-2 mb-4 border-b pb-4 dark:border-gray-700">
                {BRANDS.map(brand => (
                    <button
                        key={brand}
                        onClick={() => onBrandSelect(brand)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                            selectedBrand === brand
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                        }`}
                    >
                        {brand}
                    </button>
                ))}
            </div>
            {data.length > 0 ? (
                <ol className="space-y-3">
                    {data.map((koc, index) => (
                        <li key={koc.rowId} className="flex items-center justify-between text-sm p-2 rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
                            <div className="flex items-center">
                                <span className={`font-bold w-8 text-center ${index < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>#{index + 1}</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{koc.name}</span>
                            </div>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                                {koc[metricKey].toLocaleString('vi-VN')} đ
                            </span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">{emptyMessage}</p>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Tổng Quan</h2>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Bộ lọc thời gian</h3>
                    <div>
                        <label htmlFor="startDate" className="text-sm mr-2 text-gray-600 dark:text-gray-300">Từ ngày:</label>
                        <input 
                            type="date" 
                            id="startDate" 
                            name="start"
                            value={dateRange.start || ''}
                            onChange={handleDateChange}
                            className="p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200" 
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="text-sm mr-2 text-gray-600 dark:text-gray-300">Đến ngày:</label>
                        <input 
                            type="date" 
                            id="endDate" 
                            name="end"
                            value={dateRange.end || ''}
                            onChange={handleDateChange}
                            className="p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200" 
                        />
                    </div>
                    <button
                        onClick={() => setDateRange({ start: null, end: null })}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Tổng số KOC" value={totalKocs} description="Số KOC duy nhất trong kỳ" />
                <StatCard title="Tổng Doanh số" value={`${totalRevenue.toLocaleString('vi-VN')} đ`} description="Tổng doanh số 3 tháng từ các hợp tác" />
                <StatCard title="Nhãn có doanh số tốt nhất" value={bestPerformingBrand.name} description={`Doanh số: ${bestPerformingBrand.revenue.toLocaleString('vi-VN')} đ`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-lg">Phân bổ Hợp tác theo Thương hiệu</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={brandData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" label>
                                {brandData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-lg">Phân bổ KOC theo Địa phương</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={locationData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="value" name="Số lượng KOC" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h3 className="font-semibold mb-4 text-lg">Xu hướng hợp tác theo thời gian</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="Số lần hợp tác" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }}/>
                    </LineChart>
                 </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Leaderboard
                    title="Top 10 Hợp tác theo Doanh số Tháng"
                    data={top10Kocs}
                    metricKey="revenue1m"
                    emptyMessage="Không có dữ liệu doanh số cho tháng này."
                    selectedBrand={top10Brand}
                    onBrandSelect={setTop10Brand}
                />
                <Leaderboard
                    title="Top 5 Hợp tác theo Doanh số Quý"
                    data={top5Kocs}
                    metricKey="revenue3m"
                    emptyMessage="Không có dữ liệu doanh số cho quý này."
                    selectedBrand={top5Brand}
                    onBrandSelect={setTop5Brand}
                />
            </div>
        </div>
    );
};

export default Dashboard;