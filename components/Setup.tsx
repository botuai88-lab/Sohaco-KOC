import React, { useState } from 'react';

interface SetupProps {
  onConnect: (url: string) => Promise<void>;
}

const Setup: React.FC<SetupProps> = ({ onConnect }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('Vui lòng nhập URL.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConnect(url);
      // On success, the parent component will save the URL and re-render.
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối. Vui lòng kiểm tra lại URL và đảm bảo Script đã được deploy chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            Cài đặt kết nối
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Vui lòng cung cấp URL Web App từ Google Apps Script để bắt đầu.
          </p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-200">
            <h4 className="font-bold">Hướng dẫn lấy URL:</h4>
            <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                <li>Mở file <strong>google-apps-script.js</strong> trong dự án này và sao chép toàn bộ nội dung.</li>
                <li>Mở Google Sheet của bạn, vào <strong>Tiện ích mở rộng &gt; Apps Script</strong>.</li>
                <li>Dán nội dung đã sao chép vào trình soạn thảo script.</li>
                <li>Nhấp vào <strong>"Triển khai" &gt; "Triển khai mới"</strong>.</li>
                <li>Chọn loại là <strong>"Ứng dụng web"</strong>.</li>
                <li>Trong phần "Ai có quyền truy cập", chọn <strong>"Bất kỳ ai"</strong>.</li>
                <li>Nhấp "Triển khai", cấp quyền, và sao chép <strong>URL Ứng dụng web</strong> được cung cấp.</li>
            </ol>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="script-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              URL Ứng dụng Web Google Apps Script
            </label>
            <div className="mt-1">
              <input
                id="script-url"
                name="url"
                type="url"
                autoComplete="off"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://script.google.com/macros/s/..."
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Đang kết nối...' : 'Kết nối và Bắt đầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Setup;