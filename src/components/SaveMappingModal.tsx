import React from 'react';
import { Save, X, ArrowRight } from 'lucide-react';

interface SaveMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onSkip: () => void;
    data: {
        name: string;
        account: string;
        bank: string;
    };
}

export default function SaveMappingModal({ isOpen, onClose, onSave, onSkip, data }: SaveMappingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center">
                        <Save className="w-5 h-5 mr-2" />
                        Simpan Data Penerima?
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-blue-100 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 mb-4">
                        Kami mendeteksi penerima baru. Apakah Anda ingin menyimpan data ini untuk transaksi berikutnya?
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                        <div className="space-y-2">
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-semibold">Nama Penerima</span>
                                <p className="font-medium text-gray-900">{data.name}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-semibold">Bank & Nomor Rekening</span>
                                <p className="font-medium text-gray-900">{data.bank} - {data.account}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                        <button
                            onClick={onSkip}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Lewati
                        </button>
                        <button
                            onClick={onSave}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Simpan
                        </button>
                    </div>

                    <div className="mt-4 text-center">
                        <button
                            onClick={onSkip}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center mx-auto"
                        >
                            Lanjut tanpa menyimpan <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
