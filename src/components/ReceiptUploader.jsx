import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, X, Loader2, ImagePlus } from 'lucide-react';
import { uploadData } from 'aws-amplify/storage';

// ─────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-lg border text-sm font-medium backdrop-blur-sm animate-fade-in-up max-w-sm w-full ${
            t.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity ml-1"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ReceiptUploader Component
// ─────────────────────────────────────────────
export default function ReceiptUploader() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [toasts, setToasts] = useState([]);
  const inputRef = useRef(null);

  // ── Toast helpers ──────────────────────────
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  // ── Drag handlers ─────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  // ── Core upload logic ────────────────────
  const processFile = async (file) => {
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      addToast('Invalid file type. Please upload a .jpg or .png image.', 'error');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    setUploadStatus(null);
    setIsUploading(true);

    try {
      const fileExt = file.type === 'image/png' ? '.png' : '.jpg';
      const uniqueFilename = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`;

      const uploadTask = uploadData({
        path: `public/${uniqueFilename}`,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setUploadProgress(Math.round((transferredBytes / totalBytes) * 100));
            }
          },
        },
      });

      await uploadTask.result;
      setUploadProgress(100);
      setUploadStatus('success');
      addToast(`Receipt uploaded successfully: ${file.name}`, 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setUploadProgress(0);
      addToast(
        'Upload failed. Please check your Amplify Storage configuration and try again.',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isUploading) return;
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) processFile(e.target.files[0]);
    // Reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  const progressBarColor =
    uploadStatus === 'error'
      ? 'bg-red-500'
      : uploadStatus === 'success'
      ? 'bg-emerald-500'
      : 'bg-indigo-600';

  return (
    <>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ImagePlus size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Upload Receipt</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              Accepted formats: .jpg or .png — files are processed automatically
            </p>
          </div>
        </div>

        {/* Drop Zone */}
        <div className="p-6">
          <div
            id="drop-zone"
            className={`relative flex flex-col items-center justify-center py-14 px-8 border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out ${
              isUploading
                ? 'border-indigo-300 bg-indigo-50/40 cursor-not-allowed opacity-70'
                : dragActive
                ? 'border-indigo-500 bg-indigo-50/60 shadow-inner scale-[1.01]'
                : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isUploading && inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png"
              onChange={handleChange}
              disabled={isUploading}
            />

            {/* Icon Circle */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 ${
                isUploading
                  ? 'bg-indigo-100 text-indigo-400'
                  : dragActive
                  ? 'bg-indigo-100 text-indigo-600 scale-110'
                  : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50'
              }`}
            >
              {isUploading ? (
                <Loader2 size={28} className="animate-spin text-indigo-500" />
              ) : (
                <UploadCloud size={28} />
              )}
            </div>

            <p className="text-gray-800 font-semibold text-base mb-1.5">
              {isUploading ? 'Uploading to S3…' : 'Drag and drop your receipt here'}
            </p>
            <p className="text-gray-400 text-sm mb-5">or</p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                !isUploading && inputRef.current.click();
              }}
              disabled={isUploading}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold
                         shadow-sm shadow-indigo-500/20
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:enabled:bg-indigo-700 hover:enabled:shadow-md
                         active:enabled:scale-[0.97]
                         flex items-center gap-2"
            >
              {isUploading && <Loader2 size={14} className="animate-spin" />}
              {isUploading ? 'Processing…' : 'Browse Files'}
            </button>

            <p className="text-[11px] text-gray-400 mt-4">Maximum file size: 10 MB</p>
          </div>
        </div>

        {/* File Progress Card */}
        {selectedFile && (
          <div className="px-6 pb-6">
            <div
              className={`p-4 rounded-xl border transition-colors ${
                uploadStatus === 'error'
                  ? 'bg-red-50 border-red-100'
                  : uploadStatus === 'success'
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-gray-200 shrink-0 shadow-sm">
                    {isUploading ? (
                      <Loader2 className="text-indigo-400 animate-spin" size={20} />
                    ) : uploadStatus === 'error' ? (
                      <AlertCircle className="text-red-400" size={20} />
                    ) : (
                      <File className="text-indigo-500" size={20} />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      {uploadStatus === 'error' && (
                        <span className="text-red-500 ml-2 font-medium">— Upload failed</span>
                      )}
                    </p>
                  </div>
                </div>
                {uploadStatus === 'success' && (
                  <CheckCircle className="text-emerald-500 shrink-0" size={20} />
                )}
                {uploadStatus === 'error' && (
                  <AlertCircle className="text-red-400 shrink-0" size={20} />
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden mt-4">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ease-out ${progressBarColor}`}
                  style={{ width: `${uploadStatus === 'error' ? 100 : uploadProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {uploadStatus === 'success'
                    ? 'Successfully uploaded'
                    : uploadStatus === 'error'
                    ? 'Upload failed — please retry'
                    : 'Uploading…'}
                </span>
                <span
                  className={`text-xs font-bold ${
                    uploadStatus === 'error'
                      ? 'text-red-500'
                      : uploadStatus === 'success'
                      ? 'text-emerald-600'
                      : 'text-indigo-600'
                  }`}
                >
                  {uploadStatus === 'error' ? 'Error' : `${uploadProgress}%`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Portal-style Toast Stack */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
