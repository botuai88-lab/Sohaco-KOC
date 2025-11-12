import { KOC, Brand, Gender, KOCType } from '../types';

// This makes TypeScript aware of the global XLSX object from the CDN script
declare var XLSX: any;

const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return '';
    }
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

export const exportToExcel = (kocs: KOC[], fileName: string): void => {
    const worksheet = XLSX.utils.json_to_sheet(kocs.map(koc => ({
        'STT': koc.stt,
        'Mã KOC': koc.id,
        'Họ & Tên': koc.name,
        'Giới Tính': koc.gender,
        'Năm Sinh': koc.birthYear,
        'Mã Số Thuế': koc.taxCode,
        'SĐT': koc.phone,
        'Email': koc.email,
        'Địa chỉ (Tỉnh/TP)': koc.address,
        'Đơn Giá': koc.unitPrice,
        'Lĩnh vực chính': koc.mainField,
        'Link profile': koc.profileLink,
        'Follower': koc.followers,
        'Nhãn phụ trách': koc.brand,
        'Tỷ lệ tương tác (%)': koc.engagementRate,
        'Ngày hợp tác': formatDateForDisplay(koc.cooperationDate),
        'Lượt view trung bình': koc.avgViews,
        'Nội dung đã đăng (link)': koc.postedContentLink,
        'Doanh số sau 1m': koc.revenue1m,
        'Doanh số sau 3m': koc.revenue3m,
        'Voice': koc.voice,
        'Tiến độ': koc.progress,
        'Loại KOC': koc.kocType,
        'Tiềm năng phát triển': koc.potential,
        'Ghi chú': koc.notes,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KOCs');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

const safeParseExcelDate = (cellValue: any): string => {
    if (!cellValue) {
        return '';
    }

    let date: Date;

    // With `cellDates: true`, XLSX provides JS Date objects for date-formatted cells.
    // These objects are timezone-sensitive and represent midnight in the local timezone.
    // We must correct for the local timezone offset to get the intended date.
    if (cellValue instanceof Date) {
        if (isNaN(cellValue.getTime())) {
            return ''; // Invalid date object
        }
        const userTimezoneOffset = cellValue.getTimezoneOffset() * 60000;
        date = new Date(cellValue.getTime() - userTimezoneOffset);
    } 
    // If it's a string, we need to parse it carefully.
    else if (typeof cellValue === 'string') {
        // Match dd/mm/yyyy or dd-mm-yyyy
        const dmyParts = cellValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (dmyParts) {
            // It's dd/mm/yyyy. Create a UTC date to avoid timezone issues.
            // parts[1]=day, parts[2]=month, parts[3]=year
            date = new Date(Date.UTC(Number(dmyParts[3]), Number(dmyParts[2]) - 1, Number(dmyParts[1])));
        } else {
            // Fallback for other formats like ISO that new Date() handles well.
            date = new Date(cellValue);
        }
    } 
    // For numbers (Excel serial date), pass to constructor.
    else {
        date = new Date(cellValue);
    }

    if (isNaN(date.getTime())) {
        console.warn(`Unparseable date value during Excel import: ${cellValue}`);
        return '';
    }
    
    // Return in YYYY-MM-DD format for consistency within the app.
    return date.toISOString().split('T')[0];
};


export const importFromExcel = (file: File): Promise<Omit<KOC, 'rowId' | 'id' | 'stt'>[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays
                
                // Find header row to map columns dynamically
                const header = json[0].map(h => String(h).trim());
                const colMap: { [key: string]: number } = {
                    'Họ & Tên': header.indexOf('Họ & Tên'),
                    'Giới Tính': header.indexOf('Giới Tính'),
                    'Năm Sinh': header.indexOf('Năm Sinh'),
                    'Mã Số Thuế': header.indexOf('Mã Số Thuế'),
                    'SĐT': header.indexOf('SĐT'),
                    'Email': header.indexOf('Email'),
                    'Địa chỉ (Tỉnh/TP)': header.indexOf('Địa chỉ (Tỉnh/TP)'),
                    'Đơn Giá': header.indexOf('Đơn Giá'),
                    'Lĩnh vực chính': header.indexOf('Lĩnh vực chính'),
                    'Link profile': header.indexOf('Link profile'),
                    'Follower': header.indexOf('Follower'),
                    'Nhãn phụ trách': header.indexOf('Nhãn phụ trách'),
                    'Tỷ lệ tương tác (%)': header.indexOf('Tỷ lệ tương tác (%)'),
                    'Ngày hợp tác': header.indexOf('Ngày hợp tác'),
                    'Lượt view trung bình': header.indexOf('Lượt view trung bình'),
                    'Nội dung đã đăng (link)': header.indexOf('Nội dung đã đăng (link)'),
                    'Doanh số sau 1m': header.indexOf('Doanh số sau 1m'),
                    'Doanh số sau 3m': header.indexOf('Doanh số sau 3m'),
                    'Voice': header.indexOf('Voice'),
                    'Tiến độ': header.indexOf('Tiến độ'),
                    'Loại KOC': header.indexOf('Loại KOC'),
                    'Tiềm năng phát triển': header.indexOf('Tiềm năng phát triển'),
                    'Ghi chú': header.indexOf('Ghi chú'),
                };

                const kocs: Omit<KOC, 'id' | 'stt' | 'rowId'>[] = json.slice(1).map(row => {
                    const brandString = row[colMap['Nhãn phụ trách']] || '';

                    return {
                        name: row[colMap['Họ & Tên']] || '',
                        gender: (row[colMap['Giới Tính']] as Gender) || Gender.Other,
                        birthYear: Number(row[colMap['Năm Sinh']]) || 0,
                        taxCode: row[colMap['Mã Số Thuế']] || '',
                        phone: String(row[colMap['SĐT']] || ''),
                        email: row[colMap['Email']] || '',
                        address: row[colMap['Địa chỉ (Tỉnh/TP)']] || '',
                        unitPrice: Number(row[colMap['Đơn Giá']]) || 0,
                        mainField: row[colMap['Lĩnh vực chính']] || '',
                        profileLink: row[colMap['Link profile']] || '',
                        followers: Number(row[colMap['Follower']]) || 0,
                        brand: (brandString.trim() as Brand) || Brand.Sachi,
                        engagementRate: Number(row[colMap['Tỷ lệ tương tác (%)']]) || 0,
                        cooperationDate: safeParseExcelDate(row[colMap['Ngày hợp tác']]),
                        avgViews: Number(row[colMap['Lượt view trung bình']]) || 0,
                        postedContentLink: row[colMap['Nội dung đã đăng (link)']],
                        revenue1m: Number(row[colMap['Doanh số sau 1m']]) || 0,
                        revenue3m: Number(row[colMap['Doanh số sau 3m']]) || 0,
                        voice: row[colMap['Voice']] || '',
                        progress: row[colMap['Tiến độ']] || '',
                        kocType: (row[colMap['Loại KOC']] as KOCType) || KOCType.Nano,
                        potential: row[colMap['Tiềm năng phát triển']] || '',
                        notes: row[colMap['Ghi chú']] || '',
                    };
                }).filter(koc => koc.name); // Filter out empty rows
                
                resolve(kocs);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};