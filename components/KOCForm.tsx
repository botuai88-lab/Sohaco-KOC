import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { KOC, Brand, Gender, KOCType } from '../types';
import { BRANDS, GENDERS, MAIN_FIELDS, KOC_TYPES, PROVINCES } from '../constants';
import Modal from './common/Modal';

interface KOCFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (koc: KOC | Omit<KOC, 'rowId' | 'id' | 'stt'>) => Promise<void>;
  koc: KOC | null;
  kocs: KOC[]; // Pass all KOCs to find existing ones
}

const initialFormData: Omit<KOC, 'rowId' | 'id' | 'stt'> = {
  name: '',
  gender: Gender.Other,
  birthYear: new Date().getFullYear() - 18,
  taxCode: '',
  phone: '',
  email: '',
  address: '',
  unitPrice: 0,
  mainField: '',
  profileLink: '',
  followers: 0,
  brand: Brand.Sachi,
  engagementRate: 0,
  cooperationDate: new Date().toISOString().split('T')[0],
  avgViews: 0,
  postedContentLink: '',
  revenue1m: 0,
  revenue3m: 0,
  voice: '',
  progress: '',
  kocType: KOCType.Nano,
  potential: '',
  notes: '',
};

const KOCForm: React.FC<KOCFormProps> = ({ isOpen, onClose, onSave, koc, kocs }) => {
  const [formData, setFormData] = useState<Omit<KOC, 'id' | 'stt' | 'rowId'>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (koc) {
      const { rowId, id, stt, ...editableData } = koc;
      setFormData(editableData);
    } else {
      setFormData(initialFormData);
    }
     setErrors({});
     setIsSaving(false);
  }, [koc, isOpen]);

  const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!formData.name) newErrors.name = "Họ & Tên là bắt buộc.";
      if (!formData.phone) newErrors.phone = "Số điện thoại là bắt buộc.";
      if (!formData.email) newErrors.email = "Email là bắt buộc.";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email không hợp lệ.";
      if (formData.followers < 0) newErrors.followers = "Followers không thể là số âm.";
      if (formData.birthYear > new Date().getFullYear() || formData.birthYear < 1920) newErrors.birthYear = "Năm sinh không hợp lệ."
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : Number(value);
    if (!isNaN(numValue)) {
        setFormData(prev => ({...prev, [name]: numValue}));
    }
  };
  
  const handleTaxCodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const taxCode = e.target.value;
    if (taxCode && !koc) { // Only autofill on create and if tax code is entered
        const existingKoc = kocs.find(k => k.taxCode === taxCode);
        if (existingKoc) {
            setFormData(prev => ({
                ...prev,
                name: existingKoc.name,
                gender: existingKoc.gender,
                birthYear: existingKoc.birthYear,
                phone: existingKoc.phone,
                email: existingKoc.email,
                address: existingKoc.address,
                mainField: existingKoc.mainField,
                profileLink: existingKoc.profileLink,
                followers: existingKoc.followers,
                kocType: existingKoc.kocType,
                voice: existingKoc.voice || '',
            }));
        }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSaving(true);
      try {
        if(koc) { // Editing
            await onSave({ ...koc, ...formData });
        } else { // Adding
            await onSave(formData);
        }
      } catch (error) {
        alert("Đã xảy ra lỗi khi lưu. Vui lòng thử lại.");
        console.error("Save error:", error);
        setIsSaving(false);
      }
    }
  };

  const FormField: React.FC<{label: string, name: keyof typeof initialFormData, error?: string, children: React.ReactNode}> = ({ label, name, error, children }) => (
    <div>
        <label htmlFor={name} className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{label}</label>
        {children}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={koc ? 'Chỉnh sửa Hợp tác' : 'Thêm mới Hợp tác'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Column 1 */}
            <div className="space-y-4">
                 <FormField label="Họ & Tên" name="name" error={errors.name}>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required />
                 </FormField>
                 <FormField label="Số điện thoại" name="phone" error={errors.phone}>
                     <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required />
                 </FormField>
                 <FormField label="Email" name="email" error={errors.email}>
                     <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required />
                 </FormField>
                <FormField label="Followers" name="followers" error={errors.followers}>
                    <input type="number" name="followers" value={formData.followers} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                </FormField>
                 <FormField label="Link Profile" name="profileLink">
                     <input type="url" name="profileLink" value={formData.profileLink} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                <FormField label="Tiến độ" name="progress">
                    <input type="text" name="progress" value={formData.progress} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                </FormField>
                <FormField label="Đơn giá (VND)" name="unitPrice">
                    <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                </FormField>
                <FormField label="Doanh số 1 tháng" name="revenue1m">
                    <input type="number" name="revenue1m" value={formData.revenue1m} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                </FormField>
                 <FormField label="Doanh số 3 tháng" name="revenue3m">
                    <input type="number" name="revenue3m" value={formData.revenue3m} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                </FormField>
            </div>
            {/* Column 2 */}
            <div className="space-y-4">
                 <FormField label="Năm sinh" name="birthYear" error={errors.birthYear}>
                     <input type="number" name="birthYear" value={formData.birthYear} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                 <FormField label="Giới tính" name="gender">
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                 </FormField>
                 <FormField label="Địa chỉ (Tỉnh/TP)" name="address">
                     <select name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                        <option value="">-- Chọn Tỉnh/TP --</option>
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                     </select>
                 </FormField>
                 <FormField label="Tỷ lệ tương tác (%)" name="engagementRate">
                    <input type="number" step="0.1" name="engagementRate" value={formData.engagementRate} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                 <FormField label="Lượt view trung bình" name="avgViews">
                    <input type="number" name="avgViews" value={formData.avgViews} onChange={handleNumberChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                 <FormField label="Loại KOC" name="kocType">
                     <select name="kocType" value={formData.kocType} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                         {KOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                 </FormField>
                 <FormField label="Lĩnh vực chính" name="mainField">
                     <select name="mainField" value={formData.mainField} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                         <option value="">-- Chọn lĩnh vực --</option>
                         {MAIN_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                 </FormField>
                 <FormField label="Voice" name="voice">
                    <textarea name="voice" value={formData.voice} onChange={handleChange} rows={2} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"></textarea>
                 </FormField>
            </div>
            {/* Column 3 */}
            <div className="space-y-4">
                 <FormField label="Mã số thuế" name="taxCode">
                     <input type="text" name="taxCode" value={formData.taxCode} onChange={handleChange} onBlur={handleTaxCodeBlur} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                 <FormField label="Ngày hợp tác" name="cooperationDate">
                    <input type="date" name="cooperationDate" value={formData.cooperationDate} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                 <FormField label="Link nội dung đã đăng" name="postedContentLink">
                     <input type="url" name="postedContentLink" value={formData.postedContentLink} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                 </FormField>
                 <FormField label="Nhãn phụ trách" name="brand">
                    <select name="brand" value={formData.brand} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </FormField>
                  <FormField label="Tiềm năng phát triển" name="potential">
                    <textarea name="potential" value={formData.potential} onChange={handleChange} rows={2} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"></textarea>
                 </FormField>
                 <FormField label="Ghi chú" name="notes">
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"></textarea>
                 </FormField>
            </div>
        </div>
        
        <div className="flex justify-end gap-4 pt-4 border-t dark:border-gray-700">
          <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600" disabled={isSaving}>
            Hủy
          </button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default KOCForm;