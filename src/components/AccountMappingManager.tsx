import React, { useState, useEffect } from 'react';

interface AccountMapping {
  [key: string]: string;
}

const AccountMappingManager: React.FC = () => {
  const [mappings, setMappings] = useState<AccountMapping>({});
  const [newName, setNewName] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Load existing mappings
  useEffect(() => {
    // Load dari localStorage
    const savedMappings = localStorage.getItem('accountMappings');
    console.log('🔍 DEBUG: Raw localStorage data:', savedMappings);

    if (savedMappings) {
      try {
        const parsed = JSON.parse(savedMappings);
        console.log('🔍 DEBUG: Parsed mappings:', parsed);
        console.log('🔍 DEBUG: Total mappings found:', Object.keys(parsed).length);
        setMappings(parsed);
      } catch (error) {
        console.error('❌ Failed to load mappings:', error);
      }
    } else {
      console.log('⚠️ DEBUG: No mappings found in localStorage');
    }
  }, []);

  // Save mappings to localStorage
  const saveMappings = (newMappings: AccountMapping) => {
    localStorage.setItem('accountMappings', JSON.stringify(newMappings));
    setMappings(newMappings);
  };

  // Add new mapping
  const addMapping = () => {
    if (!newName.trim() || !newAccount.trim()) {
      alert('Nama dan nomor rekening harus diisi!');
      return;
    }

    const nameUpper = newName.toUpperCase().trim();
    const accountFormatted = newAccount.trim();

    // Validasi format nomor rekening (boleh masking atau full digit)
    const isMasked = /^\*{8,}\d{3,4}$/.test(accountFormatted);
    const isFullDigit = /^\d{8,20}$/.test(accountFormatted.replace(/\s/g, ''));
    if (!isMasked && !isFullDigit) {
      alert('Format nomor rekening harus: ***********xxxx (atau 8-20 digit angka)');
      return;
    }

    const newMappings = {
      ...mappings,
      [nameUpper]: accountFormatted
    };

    saveMappings(newMappings);
    setNewName('');
    setNewAccount('');
    
    alert(`Mapping berhasil ditambahkan:\n${nameUpper} → ${accountFormatted}`);
  };

  // Delete mapping
  const deleteMapping = (name: string) => {
    if (confirm(`Hapus mapping untuk ${name}?`)) {
      const newMappings = { ...mappings };
      delete newMappings[name];
      saveMappings(newMappings);
    }
  };

  // Export mappings
  const exportMappings = () => {
    const dataStr = JSON.stringify(mappings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'account-mappings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Debug function untuk cek localStorage
  const debugLocalStorage = () => {
    const raw = localStorage.getItem('accountMappings');
    console.log('🔍 DEBUG localStorage:', {
      raw: raw,
      parsed: raw ? JSON.parse(raw) : null,
      currentState: mappings
    });
    alert(`LocalStorage Data:\n${raw || 'KOSONG'}\n\nCurrent State:\n${JSON.stringify(mappings, null, 2)}`);
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
      >
        ⚙️ Kelola Mapping
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Kelola Mapping Nama → Nomor Rekening</h2>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Add New Mapping */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">Tambah Mapping Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nama Penerima (contoh: YULIA NINGSIH)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Nomor Rekening (contoh: ***********8532)"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <button
            onClick={addMapping}
            className="mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            Tambah Mapping
          </button>
        </div>

        {/* Existing Mappings */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Mapping yang Ada ({Object.keys(mappings).length})</h3>
            <div className="flex space-x-2">
              <button
                onClick={debugLocalStorage}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition-colors"
              >
                🔍 Debug
              </button>
              <button
                onClick={exportMappings}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
              >
                📥 Export JSON
              </button>
            </div>
          </div>
          
          {Object.keys(mappings).length === 0 ? (
            <p className="text-gray-500 italic">Belum ada mapping. Tambahkan mapping pertama di atas.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(mappings).map(([name, account]) => (
                <div key={name} className="flex justify-between items-center p-3 border rounded bg-white">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-gray-600">{account}</div>
                  </div>
                  <button
                    onClick={() => deleteMapping(name)}
                    className="text-red-500 hover:text-red-700 px-2 py-1"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <strong>Cara Penggunaan:</strong>
          <ul className="mt-1 space-y-1">
            <li>• <strong>Manual:</strong> Tambahkan nama dan nomor rekening di form atas</li>
            <li>• <strong>Otomatis:</strong> Isi field "Nomor Rekening Tujuan" saat print/share → tersimpan otomatis</li>
            <li>• Format nomor rekening: ***********xxxx (11 bintang + 4 digit terakhir)</li>
            <li>• Nama akan otomatis diubah ke HURUF BESAR</li>
            <li>• Data disimpan di browser (localStorage)</li>
          </ul>
        </div>

        {/* Auto-save Info */}
        <div className="text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200">
          <strong>🤖 Fitur Auto-Save Aktif:</strong>
          <p className="mt-1">
            Ketika Anda mengisi field "Nomor Rekening Tujuan" secara manual dan melakukan
            <strong> Print/PDF/Share WhatsApp</strong>, mapping akan tersimpan otomatis untuk penggunaan selanjutnya.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountMappingManager;
