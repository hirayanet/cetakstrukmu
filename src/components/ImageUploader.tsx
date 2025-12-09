import React, { useCallback, useState } from 'react';
import { Upload, FileImage, ZoomIn, ZoomOut } from 'lucide-react';
import { BankType } from '../types/TransferData';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
  selectedBank?: BankType;
}

export default function ImageUploader({ onImageUpload, selectedBank }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      processImage(imageFile);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  }, []);

  const processImage = (file: File) => {
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;

      console.log('📤 Image processed, calling onImageUpload...');

      // Small delay to show upload processing
      await new Promise(resolve => setTimeout(resolve, 800));

      // Langsung panggil onImageUpload, biar OCR jalan di background
      setIsProcessing(false);
      onImageUpload(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // Mapping contoh struk (placeholder path)
  const getExampleImage = (bank: BankType) => {
    // Nanti user tinggal replace file di folder ini
    return `/src/assets/examples/${bank.toLowerCase()}_example.jpg`;
  };

  if (isProcessing) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Berhasil!</h3>
          <p className="text-gray-600 mb-4">Foto sedang diproses...</p>

          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Mempersiapkan untuk ekstraksi data</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {selectedBank && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏦</span>
            <div>
              <p className="font-semibold text-blue-900">Bank Terpilih: {selectedBank}</p>
              <p className="text-sm text-blue-600">Pastikan resi yang diupload dari bank ini</p>
            </div>
          </div>
        </div>
      )}

      {/* Tips untuk foto berkualitas */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h4 className="font-semibold text-green-900 mb-3 flex items-center">
          <span className="text-lg mr-2">💡</span>
          Tips Foto Terbaik untuk Akurasi Maksimal
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center text-green-800">
              <span className="mr-2">✅</span>
              <span>Pencahayaan cukup terang</span>
            </div>
            <div className="flex items-center text-green-800">
              <span className="mr-2">✅</span>
              <span>Foto tegak lurus (tidak miring)</span>
            </div>
            <div className="flex items-center text-green-800">
              <span className="mr-2">✅</span>
              <span>Jarak 15-20cm dari struk</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-red-600">
              <span className="mr-2">❌</span>
              <span>Hindari bayangan atau pantulan</span>
            </div>
            <div className="flex items-center text-red-600">
              <span className="mr-2">❌</span>
              <span>Jangan terlalu dekat/jauh</span>
            </div>
            <div className="flex items-center text-red-600">
              <span className="mr-2">❌</span>
              <span>Hindari foto blur atau goyang</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-gray-400" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unggah Struk Transfer
        </h3>
        <p className="text-gray-600 mb-6">
          Seret foto struk ke sini atau klik untuk pilih file
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <label className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
            <Upload className="w-5 h-5 mr-2" />
            Pilih Foto
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setShowExample(true)}
            className="inline-flex items-center px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors font-medium"
          >
            <FileImage className="w-5 h-5 mr-2" />
            Contoh Struk
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Format: JPG, PNG, WebP (Maksimal 10MB)
        </p>
      </div>

      {/* Example Modal */}
      {showExample && selectedBank && (
        <ExampleModal
          bank={selectedBank}
          onClose={() => setShowExample(false)}
          imageSrc={getExampleImage(selectedBank)}
        />
      )}
    </div>
  );
}

// Sub-component agar state zoom terisolasi dan reset saat dibuka ulang
function ExampleModal({ bank, onClose, imageSrc }: { bank: string, onClose: () => void, imageSrc: string }) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-white z-10">
          <h3 className="font-bold text-gray-900">Contoh Struk {bank}</h3>
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className={`p-1 rounded ${zoom <= 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-white shadow-sm'}`}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="px-2 text-sm font-medium flex items-center text-gray-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className={`p-1 rounded ${zoom >= 3 ? 'text-gray-300' : 'text-gray-700 hover:bg-white shadow-sm'}`}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ml-4">
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="p-6 bg-gray-100 overflow-auto flex-1 flex">
          <div className="relative m-auto">
            <img
              src={imageSrc}
              alt={`Contoh Struk ${bank}`}
              className="object-contain rounded shadow-sm transition-all duration-200"
              style={{
                maxHeight: `${zoom * 65}vh`,
                maxWidth: `${zoom * 100}%`
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/300x500?text=Contoh+Struk+Belum+Ada';
                e.currentTarget.parentElement!.innerHTML += '<p class="text-center text-red-500 mt-2 text-sm">File contoh belum diupload</p>';
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-yellow-50 text-sm text-yellow-800 text-center border-t border-yellow-100 z-10 font-medium">
          ⚠️ Pastikan foto struk Anda <strong>mirip dengan contoh di atas</strong> agar terbaca otomatis.
        </div>
      </div>
    </div>
  );
}

