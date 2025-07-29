import React, { useState, useEffect } from 'react';
import { Calculator, CreditCard, Calendar, User, Hash } from 'lucide-react';
import { TransferData } from '../types/TransferData';

interface TransferFormProps {
  initialData: TransferData;
  uploadedImage: string | null;
  onSubmit: (data: TransferData) => void;
}

export default function TransferForm({ initialData, uploadedImage, onSubmit }: TransferFormProps) {
  const [formData, setFormData] = useState<TransferData>({
    ...initialData,
    receiverAccount: initialData.receiverAccount || '',
    // Set default nama pengirim untuk BCA
    senderName: initialData.bankType === 'BCA' ? 'GANI MUHAMMAD RMADLAN' : initialData.senderName
  });
  const [mappingNotice, setMappingNotice] = useState('');
  const [detectionInfo, setDetectionInfo] = useState<string>('');

  const adminFeeOptions = [
    { value: 0, label: 'Rp 0' },
    { value: 3000, label: 'Rp 3.000' },
    { value: 5000, label: 'Rp 5.000' },
    { value: 10000, label: 'Rp 10.000' },
    { value: 15000, label: 'Rp 15.000' },
    { value: 20000, label: 'Rp 20.000' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const totalAmount = formData.amount + formData.adminFee;

  // Debug log setiap kali render
  console.log('[DEBUG][RENDER] initialData.receiverAccount:', initialData.receiverAccount);
  console.log('[DEBUG][RENDER] formData.receiverAccount:', formData.receiverAccount);
  // Debug log setiap perubahan initialData.receiverAccount dan formData.receiverAccount
  useEffect(() => {
    console.log('[DEBUG][EFFECT] initialData.receiverAccount:', initialData.receiverAccount);
  }, [initialData.receiverAccount]);
  useEffect(() => {
    console.log('[DEBUG][EFFECT] formData.receiverAccount:', formData.receiverAccount);
  }, [formData.receiverAccount]);
  // Selalu update receiverAccount jika initialData.receiverAccount berubah
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      receiverAccount: initialData.receiverAccount || ''
    }));
  }, [initialData.receiverAccount]);

  useEffect(() => {
    setFormData({ ...initialData,
      receiverAccount: initialData.receiverAccount || '',
      senderName: initialData.bankType === 'BCA' ? 'GANI MUHAMMAD RMADLAN' : initialData.senderName
    });
    setMappingNotice('');
  }, [initialData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Mapping notice */}
      {mappingNotice && (
        <div className="mb-2 text-green-600 text-sm font-medium">
          {mappingNotice}
        </div>
      )}
      {/* Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 mr-2" />
              Tanggal Kirim
            </label>
            <input
              type="text"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="DD/MM/YYYY"
              required
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              Nama Pengirim
            </label>
            <input
              type="text"
              value={formData.senderName}
              onChange={(e) => setFormData({ ...formData, senderName: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="NAMA LENGKAP"
              required
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 mr-2" />
              Jumlah Uang
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="500000"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Rp {formatNumber(formData.amount)}
            </p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              Nama Penerima
            </label>
            <input
              type="text"
              value={formData.receiverName}
              onChange={async (e) => {
                const newName = e.target.value.toUpperCase();
                let newAccount = formData.receiverAccount;
                let notice = '';
                // Cek mapping manual
                try {
                  const mappings = JSON.parse(localStorage.getItem('accountMappings') || '{}');
                  if (newName && mappings[newName]) {
                    newAccount = mappings[newName];
                    notice = `Nomor rekening otomatis diisi dari mapping: ${newAccount}`;
                  }
                } catch {}
                setFormData({ ...formData, receiverName: newName, receiverAccount: newAccount });
                setMappingNotice(notice);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="NAMA PENERIMA"
              required
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 mr-2" />
              Bank Tujuan
            </label>
            <select
              value={formData.receiverBank}
              onChange={(e) => setFormData({ ...formData, receiverBank: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Pilih Bank Tujuan</option>
              <option value="BCA">Bank BCA</option>
              <option value="BRI">Bank BRI</option>
              <option value="MANDIRI">Bank Mandiri</option>
              <option value="BNI">Bank BNI</option>
              <option value="SEABANK">SeaBank</option>
              <option value="DANA">DANA</option>
              <option value="OVO">OVO</option>
              <option value="GOPAY">GoPay</option>
              <option value="SHOPEEPAY">ShopeePay</option>
            </select>
          </div>

          {(formData.receiverAccount || ['BCA', 'BRI', 'MANDIRI', 'BNI', 'SEABANK'].includes(formData.bankType)) && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Hash className="w-4 h-4 mr-2" />
                Nomor Rekening Tujuan
              </label>
              <input
                type="text"
                value={formData.receiverAccount || ''}
                onChange={(e) => setFormData({ ...formData, receiverAccount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1234567890"
                required
              />
            </div>
          )}

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 mr-2" />
              Nomor Ref
            </label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="TF12345678"
              required
            />
          </div>

    

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calculator className="w-4 h-4 mr-2" />
              Biaya Admin
            </label>
            <select
              value={formData.adminFee}
              onChange={(e) => setFormData({ ...formData, adminFee: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {adminFeeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Ukuran Kertas
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="58mm"
                  checked={formData.paperSize === '58mm'}
                  onChange={(e) => setFormData({ ...formData, paperSize: e.target.value as '58mm' | '80mm' })}
                  className="mr-2"
                />
                58mm
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="80mm"
                  checked={formData.paperSize === '80mm'}
                  onChange={(e) => setFormData({ ...formData, paperSize: e.target.value as '58mm' | '80mm' })}
                  className="mr-2"
                />
                80mm
              </label>
            </div>
          </div>

          {/* Total Calculation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Jumlah Kirim:</span>
                <span>Rp {formatNumber(formData.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Biaya Admin:</span>
                <span>Rp {formatNumber(formData.adminFee)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span className="text-green-600">Rp {formatNumber(totalAmount)}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
          >
            Lanjut ke Tampilan
          </button>
        </form>
      </div>

      {/* Image Preview */}
      {uploadedImage && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Resi {formData.bankType}</h3>
          
          <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">✅</span>
              <span className="font-semibold">Bank: {formData.bankType}</span>
            </div>
            
            <p className="text-sm text-gray-600">
              Data berhasil diekstrak dari resi {formData.bankType}
            </p>
          </div>
          
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={uploadedImage}
              alt="Uploaded receipt"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
