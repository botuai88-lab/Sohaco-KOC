import { KOC, Brand, Gender, KOCType } from '../types';

// =========================================================================================
// QUAN TRỌNG:
// 1. Dán URL ứng dụng web Google Apps Script của bạn vào đây.
// 2. Đảm bảo URL nằm giữa hai dấu nháy đơn ''.
// =========================================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMHumZ9jTyUV9K-NxOeXZ-kS-t_vT6LTEYuifMBfZ8iB7A9SA1AfkopDbjm7lJbtPC/exec';

const safeFormatDate = (dateInput: any): string => {
    if (!dateInput) return '';

    let date: Date;

    // Apps script might return a Date object or a formatted string.
    // Handle string format dd/mm/yyyy first as it's the most ambiguous for new Date().
    if (typeof dateInput === 'string') {
        const dmyParts = dateInput.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (dmyParts) {
            // It's dd/mm/yyyy. Create a UTC date to avoid timezone issues.
            // parts[1]=day, parts[2]=month, parts[3]=year
            date = new Date(Date.UTC(Number(dmyParts[3]), Number(dmyParts[2]) - 1, Number(dmyParts[1])));
        } else {
            // Fallback for other formats like ISO that new Date() handles well.
            date = new Date(dateInput);
        }
    } else {
         // It's likely a Date object or something else `new Date` can handle.
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) {
        console.warn(`Invalid date value from Google Sheet: "${dateInput}". Could not parse.`);
        return '';
    }

    // To prevent timezone issues, we construct the YYYY-MM-DD string from the date's UTC components.
    // This correctly handles date-only strings which are parsed as UTC midnight.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

// Helper function to map a row array from Google Sheet to a KOC object
const mapRowToKoc = (row: any[], rowId: number): KOC => {
    // Expected column order from the Google Sheet
    const [
        stt, id, name, gender, birthYear, taxCode, phone, email, address,
        unitPrice, mainField, profileLink, followers, brand, engagementRate,
        cooperationDate, avgViews, postedContentLink, revenue1m, revenue3m,
        voice, progress, kocType, potential, notes
    ] = row;

    return {
        rowId: rowId,
        stt: Number(stt) || 0,
        id: id || '',
        name: name || '',
        gender: (gender as Gender) || Gender.Other,
        birthYear: Number(birthYear) || 0,
        taxCode: taxCode || '',
        phone: String(phone || ''),
        email: email || '',
        address: address || '',
        unitPrice: Number(unitPrice) || 0,
        mainField: mainField || '',
        profileLink: profileLink || '',
        followers: Number(followers) || 0,
        brand: (brand as Brand) || Brand.Sachi,
        engagementRate: Number(engagementRate) || 0,
        cooperationDate: safeFormatDate(cooperationDate),
        avgViews: Number(avgViews) || 0,
        postedContentLink: postedContentLink || '',
        revenue1m: Number(revenue1m) || 0,
        revenue3m: Number(revenue3m) || 0,
        voice: voice || '',
        progress: progress || '',
        kocType: (kocType as KOCType) || KOCType.Nano,
        potential: potential || '',
        notes: notes || '',
    };
};

// Helper function to map a KOC object to a row array for Google Sheet
const mapKocToRow = (koc: Omit<KOC, 'rowId' | 'id' | 'stt'>): any[] => {
    return [
        '', // STT will be auto-generated
        '', // ID will be auto-generated
        koc.name,
        koc.gender,
        koc.birthYear,
        koc.taxCode,
        koc.phone,
        koc.email,
        koc.address,
        koc.unitPrice,
        koc.mainField,
        koc.profileLink,
        koc.followers,
        koc.brand,
        koc.engagementRate,
        koc.cooperationDate,
        koc.avgViews,
        koc.postedContentLink,
        koc.revenue1m,
        koc.revenue3m,
        koc.voice,
        koc.progress,
        koc.kocType,
        koc.potential,
        koc.notes
    ];
};

const checkUrl = () => {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
        throw new Error('Vui lòng cập nhật SCRIPT_URL trong file services/googleSheetService.ts');
    }
}

const postRequest = async (payload: object) => {
    checkUrl();
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not retrieve error details.');
        console.error("Google Sheet API Error Response:", errorText);
        throw new Error(`Network response was not ok (${response.status}). Check console for details.`);
    }

    const result = await response.json();
    if (result.error) {
        throw new Error(result.error);
    }
    return result;
};


// Function to fetch all KOCs
export const getKocs = async (): Promise<KOC[]> => {
    checkUrl();
    const response = await fetch(`${SCRIPT_URL}?action=GET_ALL`);
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not retrieve error details.');
        console.error("Google Sheet API Error Response:", errorText);
        throw new Error(`Network response was not ok (${response.status}). Check console for details.`);
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error);
    }
    return data
        .map((row: any[], index: number) => {
            if (!row || !row[2]) { // Check for name in column C
                return null;
            }
            return mapRowToKoc(row, index + 2); 
        })
        .filter((koc): koc is KOC => koc !== null);
};

// Function to add a single KOC
export const addKoc = async (kocData: Omit<KOC, 'rowId' | 'id' | 'stt'>): Promise<KOC> => {
    const result = await postRequest({
        action: 'CREATE',
        data: mapKocToRow(kocData)
    });
    return mapRowToKoc(result.data, result.rowId);
};

// Function to update a KOC
export const updateKoc = async (koc: KOC): Promise<KOC> => {
     const { rowId, stt, id, ...rest } = koc;
     const rowData = mapKocToRow(rest);
     rowData[0] = stt;
     rowData[1] = id;

    const result = await postRequest({
        action: 'UPDATE',
        rowId: koc.rowId,
        data: rowData,
    });
    return mapRowToKoc(result.data, result.rowId);
};


// Function to delete one or more KOCs
export const deleteKocs = async (rowIds: number[]): Promise<{ success: boolean }> => {
    return postRequest({
        action: 'DELETE',
        rowIds: rowIds,
    });
};


// Function to batch add KOCs (from Excel import)
export const batchAddKocs = async (kocsData: Omit<KOC, 'rowId' | 'id' | 'stt'>[]): Promise<KOC[]> => {
    const rows = kocsData.map(koc => mapKocToRow(koc));
    const result = await postRequest({
        action: 'BATCH_CREATE',
        data: rows
    });

    const { data, startRow } = result;
    return data.map((row: any[], index: number) => mapRowToKoc(row, startRow + index));
}