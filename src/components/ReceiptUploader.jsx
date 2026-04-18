import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle } from 'lucide-react';
import { uploadData } from 'aws-amplify/storage';

export default function ReceiptUploader() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState("");
  const inputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      setSelectedFile(file);
      setUploadProgress(0);
      setToastMsg("");
      
      try {
        const fileExt = file.type === "image/png" ? ".png" : ".jpg";
        const uniqueFilename = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`;

        // Uses AWS Amplify Storage v6 uploadData API
        const uploadTask = uploadData({
          path: `public/${uniqueFilename}`,
          data: file,
          options: {
            contentType: file.type,
            onProgress: ({ transferredBytes, totalBytes }) => {
              if (totalBytes) {
                const progress = Math.round((transferredBytes / totalBytes) * 100);
                setUploadProgress(progress);
              }
            }
          }
        });
        
        await uploadTask.result;
        setUploadProgress(100);
        showToast(`Upload completed: ${file.name}`);
        
      } catch (error) {
        console.error("Upload failed:", error);
        alert("Upload failed. Please ensure amplify storage is fully configured.");
      }
    } else {
      alert("Please upload a .jpg or .png file");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Upload Receipt</h3>
        <p className="text-sm text-gray-500 mt-1">Add a new receipt to your expenses (.jpg or .png)</p>
      </div>

      <div 
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50/50' 
            : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png"
          onChange={handleChange}
        />
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-200 ${dragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
          <UploadCloud size={32} />
        </div>
        
        <p className="text-gray-700 font-medium mb-2 text-lg">
          Drag and drop your file here
        </p>
        <p className="text-gray-400 text-sm mb-6">or</p>
        
        <button 
          onClick={onButtonClick}
          className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-indigo-600 font-medium shadow-sm transition-all duration-200"
        >
          Browse files
        </button>
      </div>

      {selectedFile && (
        <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 shrink-0 shadow-sm">
                <File className="text-indigo-500" size={24} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {uploadProgress === 100 && (
              <CheckCircle className="text-green-500 shrink-0" size={24} />
            )}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-4">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="mt-2 text-right">
            <span className="text-xs font-semibold text-indigo-600">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-green-50 text-green-800 px-5 py-4 rounded-xl shadow-lg border border-green-200 flex items-center gap-3 z-50 transition-all duration-300 ease-in-out">
          <CheckCircle size={20} className="text-green-500 shrink-0" />
          <span className="font-medium text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
