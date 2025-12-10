import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle, LogOut, Home } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import TransferForm from './components/TransferForm';
import ReceiptPreview from './components/ReceiptPreview';
import LoginForm from './components/LoginForm';
import AccountMappingManager from './components/AccountMappingManager';
import SaveMappingModal from './components/SaveMappingModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { TransferData, BankType } from './types/TransferData';
import { extractDataFromImage } from './utils/ocrSimulator';
import { saveAuthData, loadAuthData, clearAuthData, saveAppState, loadAppState, clearAppState, UserSettings, saveUserSettings, loadUserSettings } from './utils/auth';
import { Settings, X, Save, BarChart } from 'lucide-react';
import OnlineIndicator from './components/OnlineIndicator';
import ReportDashboard from './components/ReportDashboard';
import { logVisitor, incrementStat } from './utils/firebase';

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Application state
  const [step, setStep] = useState<'bank-select' | 'upload' | 'form' | 'preview'>('bank-select');
  const [selectedBank, setSelectedBank] = useState<BankType>('BCA');
  const [transferData, setTransferData] = useState<TransferData>({
    date: '',
    senderName: '',
    amount: 0,
    receiverName: '',
    receiverBank: '',
    referenceNumber: '',
    adminFee: 0,
    paperSize: '80mm',
    bankType: 'BCA'
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({
    stage: '',
    message: '',
    percentage: 0
  });

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shopSettings, setShopSettings] = useState<UserSettings>({
    shopName: 'CetakStrukMu',
    shopSubtitle: 'Kirim Uang & Pembayaran',
    shopFooter: 'Terima kasih telah menggunakan layanan CetakStrukMu'
  });

  // Save Mapping Modal State
  const [showSaveMappingModal, setShowSaveMappingModal] = useState(false);
  const [pendingTransferData, setPendingTransferData] = useState<TransferData | null>(null);

  // Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Load authentication state and app state from localStorage on app start
  useEffect(() => {
    const authData = loadAuthData();
    if (authData && authData.isAuthenticated && authData.currentUser) {
      setIsAuthenticated(true);
      setCurrentUser(authData.currentUser);

      // Load app state if user is authenticated
      const appState = loadAppState();
      if (appState) {
        setStep(appState.step);
        setSelectedBank(appState.selectedBank);
        setTransferData(appState.transferData);
        setUploadedImage(appState.uploadedImage);
      }

      // Load user settings
      const settings = loadUserSettings(authData.currentUser);
      if (settings) {
        setShopSettings(settings);
      }
    }
    setIsInitializing(false);

    // Log visitor once per session
    logVisitor();
  }, []);

  // Save app state whenever it changes (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      const appState = {
        step,
        selectedBank,
        transferData,
        uploadedImage
      };
      saveAppState(appState);
    }
  }, [step, selectedBank, transferData, uploadedImage, isAuthenticated, isInitializing]);

  const handleLogin = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const validCredentials = [
        { username: 'admin', password: 'sddqad123' },
        { username: 'user', password: 'user123' },
        { username: 'hry', password: 'hry2025' }
      ];

      const isValid = validCredentials.some(
        cred => cred.username === username && cred.password === password
      );

      if (isValid) {
        setIsAuthenticated(true);
        setCurrentUser(username);
        saveAuthData({ isAuthenticated: true, currentUser: username });

        // Load settings for this user
        const settings = loadUserSettings(username);
        if (settings) {
          setShopSettings(settings);
        } else {
          // Reset to default if no settings found
          setShopSettings({
            shopName: 'CetakStrukMu',
            shopSubtitle: 'Kirim Uang & Pembayaran',
            shopFooter: 'Terima kasih telah menggunakan layanan CetakStrukMu'
          });
        }
      } else {
        setLoginError('Username atau password salah');
      }
    } catch (error) {
      setLoginError('Terjadi kesalahan saat login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser('');
    clearAuthData();
    clearAppState();

    // Reset app state
    setStep('bank-select');
    setSelectedBank('BCA');
    setTransferData({
      date: '',
      senderName: '',
      amount: 0,
      receiverName: '',
      receiverBank: '',
      referenceNumber: '',
      adminFee: 0,
      paperSize: '80mm',
      bankType: 'BCA'
    });
    setUploadedImage(null);
    setIsExtracting(false);
    setExtractionProgress({ stage: '', message: '', percentage: 0 });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserSettings(currentUser, shopSettings);
    setIsSettingsOpen(false);
    alert('Pengaturan berhasil disimpan!');
  };

  const handleBankSelect = (bank: BankType) => {
    setSelectedBank(bank);
    setTransferData(prev => ({ ...prev, bankType: bank }));
    setStep('upload');
  };

  const handleImageUpload = async (imageUrl: string) => {
    setUploadedImage(imageUrl);
    setIsExtracting(true);

    console.log('🎯 Starting data extraction...');

    try {
      // Stage 1: Upload Complete
      setExtractionProgress({
        stage: 'upload',
        message: '📤 Upload gambar berhasil! Memulai proses OCR...',
        percentage: 20
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 2: Initializing OCR
      setExtractionProgress({
        stage: 'init',
        message: '🔧 Mempersiapkan OCR engine dan AI parser...',
        percentage: 40
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      // Stage 3: Processing Image
      setExtractionProgress({
        stage: 'processing',
        message: '📖 Sedang membaca teks dari gambar struk...',
        percentage: 60
      });

      // Extract data with pre-selected bank and paper size
      const extractedData = await extractDataFromImage(imageUrl, selectedBank, transferData.paperSize);

      // Stage 4: Parsing Data
      setExtractionProgress({
        stage: 'parsing',
        message: `🏦 Menganalisa format ${selectedBank} dan mengisi data...`,
        percentage: 80
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 5: Complete
      setExtractionProgress({
        stage: 'complete',
        message: '✅ Data berhasil diekstrak! Mengarahkan ke form...',
        percentage: 100
      });

      console.log('✅ Data extracted:', extractedData);
      setTransferData(extractedData);

      // Track generated receipt
      incrementStat('generated');

      await new Promise(resolve => setTimeout(resolve, 800));
      setStep('form');
    } catch (error: any) {
      console.error('❌ Extraction failed:', error);

      let errorMessage = '❌ Gagal membaca gambar. Pastikan foto jelas dan coba lagi.';
      let isValidationError = false;

      if (error.message && error.message.includes('VALIDATION_ERROR')) {
        errorMessage = '⚠️ ' + error.message.replace('VALIDATION_ERROR: ', '');
        isValidationError = true;
      }

      setExtractionProgress({
        stage: 'error',
        message: errorMessage,
        percentage: 0
      });

      // Auto-reset after 5 seconds (longer for validation errors)
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionProgress({
          stage: '',
          message: '',
          percentage: 0
        });
      }, isValidationError ? 8000 : 5000);
    } finally {
      // Don't set isExtracting to false immediately if there's an error
      if (extractionProgress.stage !== 'error') {
        setIsExtracting(false);
      }
    }
  };

  const handleFormSubmit = (data: TransferData) => {
    // Cek apakah mapping ini baru?
    const nameUpper = data.receiverName?.toUpperCase().trim() || '';
    const account = data.receiverAccount?.trim() || '';

    // Skip jika data kosong atau bank tidak relevan
    if (!nameUpper || !account || !['BCA', 'BRI', 'MANDIRI', 'BNI', 'SEABANK'].includes(data.bankType)) {
      setTransferData(data);
      setStep('preview');
      return;
    }

    // Cek di localStorage
    try {
      const mappings = JSON.parse(localStorage.getItem('accountMappings') || '{}');

      // Jika belum ada mapping untuk nama ini, atau nomor rekening berbeda
      if (!mappings[nameUpper] || mappings[nameUpper] !== account) {
        // Tampilkan modal simpan
        setPendingTransferData(data);
        setShowSaveMappingModal(true);
      } else {
        // Sudah ada dan sama, lanjut saja
        setTransferData(data);
        setStep('preview');
      }
    } catch (e) {
      // Error baca storage, lanjut saja
      setTransferData(data);
      setStep('preview');
    }
  };

  const handleSaveMapping = () => {
    if (pendingTransferData) {
      const nameUpper = pendingTransferData.receiverName?.toUpperCase().trim() || '';
      const account = pendingTransferData.receiverAccount?.trim() || '';

      try {
        const mappings = JSON.parse(localStorage.getItem('accountMappings') || '{}');
        mappings[nameUpper] = account;
        localStorage.setItem('accountMappings', JSON.stringify(mappings));
        // alert('Mapping tersimpan!'); // Optional feedback
      } catch (e) {
        console.error('Gagal menyimpan mapping:', e);
      }

      setTransferData(pendingTransferData);
      setStep('preview');
      setShowSaveMappingModal(false);
      setPendingTransferData(null);
    }
  };

  const handleSkipMapping = () => {
    if (pendingTransferData) {
      setTransferData(pendingTransferData);
      setStep('preview');
      setShowSaveMappingModal(false);
      setPendingTransferData(null);
    }
  };

  const handleBack = () => {
    if (step === 'preview') setStep('form');
    if (step === 'form') {
      setStep('upload');
      setIsExtracting(false);
      setExtractionProgress({
        stage: '',
        message: '',
        percentage: 0
      });
    }
    if (step === 'upload') setStep('bank-select');
  };

  const handleNewReceipt = () => {
    setStep('bank-select');
    setSelectedBank('BCA');
    setUploadedImage(null);
    setIsExtracting(false);
    setExtractionProgress({
      stage: '',
      message: '',
      percentage: 0
    });
    setTransferData({
      date: '',
      senderName: '',
      amount: 0,
      receiverName: '',
      receiverBank: '',
      referenceNumber: '',
      adminFee: 0,
      paperSize: '80mm',
      bankType: 'BCA'
    });
  };

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} isLoading={isLoggingIn} error={loginError} />;
  }

  // DEBUG: log setiap render dan perubahan step
  console.log('[DEBUG][APP][RENDER] step:', step, '| transferData.receiverAccount:', transferData.receiverAccount);
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Printer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CetakStrukMu</h1>
                <p className="text-sm text-gray-600">Upload-Klik-Selesai</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Online Indicator (Admin Only) */}
              {currentUser === 'admin' && <OnlineIndicator />}

              {/* User info and actions */}
              <div className="flex items-center space-x-2 md:space-x-3">
                <span className="text-sm text-gray-600 hidden md:inline">Halo, <strong>{currentUser}</strong></span>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Pengaturan Toko"
                >
                  <Settings className="w-5 h-5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Setting</span>
                </button>

                {/* Report Button (Admin Only) */}
                {currentUser === 'admin' && (
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Laporan Aktivitas"
                  >
                    <BarChart className="w-5 h-5 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Report</span>
                  </button>
                )}

                {step !== 'bank-select' && (
                  <button
                    onClick={handleNewReceipt}
                    className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Kembali ke Home"
                  >
                    <Home className="w-5 h-5 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Home</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header >

      {/* Main Content */}
      < main className="max-w-4xl mx-auto px-4 py-8" >
        {step === 'bank-select' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pilih Bank</h2>
              <p className="text-gray-600">Pilih bank dari resi transfer yang akan diupload</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { type: 'BCA', name: 'Bank BCA', color: 'bg-blue-800', icon: '🏦' },
                { type: 'BRI', name: 'Bank BRI', color: 'bg-blue-600', icon: '🏛️' },
                { type: 'MANDIRI', name: 'Bank Mandiri', color: 'bg-yellow-500', icon: '🏪' },
                { type: 'BNI', name: 'Bank BNI', color: 'bg-orange-500', icon: '🏢' },
                { type: 'BSI', name: 'Bank BSI', color: 'bg-teal-600', icon: '🕌' },
                { type: 'SEABANK', name: 'SeaBank', color: 'bg-green-600', icon: '🌊' },
                { type: 'DANA', name: 'DANA', color: 'bg-blue-500', icon: '💳' },
                { type: 'FLIP', name: 'Flip', color: 'bg-orange-600', icon: '🐬' }
              ].map((bank) => (
                <button
                  key={bank.type}
                  onClick={() => handleBankSelect(bank.type as BankType)}
                  className={`p-6 rounded-xl text-white ${bank.color} hover:opacity-90 transition-all transform hover:scale-105 shadow-lg`}
                >
                  <div className="text-3xl mb-2">{bank.icon}</div>
                  <div className="font-semibold">{bank.name}</div>
                </button>
              ))}
            </div>
          </div>
        )
        }

        {
          step === 'upload' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Resi {selectedBank}</h2>
                  <p className="text-gray-600">Upload foto struk transfer dari {selectedBank}</p>
                </div>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isExtracting}
                >
                  ← Ganti Bank
                </button>
              </div>

              {/* Show progress indicator when extracting */}
              {isExtracting ? (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="text-center mb-6">
                    {/* Progress Icon */}
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {extractionProgress.stage === 'complete' ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : extractionProgress.stage === 'error' ? (
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">!</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>

                    {/* Progress Title */}
                    <h3 className="text-lg font-semibold mb-2">
                      {extractionProgress.stage === 'complete' ? 'Selesai!' :
                        extractionProgress.stage === 'error' ? 'Terjadi Kesalahan' :
                          'Memproses Gambar...'}
                    </h3>

                    {/* Progress Message */}
                    <p className="text-gray-600 text-sm mb-4">{extractionProgress.message}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Progress</span>
                      <span>{extractionProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${extractionProgress.stage === 'error' ? 'bg-red-500' :
                          extractionProgress.stage === 'complete' ? 'bg-green-500' : 'bg-blue-600'
                          }`}
                        style={{ width: `${extractionProgress.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    {[
                      { key: 'upload', icon: '📤', label: 'Upload' },
                      { key: 'init', icon: '🔧', label: 'Persiapan' },
                      { key: 'processing', icon: '📖', label: 'Baca Teks' },
                      { key: 'parsing', icon: '🏦', label: 'Analisa' },
                      { key: 'complete', icon: '✅', label: 'Selesai' }
                    ].map((stepItem, index) => (
                      <div key={stepItem.key} className="text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 ${extractionProgress.percentage > (index * 20) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                          <span className="text-sm">{stepItem.icon}</span>
                        </div>
                        <span className={`${extractionProgress.percentage > (index * 20) ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                          {stepItem.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Error retry button */}
                  {extractionProgress.stage === 'error' && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => {
                          setIsExtracting(false);
                          setExtractionProgress({ stage: '', message: '', percentage: 0 });
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ImageUploader onImageUpload={handleImageUpload} selectedBank={selectedBank} />
              )}
            </div>
          )
        }

        {
          step === 'form' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Periksa Data Transfer</h2>
                  <p className="text-gray-600">Cek dan ubah data yang sudah dibaca dari foto</p>
                </div>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Kembali
                </button>
              </div>
              <TransferForm
                initialData={transferData}
                uploadedImage={uploadedImage}
                onSubmit={handleFormSubmit}
              />
            </div>
          )
        }

        {
          step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Lihat & Cetak</h2>
                  <p className="text-gray-600">Siap dicetak atau disimpan sebagai PDF</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Edit Data
                  </button>
                </div>
              </div>
              <ReceiptPreview transferData={transferData} shopSettings={shopSettings} />
            </div>
          )
        }
      </main >

      {/* Settings Modal */}
      {
        isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Pengaturan Toko</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Toko (Header)
                  </label>
                  <input
                    type="text"
                    value={shopSettings.shopName}
                    onChange={(e) => setShopSettings(prev => ({ ...prev, shopName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: CetakStrukMu"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub-judul
                  </label>
                  <input
                    type="text"
                    value={shopSettings.shopSubtitle}
                    onChange={(e) => setShopSettings(prev => ({ ...prev, shopSubtitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Kirim Uang & Pembayaran"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Footer Struk
                  </label>
                  <input
                    type="text"
                    value={shopSettings.shopFooter}
                    onChange={(e) => setShopSettings(prev => ({ ...prev, shopFooter: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Terima kasih..."
                    required
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      <SaveMappingModal
        isOpen={showSaveMappingModal}
        onClose={() => setShowSaveMappingModal(false)}
        onSave={handleSaveMapping}
        onSkip={handleSkipMapping}
        data={{
          name: pendingTransferData?.receiverName || '',
          account: pendingTransferData?.receiverAccount || '',
          bank: pendingTransferData?.receiverBank || ''
        }}
      />

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 CetakStrukMu. Solusi cetak struk transfer yang mudah dan cepat.</p>
            <p className="mt-1">Cocok untuk agen BRILink, jasa kirim uang harian, dan usaha keuangan kecil.</p>
          </div>
        </div>
      </footer>

      {/* Account Mapping Manager - hanya tampil untuk user yang login */}
      {isAuthenticated && <AccountMappingManager />}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      {/* Report Dashboard Modal */}
      {isReportOpen && <ReportDashboard onClose={() => setIsReportOpen(false)} />}
    </div >
  );
}

export default App;
