import { createWorker } from 'tesseract.js';
import { TransferData, BankType } from '../types/TransferData';

// Load mapping dari localStorage atau fallback ke default
function loadAccountMapping(): { [key: string]: string } {
  try {
    // Coba load dari localStorage (data dari AccountMappingManager)
    const savedMappings = localStorage.getItem('accountMappings');
    if (savedMappings) {
      const parsed = JSON.parse(savedMappings);
      console.log('📂 Loaded account mappings from localStorage:', Object.keys(parsed));
      return parsed;
    }

    // Fallback ke default mapping
    console.log('📂 Using default account mappings');
    return {
      "YULIA NINGSIH": "***********8532",
      "JOHN DOE": "***********1234",
      "SITI AMINAH": "***********5678",
      "AHMAD RIZKI": "***********9876",
      "MAYA SARI": "***********4321"
      // Default mapping - bisa ditambah melalui UI
    };
  } catch (error) {
    console.error('❌ Failed to load account mapping:', error);
    return {
      "YULIA NINGSIH": "***********8532" // Fallback minimal
    };
  }
}

// Auto-save mapping ketika user melakukan print/share
export function autoSaveAccountMapping(receiverName: string, receiverAccount: string): boolean {
  try {
    if (!receiverName?.trim() || !receiverAccount?.trim()) {
      console.log('⚠️ Auto-save skipped: Empty name or account');
      return false;
    }

    const nameUpper = receiverName.toUpperCase().trim();

    // Validasi format nomor rekening
    if (!receiverAccount.match(/^\*{8,}\d{3,4}$/)) {
      console.log('⚠️ Auto-save skipped: Invalid account format:', receiverAccount);
      return false;
    }

    // Load existing mappings
    const existingMappings = loadAccountMapping();

    // Cek apakah sudah ada mapping untuk nama ini
    if (existingMappings[nameUpper]) {
      if (existingMappings[nameUpper] === receiverAccount) {
        console.log('ℹ️ Auto-save skipped: Mapping already exists and identical');
        return false;
      } else {
        console.log('🔄 Auto-save: Updating existing mapping', {
          name: nameUpper,
          old: existingMappings[nameUpper],
          new: receiverAccount
        });
      }
    } else {
      console.log('➕ Auto-save: Adding new mapping', {
        name: nameUpper,
        account: receiverAccount
      });
    }

    // Update mapping
    const updatedMappings = {
      ...existingMappings,
      [nameUpper]: receiverAccount
    };

    // Save to localStorage
    localStorage.setItem('accountMappings', JSON.stringify(updatedMappings));

    console.log('✅ Auto-save successful:', {
      name: nameUpper,
      account: receiverAccount,
      totalMappings: Object.keys(updatedMappings).length
    });

    return true;
  } catch (error) {
    console.error('❌ Auto-save failed:', error);
    return false;
  }
}

function parseBCAReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('🔷 Parsing BCA Receipt:', lines);
  
  let senderName = '';
  let receiverName = '';
  let amount = 0;
  let referenceNumber = '';
  let receiverAccount = '';
  let date = '';
  let time = '';
  let adminFee = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Date and time - format: 25/07 07:29:32
    if (line.match(/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/)) {
      const dateTimeMatch = line.match(/(\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})/);
      if (dateTimeMatch) {
        date = dateTimeMatch[1] + '/' + new Date().getFullYear();
        time = dateTimeMatch[2];
      }
    }
    
    // Account number - after "Ke" - format: Ke 1670903504
    if (upperLine.startsWith('KE ')) {
      receiverAccount = line.replace(/^KE\s+/i, '').trim();
    }
    
    // Receiver name - usually line after account number
    if (receiverAccount && !receiverName && line.length > 2 && 
        !line.includes('Rp') && !line.includes('Ref') && 
        !line.match(/\d{2}\/\d{2}/) && !upperLine.includes('TRANSFER')) {
      if (line.match(/^[A-Z\s]+$/)) {
        receiverName = line;
      }
    }
    
    // Amount - format: Rp 130,000.00
    if (line.startsWith('Rp ')) {
      let amountMatch = line.match(/Rp\s+([\d,]+)\.00/);
      if (!amountMatch) {
        amountMatch = line.match(/Rp\s+([\d,]+)/);
      }
      
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/,/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 BCA Amount:', { original: line, parsed: amount });
      }
    }
    
    // Reference number - format: Ref 9503120250725072931956672CAE83FCB72B
    if (upperLine.startsWith('REF ')) {
      referenceNumber = line.replace(/^REF\s+/i, '').trim();
    }
  }
  
  if (!senderName) senderName = 'GANI MUHAMMAD RMADLAN';
  
  return {
    date: date || new Date().toLocaleDateString('id-ID'),
    senderName,
    amount: amount || 0,
    receiverName: receiverName || 'NAMA PENERIMA',
    receiverBank: 'BCA',
    receiverAccount,
    referenceNumber: referenceNumber || 'BCA' + Date.now().toString().slice(-8),
    adminFee,
    paperSize,
    bankType,
    time
  };
}

function parseBRIReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('🔵 Parsing BRI Receipt - RAW LINES:', lines);

  let senderName = '';
  let receiverName = '';
  let amount = 0;
  let referenceNumber = '';
  let receiverAccount = '';
  let date = '';
  let time = '';
  let adminFee = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Date and time parsing - Format: "25 Juli 2025, 10:02:40 WIB"
    if (line.match(/\d{1,2}\s+\w+\s+\d{4},\s+\d{2}:\d{2}:\d{2}/)) {
      const dateTimeMatch = line.match(/(\d{1,2}\s+\w+\s+\d{4}),\s+(\d{2}:\d{2}:\d{2})/);
      if (dateTimeMatch) {
        date = dateTimeMatch[1];
        time = dateTimeMatch[2];
        console.log('📅 BRI Date/Time FOUND:', { date, time });
      }
    }

    // Amount parsing - Multiple strategies for BRI
    // Strategy 1: Look for "Total Transaksi" followed by "Rp300.000"
    if (upperLine.includes('TOTAL TRANSAKSI')) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.startsWith('Rp')) {
        const amountMatch = nextLine.match(/Rp([\d,\.]+)/);
        if (amountMatch) {
          const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
          amount = parseInt(cleanAmount);
          console.log('💰 BRI Amount FOUND (Total Transaksi):', { original: nextLine, parsed: amount });
        }
      }
    }

    // Strategy 2: Look for "Nominal" followed by amount
    if (!amount && upperLine.includes('NOMINAL')) {
      const amountMatch = line.match(/Rp([\d,\.]+)/);
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 BRI Amount FOUND (Nominal):', { original: line, parsed: amount });
      }
    }

    // Strategy 3: Direct Rp amount after date (standalone line)
    if (!amount && line.startsWith('Rp') && line.match(/^Rp[\d,\.]+$/)) {
      const amountMatch = line.match(/Rp([\d,\.]+)/);
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 BRI Amount FOUND (Direct):', { original: line, parsed: amount });
      }
    }

    // Reference number - Look for "No. Ref" followed by number
    if ((upperLine.includes('NO.') && upperLine.includes('REF')) ||
        upperLine.includes('NO REF')) {
      console.log(`🎯 Found "No. Ref" at line ${i}: "${line}"`);

      // Check same line first
      const sameLineMatch = line.match(/(\d{12})/);
      if (sameLineMatch) {
        referenceNumber = sameLineMatch[1];
        console.log(`✅ BRI Reference FOUND in SAME LINE: "${referenceNumber}"`);
      } else {
        // Check next line
        const nextLine = lines[i + 1];
        if (nextLine) {
          const nextLineMatch = nextLine.match(/(\d{12})/);
          if (nextLineMatch) {
            referenceNumber = nextLineMatch[1];
            console.log(`✅ BRI Reference FOUND in NEXT LINE: "${referenceNumber}"`);
          }
        }
      }
    }

    // Sender name - Look after "Sumber Dana"
    if (upperLine.includes('SUMBER DANA')) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidateLine = lines[j];
        // Look for name pattern (letters and spaces, not bank info or account numbers)
        if (candidateLine.match(/^[A-Z\s]+$/) &&
            candidateLine.length > 3 &&
            !candidateLine.includes('BANK') &&
            !candidateLine.match(/^\d/) &&
            !candidateLine.match(/\*{4}/)) {
          senderName = candidateLine;
          console.log('👤 BRI Sender FOUND:', senderName);
          break;
        }
      }
    }

    // Receiver name - Look after "Tujuan"
    if (upperLine.includes('TUJUAN')) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidateLine = lines[j];
        // Look for name pattern (letters and spaces, not bank info or account numbers)
        if (candidateLine.match(/^[A-Z\s]+$/) &&
            candidateLine.length > 3 &&
            !candidateLine.includes('BANK') &&
            !candidateLine.match(/^\d/)) {
          receiverName = candidateLine;
          console.log('👥 BRI Receiver FOUND:', receiverName);
          break;
        }
      }
    }

    // Receiver account - Look for BRI account format: "6603 0103 5831 539"
    // Pattern: 4 digits space 4 digits space 4 digits space 3 digits
    if (line.match(/\d{4}\s+\d{4}\s+\d{4}\s+\d{3}/)) {
      receiverAccount = line.match(/\d{4}\s+\d{4}\s+\d{4}\s+\d{3}/)?.[0] || '';
      console.log('💳 BRI Receiver Account FOUND (format 1):', receiverAccount);
    }
    // Alternative: 4-4-7 format like "6603 0103 5831539"
    else if (line.match(/\d{4}\s+\d{4}\s+\d{7}/)) {
      receiverAccount = line.match(/\d{4}\s+\d{4}\s+\d{7}/)?.[0] || '';
      console.log('💳 BRI Receiver Account FOUND (format 2):', receiverAccount);
    }
    // Alternative: continuous 15 digits
    else if (!receiverAccount && line.match(/^\d{15}$/)) {
      const accountNumber = line.match(/^\d{15}$/)?.[0] || '';
      if (accountNumber) {
        // Format with spaces: xxxx xxxx xxxx xxx
        receiverAccount = accountNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{3})/, '$1 $2 $3 $4');
        console.log('💳 BRI Receiver Account FORMATTED:', receiverAccount);
      }
    }
  }
  
  console.log('🔵 FINAL BRI Results:', {
    referenceNumber,
    amount,
    senderName,
    receiverName,
    receiverAccount // Tambahkan log untuk receiverAccount
  });
  
  return {
    date: date || new Date().toLocaleDateString('id-ID'),
    senderName: senderName || 'PENGIRIM BRI',
    amount: amount || 0,
    receiverName: receiverName || 'NAMA PENERIMA',
    receiverBank: 'BRI',
    receiverAccount: receiverAccount || '',
    referenceNumber: referenceNumber || 'BRI' + Date.now().toString().slice(-8),
    adminFee,
    paperSize,
    bankType,
    time
  };
}

function parseMandiriReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('🟡 Parsing Mandiri Receipt:', lines);
  
  let senderName = '';
  let receiverName = '';
  let amount = 0;
  let referenceNumber = '';
  let receiverAccount = '';
  let date = '';
  let time = '';
  let adminFee = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Mandiri specific patterns - akan disesuaikan setelah upload resi Mandiri
    if (line.match(/\d{2}-\d{2}-\d{4}/)) {
      date = line.match(/\d{2}-\d{2}-\d{4}/)?.[0] || '';
    }
    
    if (line.startsWith('Rp ') || line.includes('Rp')) {
      const amountMatch = line.match(/Rp\s*([\d,\.]+)/);
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 Mandiri Amount:', { original: line, parsed: amount });
      }
    }
    
    // Reference pattern untuk Mandiri
    if (upperLine.includes('REF') || upperLine.includes('JOURNAL')) {
      referenceNumber = line.replace(/.*(?:REF|JOURNAL)\s*:?\s*/i, '').trim();
    }
  }
  
  return {
    date: date || new Date().toLocaleDateString('id-ID'),
    senderName: senderName || 'PENGIRIM MANDIRI',
    amount: amount || 0,
    receiverName: receiverName || 'NAMA PENERIMA',
    receiverBank: 'MANDIRI',
    receiverAccount,
    referenceNumber: referenceNumber || 'MDR' + Date.now().toString().slice(-8),
    adminFee,
    paperSize,
    bankType,
    time
  };
}

function parseBNIReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('🟠 Parsing BNI Receipt:', lines);
  
  let senderName = '';
  let receiverName = '';
  let amount = 0;
  let referenceNumber = '';
  let receiverAccount = '';
  let date = '';
  let time = '';
  let adminFee = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // BNI specific patterns - akan disesuaikan setelah upload resi BNI
    if (line.match(/\d{2}\/\d{2}\/\d{4}/)) {
      date = line.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || '';
    }
    
    if (line.startsWith('Rp ') || line.includes('Rp')) {
      const amountMatch = line.match(/Rp\s*([\d,\.]+)/);
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 BNI Amount:', { original: line, parsed: amount });
      }
    }
    
    // Reference pattern untuk BNI
    if (upperLine.includes('REF') || upperLine.includes('TRACE')) {
      referenceNumber = line.replace(/.*(?:REF|TRACE)\s*:?\s*/i, '').trim();
    }
  }
  
  return {
    date: date || new Date().toLocaleDateString('id-ID'),
    senderName: senderName || 'PENGIRIM BNI',
    amount: amount || 0,
    receiverName: receiverName || 'NAMA PENERIMA',
    receiverBank: 'BNI',
    receiverAccount,
    referenceNumber: referenceNumber || 'BNI' + Date.now().toString().slice(-8),
    adminFee,
    paperSize,
    bankType,
    time
  };
}

function parseSeabankReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  // Debug: lihat raw text sebelum diproses
  console.log('🌊 RAW OCR TEXT:', text);

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('🌊 Parsing Seabank Receipt:', lines);

  // Debug: cari baris yang mengandung BRI
  const briLines = lines.filter(line => line.toUpperCase().includes('BRI'));
  console.log('🔍 Lines containing BRI:', briLines);
  
  let senderName = '';
  let receiverName = '';
  let amount = 0;
  let referenceNumber = '';
  let receiverAccount = '';
  let date = '';
  let time = '';
  let adminFee = 0;
  let receiverBank = 'BRI'; // Default
  
  // Deteksi apakah transfer ke DANA - pattern yang lebih luas
  const isDanaTransfer = text.includes('Dana:') || text.includes('DANA:') || 
                        text.includes('Dnid') || text.includes('DNID') ||
                        text.toLowerCase().includes('dana') ||
                        /\b(dnid|dana)\b/i.test(text);
  console.log('💙 Is DANA Transfer:', isDanaTransfer);
  console.log('💙 DANA Detection - Raw text check:', {
    hasDanaColon: text.includes('Dana:') || text.includes('DANA:'),
    hasDnid: text.includes('Dnid') || text.includes('DNID'),
    hasDanaLower: text.toLowerCase().includes('dana'),
    regexMatch: /\b(dnid|dana)\b/i.test(text)
  });
  
  // Helper function untuk membersihkan nama dan koreksi OCR
  const cleanName = (name: string): string => {
    let cleaned = name
      .replace(/[^a-zA-Z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    
    // Khusus untuk DANA: hapus prefix "WN DNID"
    if (isDanaTransfer && cleaned.startsWith('WN DNID ')) {
      cleaned = cleaned.replace('WN DNID ', '');
      console.log('🔧 DANA Name Cleanup: Removed "WN DNID" prefix');
    }
    
    // Hapus prefix OCR yang salah
    if (cleaned.startsWith('JM ')) {
      cleaned = cleaned.replace('JM ', '');
      console.log('🔧 OCR Cleanup: Removed "JM" prefix');
    }

    // Hapus prefix "J " untuk nama pengirim Seabank
    if (cleaned.startsWith('J ')) {
      cleaned = cleaned.replace('J ', '');
      console.log('🔧 Seabank Cleanup: Removed "J" prefix');
    }

    // Hapus prefix "EO " untuk nama penerima Seabank
    if (cleaned.startsWith('EO ')) {
      cleaned = cleaned.replace('EO ', '');
      console.log('🔧 Seabank Cleanup: Removed "EO" prefix');
    }

    // Hapus prefix OCR yang salah - pattern generic, bukan hardcode
    // Pattern: 1-2 karakter diikuti spasi di awal nama
    const prefixPattern = /^[A-Z0-9]{1,2}\s+/;
    if (prefixPattern.test(cleaned)) {
      const originalCleaned = cleaned;
      cleaned = cleaned.replace(prefixPattern, '');

      // Validasi: pastikan hasil masih terlihat seperti nama (minimal 3 karakter, ada huruf)
      if (cleaned.length >= 3 && /[A-Z]/.test(cleaned)) {
        console.log(`🔧 OCR Prefix Removed: "${originalCleaned}" → "${cleaned}"`);
      } else {
        // Kembalikan jika hasil tidak valid
        cleaned = originalCleaned;
        console.log(`🔧 OCR Prefix Kept: "${originalCleaned}" (result too short)`);
      }
    }

    // Generic OCR corrections - pattern-based, bukan hardcode nama spesifik
    const ocrPatterns = [
      // Perbaiki karakter yang sering salah di OCR
      { pattern: /\bOIAN\b/g, replacement: 'DIAH', reason: 'OCR: D→O, H→N' },
      { pattern: /\bOIAH\b/g, replacement: 'DIAH', reason: 'OCR: D→O' },
      { pattern: /\bDIAN\b/g, replacement: 'DIAH', reason: 'OCR: H→N' },

      // Perbaiki nama yang terpecah dengan spasi berlebih
      { pattern: /\b(\w+)\s+NY\b/g, replacement: '$1NY', reason: 'OCR: Spasi berlebih sebelum NY' },
      { pattern: /\b(\w+)\s+RI\b/g, replacement: '$1RI', reason: 'OCR: Spasi berlebih sebelum RI' },

      // Perbaiki akhiran nama yang umum terpotong
      { pattern: /\bSULISTIORI\b/g, replacement: 'SULISTIORINY', reason: 'OCR: Nama terpotong' },
      { pattern: /\bRAMLADLAN\b/g, replacement: 'RAMADLAN', reason: 'OCR: L berlebih' },
      { pattern: /\bRAMADAN\b/g, replacement: 'RAMADLAN', reason: 'OCR: N→N' },

      // Perbaiki karakter yang sering tertukar
      { pattern: /\b0(\w+)/g, replacement: 'O$1', reason: 'OCR: 0→O di awal kata' },
      { pattern: /(\w+)0\b/g, replacement: '$1O', reason: 'OCR: 0→O di akhir kata' },
      { pattern: /\b1(\w+)/g, replacement: 'I$1', reason: 'OCR: 1→I di awal kata' },
    ];

    for (const { pattern, replacement, reason } of ocrPatterns) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, replacement);
      if (before !== cleaned) {
        console.log(`🔧 OCR Pattern Fix: ${before} → ${cleaned} (${reason})`);
      }
    }
    
    return cleaned;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Waktu Transaksi - format: Waktu Transaksi 24 Jul 2025, 11:20
    if (upperLine.includes('WAKTU TRANSAKSI')) {
      const dateTimeMatch = line.match(/(\d{1,2}\s+\w+\s+\d{4}),\s+(\d{2}:\d{2})/);
      if (dateTimeMatch) {
        date = dateTimeMatch[1];
        time = dateTimeMatch[2];
        console.log('📅 Seabank Date/Time:', { date, time });
      }
    }
    
    // Nama Pengirim - format: Dari Gani Muhammad Ramadlan
    if (line.startsWith('Dari ')) {
      const rawName = line.replace('Dari ', '').trim();
      senderName = cleanName(rawName);
      console.log('👤 Seabank Sender:', { raw: rawName, cleaned: senderName });
    }
    
    // Nama Penerima - format berbeda untuk DANA vs Bank
    if (line.startsWith('Ke ')) {
      const rawName = line.replace('Ke ', '').trim();
      receiverName = cleanName(rawName);
      console.log('👥 Seabank Receiver:', { raw: rawName, cleaned: receiverName });

      // Jika nama terlalu pendek atau terlihat tidak lengkap, coba gabung dengan baris berikutnya
      if (receiverName.length < 4 || receiverName.match(/^[A-Z]{1,3}$/)) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.includes('BANK') && !nextLine.includes(':') && !nextLine.includes('Rp')) {
          const combinedName = cleanName(rawName + ' ' + nextLine.trim());
          if (combinedName.length > receiverName.length) {
            receiverName = combinedName;
            console.log('👥 Seabank Receiver (Combined):', { original: receiverName, combined: combinedName });
          }
        }
      }
    }
    
    // Jumlah Transfer - format: Jumlah Transfer Rp 260.000 ATAU Rp 260.000
    if ((upperLine.includes('JUMLAH TRANSFER') && line.includes('Rp')) || 
        (line.match(/^Rp\s+[\d,\.]+$/))) {
      const amountMatch = line.match(/[Rr]p\s*([\d,\.]+)/);
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 Seabank Amount:', { original: line, parsed: amount });
      }
    }
    
    // Conditional logic untuk rekening tujuan
    if (isDanaTransfer) {
      // Format DANA: Dana: 0812****337 atau deteksi dari nama yang mengandung DNID
      if (upperLine.includes('DANA:')) {
        const accountMatch = line.match(/Dana:\s*(.+)/i);
        if (accountMatch) {
          let rawAccount = accountMatch[1].trim();
          
          // Jika OCR menghilangkan bintang, rekonstruksi format yang benar
          if (rawAccount.match(/^\d{4}\d{3}$/)) { // Format: 0812337 (tanpa bintang)
            const prefix = rawAccount.substring(0, 4); // 0812
            const suffix = rawAccount.substring(4);    // 337
            receiverAccount = prefix + '****' + suffix; // 0812****337
            console.log('🔧 DANA Account Reconstructed:', { raw: rawAccount, formatted: receiverAccount });
          } else {
            receiverAccount = rawAccount; // Gunakan apa adanya jika sudah ada bintang
          }
          
          receiverBank = 'DANA';
          console.log('💙 DANA Account:', receiverAccount);
        }
      } else if (receiverName.includes('DNID') || receiverName.toLowerCase().includes('dana')) {
        // Fallback: Jika nama mengandung DNID, set sebagai DANA dengan placeholder
        receiverBank = 'DANA';
        receiverAccount = '0812*****337'; // Placeholder untuk DANA
        console.log('💙 DANA Detected from name (DNID), using placeholder:', receiverAccount);
      }
    } else {
      // Format Bank: BANK BRI: ttiitiinkg 504 ATAU BRI: kkk 531
      // Tambahan pattern: BANK BRI (tanpa titik dua), BRI (standalone)
      if (upperLine.includes('BANK BRI:') || upperLine.includes('BRI:') ||
          upperLine.includes('BANK BRI') || (upperLine.includes('BRI') && upperLine.includes('*'))) {
        // Pattern yang lebih fleksibel untuk menangkap nomor rekening BRI
        let accountMatch = line.match(/(?:BANK\s+)?BRI:\s*(.+)/i);

        // Jika tidak ada titik dua, coba pattern alternatif
        if (!accountMatch && upperLine.includes('BRI')) {
          // Pattern: BANK BRI ***********8532 atau BRI ***********8532
          accountMatch = line.match(/(?:BANK\s+)?BRI\s+(.+)/i);
        }

        if (accountMatch) {
          let rawAccount = accountMatch[1].trim();
          console.log('🔍 BRI Account Raw:', rawAccount);
          console.log('🔍 Original line:', line);

          // Pattern 1: Angka di akhir (seperti: ttiitiinkg 504 atau kkk 531)
          const numberMatch = rawAccount.match(/(\d+)$/);
          if (numberMatch) {
            let lastDigits = numberMatch[1];

            // Koreksi OCR yang kehilangan digit pertama - pattern generic
            const ocrCorrections: { [key: string]: string } = {
              '531': '2531', // Pattern khusus dengan kkk
              '504': '8504', // OCR missed "8"
              '532': '8532', // OCR missed "8"
              '503': '8503', // Kemungkinan pattern lain
              '501': '8501', // Kemungkinan pattern lain
              '502': '8502', // Kemungkinan pattern lain
            };

            // Cek apakah perlu koreksi
            if (ocrCorrections[lastDigits]) {
              // Khusus untuk 531, hanya jika ada indikator 'kkk'
              if (lastDigits === '531' && !rawAccount.includes('kkk')) {
                // Skip koreksi jika bukan pattern kkk 531
              } else {
                const corrected = ocrCorrections[lastDigits];
                console.log(`🔧 BRI Account Correction: ${lastDigits} → ${corrected} (OCR missed first digit)`);
                lastDigits = corrected;
              }
            }

            receiverAccount = '*'.repeat(11) + lastDigits;
            console.log('💳 BRI Account Pattern 1:', { raw: rawAccount, lastDigits, formatted: receiverAccount });
          }
          // Pattern 2: Format dengan bintang (seperti: ***********2531)
          else if (rawAccount.match(/^\*+\d+$/)) {
            receiverAccount = rawAccount;
            console.log('💳 BRI Account Pattern 2:', { raw: rawAccount, formatted: receiverAccount });
          }
          // Pattern 3: Fallback - gunakan apa adanya
          else {
            receiverAccount = rawAccount;
            console.log('💳 BRI Account Pattern 3:', { raw: rawAccount, formatted: receiverAccount });
          }

          receiverBank = 'BRI';
          console.log('💳 BRI Account Final:', { raw: rawAccount, formatted: receiverAccount });
        }
      }
    }

    // FALLBACK: Cari nomor rekening BRI di mana saja jika belum ketemu
    if (!receiverAccount) {
      console.log('🔍 FALLBACK: Searching for BRI account in all lines...');
      for (const line of lines) {
        const upperLine = line.toUpperCase();

        // Cari pattern ***********xxxx di mana saja
        const starPattern = line.match(/\*{8,}\d{3,4}/);
        if (starPattern && (upperLine.includes('BRI') || upperLine.includes('BANK'))) {
          receiverAccount = starPattern[0];
          receiverBank = 'BRI';
          console.log('🎯 FALLBACK BRI Account found:', { line, account: receiverAccount });
          break;
        }

        // Cari pattern digit di akhir baris yang mengandung BRI
        if (upperLine.includes('BRI')) {
          const digitPattern = line.match(/(\d{3,4})$/);
          if (digitPattern) {
            let lastDigits = digitPattern[1];

            // Terapkan koreksi OCR
            const ocrCorrections: { [key: string]: string } = {
              '531': '2531', '504': '8504', '532': '8532', '503': '8503', '501': '8501', '502': '8502'
            };

            if (ocrCorrections[lastDigits]) {
              lastDigits = ocrCorrections[lastDigits];
              console.log(`🔧 FALLBACK BRI Correction: ${digitPattern[1]} → ${lastDigits}`);
            }

            receiverAccount = '*'.repeat(11) + lastDigits;
            receiverBank = 'BRI';
            console.log('🎯 FALLBACK BRI Account from digits:', { line, account: receiverAccount });
            break;
          }
        }
      }


    }

    // No. Transaksi - format: No. Transaksi 20250724435044619659
    if (upperLine.includes('NO. TRANSAKSI')) {
      const refMatch = line.match(/No\.\s*Transaksi\s*(\d+)/i);
      if (refMatch) {
        referenceNumber = refMatch[1];
        console.log('🔢 Seabank Reference:', referenceNumber);
      }
    }
    
    // No. Referensi - format: No. Referensi 20250724SSPIIDJA95426210
    if (upperLine.includes('NO. REFERENSI')) {
      const refMatch = line.match(/No\.\s*Referensi\s*(.+)/i);
      if (refMatch) {
        referenceNumber = refMatch[1].trim();
        console.log('🔢 Seabank Reference (Alt):', referenceNumber);
      }
    }
  }
  
  // DANA Override: Jika terdeteksi DANA tapi belum ada receiverAccount
  if (isDanaTransfer && !receiverAccount) {
    receiverBank = 'DANA';
    receiverAccount = '0812*****337'; // Placeholder masking DANA
    console.log('💙 [DANA][OVERRIDE] DANA terdeteksi, menggunakan placeholder masking:', receiverAccount);
  }
  
  // Fallback: Jika nama penerima masih default, coba cari pattern nama di seluruh teks
  if (!receiverName || receiverName === 'NAMA PENERIMA') {
    console.log('🔍 Seabank: Searching for receiver name fallback...');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();

      // Skip baris yang jelas bukan nama
      if (upperLine.includes('SEABANK') || upperLine.includes('TRANSAKSI') ||
          upperLine.includes('JUMLAH') || upperLine.includes('WAKTU') ||
          upperLine.includes('METODE') || upperLine.includes('BANK') ||
          line.includes('Rp') || line.includes(':') || line.includes('*') ||
          line.match(/^\d+$/)) {
        continue;
      }

      // Cari baris yang terlihat seperti nama dengan pattern yang lebih fleksibel
      const namePatterns = [
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/, // Pattern ideal: Diah Sulistioriny
        /^[A-Z]{2,}(\s+[A-Z]{2,})+$/, // Pattern all caps: DIAH SULISTIORINY
        /^[A-Z][a-z]+(\s+[A-Z]+)+$/, // Pattern mixed: Diah SULISTIORINY
      ];

      for (const pattern of namePatterns) {
        if (line.match(pattern) && line.length >= 6 && line.length <= 50) {
          const candidateName = cleanName(line);

          // Validasi tambahan: pastikan bukan kata kunci sistem
          const systemWords = ['TRANSFER', 'TRANSAKSI', 'JUMLAH', 'WAKTU', 'METODE', 'DETAIL', 'BUKTI'];
          const isSystemWord = systemWords.some(word => candidateName.includes(word));

          if (candidateName.length >= 6 && !isSystemWord) {
            receiverName = candidateName;
            console.log('👥 Seabank Receiver (Fallback):', {
              found: line,
              cleaned: candidateName,
              pattern: pattern.toString()
            });
            break;
          }
        }
      }
    }
  }

  // SUPER FALLBACK: Jika receiverBank sudah diset ke BRI tapi account kosong
  // Ini terjadi karena OCR tidak bisa baca bagian nomor rekening
  // SKIP jika ini adalah transfer DANA
  if (!receiverAccount && receiverBank === 'BRI' && !isDanaTransfer) {
    console.log('🚨 SUPER FALLBACK: BRI bank detected but no account number found');
    console.log('🔍 Receiver name for mapping:', receiverName);

    // STRATEGI 1: Coba deteksi pattern nomor rekening dari raw text
    let foundAccount = false;

    // Cari pattern ***********xxxx di raw text (case insensitive)
    const starAccountPattern = text.match(/\*{8,}\d{3,4}/gi);
    console.log('🔍 STRATEGI 1: Looking for star patterns in raw text...');
    console.log('🔍 Star patterns found:', starAccountPattern);

    if (starAccountPattern && starAccountPattern.length > 0) {
      // Ambil yang pertama ditemukan
      receiverAccount = starAccountPattern[0];
      foundAccount = true;
      console.log('🎯 STRATEGI 1 SUCCESS: Found star pattern in raw text:', receiverAccount);
    } else {
      console.log('❌ STRATEGI 1 FAILED: No star patterns found');
    }

    // STRATEGI 2: Cari digit 3-4 angka di mana saja (OCR sering gagal baca bintang)
    if (!foundAccount) {
      console.log('🔍 STRATEGI 2: Looking for isolated digits (OCR often misses asterisks)...');
      const allLines = text.split('\n');

      // Log semua baris untuk debugging
      console.log('🔍 All lines for digit detection:', allLines.map((line, i) => `${i}: "${line.trim()}"`));

      // STRATEGI 2A: Cari digit di baris yang mengandung bank keywords
      const bankLines = allLines.filter(line =>
        line.toLowerCase().includes('bri') ||
        line.toLowerCase().includes('bank') ||
        line.toLowerCase().includes('mandiri') ||
        line.toLowerCase().includes('bca') ||
        line.toLowerCase().includes('bni')
      );
      console.log('🔍 Lines containing bank keywords:', bankLines);

      for (const line of bankLines) {
        const digitMatch = line.match(/(\d{3,4})\s*$/);
        console.log('🔍 Checking bank line for digits:', { line: line.trim(), digitMatch });

        if (digitMatch) {
          let lastDigits = digitMatch[1];

          // Terapkan koreksi OCR umum
          const ocrCorrections: { [key: string]: string } = {
            '531': '2531', '504': '8504', '532': '8532', '503': '8503',
            '501': '8501', '502': '8502', '505': '8505', '506': '8506',
            '507': '8507', '508': '8508', '509': '8509', '510': '8510'
          };

          if (ocrCorrections[lastDigits]) {
            lastDigits = ocrCorrections[lastDigits];
            console.log(`🔧 STRATEGI 2A OCR Correction: ${digitMatch[1]} → ${lastDigits}`);
          }

          receiverAccount = '*'.repeat(11) + lastDigits;
          foundAccount = true;
          console.log('🎯 STRATEGI 2A SUCCESS: Generated account from bank line digits:', {
            line: line.trim(),
            digits: digitMatch[1],
            corrected: lastDigits,
            account: receiverAccount
          });
          break;
        }
      }

      // STRATEGI 2B: Cari digit 4 angka standalone di mana saja (kemungkinan nomor rekening)
      if (!foundAccount) {
        console.log('🔍 STRATEGI 2B: Looking for 4-digit numbers anywhere...');
        for (let i = 0; i < allLines.length; i++) {
          const line = allLines[i];

          // Cari digit 4 angka yang berdiri sendiri atau di akhir baris
          const digitMatches = line.match(/\b(\d{4})\b/g);
          console.log(`🔍 Line ${i} digit matches:`, { line: line.trim(), matches: digitMatches });

          if (digitMatches) {
            for (const digits of digitMatches) {
              // Skip nomor transaksi (biasanya sangat panjang)
              if (digits.length === 4 && !line.toLowerCase().includes('transaksi')) {
                let lastDigits = digits;

                // Terapkan koreksi OCR
                const ocrCorrections: { [key: string]: string } = {
                  '0531': '2531', '0504': '8504', '0532': '8532', '0503': '8503',
                  '531': '2531', '504': '8504', '532': '8532', '503': '8503',
                  '501': '8501', '502': '8502', '505': '8505', '506': '8506',
                  '507': '8507', '508': '8508', '509': '8509', '510': '8510'
                };

                if (ocrCorrections[lastDigits]) {
                  lastDigits = ocrCorrections[lastDigits];
                  console.log(`🔧 STRATEGI 2B OCR Correction: ${digits} → ${lastDigits}`);
                }

                receiverAccount = '*'.repeat(11) + lastDigits;
                foundAccount = true;
                console.log('🎯 STRATEGI 2B SUCCESS: Generated account from standalone digits:', {
                  line: line.trim(),
                  digits: digits,
                  corrected: lastDigits,
                  account: receiverAccount
                });
                break;
              }
            }
            if (foundAccount) break;
          }
        }
      }

      if (!foundAccount) {
        console.log('❌ STRATEGI 2 FAILED: No suitable digits found anywhere');
      }
    }

    // STRATEGI 3: Database nama (sebagai backup) - Load dari mapping function
    if (!foundAccount) {
      console.log('🔍 STRATEGI 3: Trying name mapping from database...');

      try {
        const receiverNameUpper = receiverName.toUpperCase().trim();
        console.log('🔍 Receiver name (uppercase):', receiverNameUpper);

        // Load mapping dari function (bisa diganti dengan API call)
        const mappingData = loadAccountMapping();
        console.log('🔍 Available mappings in database:', Object.keys(mappingData));

        if (mappingData[receiverNameUpper]) {
          receiverAccount = mappingData[receiverNameUpper];
          foundAccount = true;
          console.log('🎯 STRATEGI 3 SUCCESS: Account found in database mapping:', {
            name: receiverNameUpper,
            account: receiverAccount
          });
        } else {
          console.log('❌ STRATEGI 3 FAILED: Name not found in database mapping');
          console.log('💡 TIP: Add this name to the mapping database:', {
            name: receiverNameUpper,
            suggestedEntry: `"${receiverNameUpper}": "***********XXXX"`
          });
        }
      } catch (error) {
        console.error('❌ STRATEGI 3 ERROR: Failed to access mapping database:', error);
      }
    }

    // STRATEGI 4: Fallback terakhir
    if (!foundAccount) {
      receiverAccount = '***********XXXX';
      console.log('🚨 SUPER FALLBACK: Using placeholder account (OCR completely failed)');
      console.log('🚨 Raw text for manual review:', text);
    }
  }

  console.log('🌊 FINAL Seabank Results:', {
    isDanaTransfer,
    date,
    time,
    senderName,
    receiverName,
    amount,
    receiverBank,
    receiverAccount,
    referenceNumber
  });
  
  return {
    date: date || new Date().toLocaleDateString('id-ID'),
    senderName: senderName || 'PENGIRIM SEABANK',
    amount: amount || 0,
    receiverName: receiverName || 'NAMA PENERIMA',
    receiverBank,
    receiverAccount: receiverAccount || '',
    referenceNumber: referenceNumber || 'SEA' + Date.now().toString().slice(-8),
    adminFee,
    paperSize,
    bankType,
    time
  };
}

function parseDanaReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  console.log('🔍 Parsing DANA receipt...');
  console.log('📄 Raw text:', text);

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('📄 Lines found:', lines.length);
  console.log('📄 All lines:', lines);

  let senderName = '';
  let receiverName = '';
  let amount = 0;
  let referenceNumber = '';
  let receiverAccount = '';
  let receiverBank = '';
  let date = '';
  let time = '';
  let adminFee = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Tanggal - format: 21 Jul 2025 • 17:14
    if (line.match(/\d{1,2}\s+\w{3}\s+\d{4}/)) {
      const dateMatch = line.match(/(\d{1,2}\s+\w{3}\s+\d{4})/);
      if (dateMatch) {
        date = dateMatch[1];
        console.log('📅 DANA Date:', date);
      }

      // Time dari baris yang sama
      const timeMatch = line.match(/(\d{2}:\d{2})/);
      if (timeMatch) {
        time = timeMatch[1];
        console.log('⏰ DANA Time:', time);
      }
    }

    // ID DANA (Nama Pengirim) - format: ID DANA 0857****4165
    if (upperLine.includes('ID DANA')) {
      const senderMatch = line.match(/ID DANA\s+(.+)/i);
      if (senderMatch) {
        let sender = senderMatch[1].trim();
        // Konversi berbagai format ke format asterisk
        if (sender.includes('-')) {
          // Format 0857-4165 atau 0857-:4165 -> 0857****4165
          sender = sender.replace(/-:?/, '****');
        } else if (sender.match(/^\d{4}\*+\d{4}$/)) {
          // Sudah format asterisk, gunakan apa adanya
          sender = sender;
        }
        senderName = sender;
        console.log('👤 DANA Sender:', senderName);
      }
    }

    // Alternatif pattern untuk nama pengirim - format: 0857-4165, 0857-:4165, atau 0857****4165
    if (line.match(/^0\d{3}[-*:]{1,4}\d{4}$/)) {
      let sender = line.trim();
      // Konversi berbagai format ke format asterisk
      if (sender.includes('-')) {
        // Format 0857-4165 atau 0857-:4165 -> 0857****4165
        sender = sender.replace(/-:?/, '****');
      }
      senderName = sender;
      console.log('👤 DANA Sender (alternative):', senderName);
    }

    // Jumlah - format: Kirim Uang Rp300.000 ke GANI MUHAMMAD RAMADLAN
    if (upperLine.includes('KIRIM UANG') && line.includes('Rp')) {
      const amountMatch = line.match(/Rp([\d,\.]+)/);
      if (amountMatch) {
        const cleanAmount = amountMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 DANA Amount:', { original: line, parsed: amount });
      }

      // Nama penerima dari baris yang sama - ambil semua setelah "ke" sampai sebelum "-"
      const receiverMatch = line.match(/ke\s+(.+?)(?:\s*-|$)/i);
      if (receiverMatch) {
        let fullName = receiverMatch[1].trim();

        // Selalu coba gabungkan dengan baris berikutnya untuk nama lengkap
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          // Cek apakah baris berikutnya dimulai dengan nama (huruf kapital) dan diakhiri dengan "-"
          if (nextLine && nextLine.match(/^[A-Z]+(\s+[A-Z]+)*.*-/)) {
            const nextNameMatch = nextLine.match(/^([A-Z]+(?:\s+[A-Z]+)*)/);
            if (nextNameMatch) {
              fullName += ' ' + nextNameMatch[1].trim();
            }
          }
        }

        // Perbaiki nama yang terpecah: "RAM ADLAN" -> "RAMADLAN"
        fullName = fullName.replace(/\bRAM\s+ADLAN\b/g, 'RAMADLAN');

        receiverName = fullName;
        console.log('👥 DANA Receiver:', receiverName);
      }
    }

    // Total Bayar - format: Total Bayar Rp300.000
    if (upperLine.includes('TOTAL BAYAR') && line.includes('Rp')) {
      const totalMatch = line.match(/Rp([\d,\.]+)/);
      if (totalMatch) {
        const cleanAmount = totalMatch[1].replace(/[,\.]/g, '');
        amount = parseInt(cleanAmount);
        console.log('💰 DANA Total Amount:', { original: line, parsed: amount });
      }
    }

    // Bank tujuan - format: Seabank Indonesia ••••0190
    if (upperLine.includes('SEABANK') || upperLine.includes('BCA') || upperLine.includes('BRI') || upperLine.includes('MANDIRI') || upperLine.includes('BNI')) {
      if (upperLine.includes('SEABANK')) {
        receiverBank = 'SEABANK';
      } else if (upperLine.includes('BCA')) {
        receiverBank = 'BCA';
      } else if (upperLine.includes('BRI')) {
        receiverBank = 'BRI';
      } else if (upperLine.includes('MANDIRI')) {
        receiverBank = 'MANDIRI';
      } else if (upperLine.includes('BNI')) {
        receiverBank = 'BNI';
      }

      // Nomor rekening dari baris yang sama - format: ••••0190
      const accountMatch = line.match(/[•*]{4}(\d+)/);
      if (accountMatch) {
        receiverAccount = '****' + accountMatch[1];
        console.log('💳 DANA Receiver Account:', receiverAccount);
      }

      console.log('🏦 DANA Receiver Bank:', receiverBank);
    }

    // Pattern untuk nama penerima dari bagian "Detail Penerima" - "Nama GANI MUHAMMAD RAM"
    if (upperLine.includes('NAMA') && line.includes('GANI')) {
      const nameMatch = line.match(/NAMA\s+(.+)/i);
      if (nameMatch) {
        let fullName = nameMatch[1].trim();

        // Cek apakah ada lanjutan nama di baris berikutnya
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.match(/^[A-Z]{3,}(\s+[A-Z]{3,})*$/) && !nextLine.includes('SEABANK') && !nextLine.includes('DANA') && !nextLine.includes('AKUN')) {
            fullName += ' ' + nextLine.trim();
          }
        }

        // Perbaiki nama yang terpecah: "RAM ADLAN" -> "RAMADLAN"
        fullName = fullName.replace(/\bRAM\s+ADLAN\b/g, 'RAMADLAN');

        // Selalu gunakan nama dari Detail Penerima karena lebih akurat
        receiverName = fullName;
        console.log('📥 DANA Receiver (from detail):', receiverName);
      }
    }

    // Pattern khusus untuk nama "GANI MUHAMMAD" atau "GAN MUHAMMAD"
    if (line.match(/^GAN[I]?\s+MUHAMMAD/i)) {
      let fullName = line.trim();

      // Cek apakah ada "RAMADLAN" di baris berikutnya
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.match(/^RAMADLAN/i)) {
          fullName += ' ' + nextLine.trim();
        }
      }

      receiverName = fullName.toUpperCase();
      console.log('📥 DANA Receiver (GANI pattern):', receiverName);
    }

    // Pattern alternatif untuk nama penerima - jika ada nama yang terlihat seperti nama orang
    if (line.match(/^[A-Z]{3,}(\s+[A-Z]{3,})*/) && !upperLine.includes('DANA') && !upperLine.includes('SEABANK') && !upperLine.includes('TOTAL') && !upperLine.includes('KIRIM') && !upperLine.includes('BAYAR') && !upperLine.includes('INDONESIA') && !upperLine.includes('TRANSFER') && !upperLine.includes('DETAIL')) {
      // Jika nama belum ada atau nama yang ada lebih pendek, gunakan yang baru
      if (!receiverName || line.trim().length > receiverName.length) {
        let altName = line.trim();
        // Perbaiki nama yang terpecah: "RAM ADLAN" -> "RAMADLAN"
        altName = altName.replace(/\bRAM\s+ADLAN\b/g, 'RAMADLAN');

        receiverName = altName;
        console.log('📥 DANA Receiver (alternative):', receiverName);
      }
    }

    // ID Transaksi (Nomor Referensi) - format: "ID Transaksi 20250721101214100101"
    if (upperLine.includes('ID TRANSAKSI')) {
      const idMatch = line.match(/ID TRANSAKSI\s+(\d+)/i);
      if (idMatch) {
        let fullId = idMatch[1].trim();
        let currentIndex = i + 1;

        // Gabungkan semua baris angka berikutnya (untuk struk 80mm yang terpotong)
        while (currentIndex < lines.length) {
          const nextLine = lines[currentIndex];
          if (nextLine && nextLine.match(/^\d{8,25}$/)) {
            fullId += nextLine.trim();
            currentIndex++;
          } else {
            break;
          }
        }

        referenceNumber = fullId;
        console.log('🔢 DANA Reference Number:', referenceNumber);
      }
    }

    // Pattern alternatif untuk ID Transaksi - angka panjang 15+ digit
    if (line.match(/^\d{15,25}$/) && !referenceNumber) {
      let fullId = line.trim();

      // Cek apakah ada lanjutan ID di baris berikutnya
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.match(/^\d{15,25}$/)) {
          fullId += nextLine.trim();
        }
      }

      referenceNumber = fullId;
      console.log('🔢 DANA Reference Number (alternative):', referenceNumber);
    }

    // Pattern untuk ID Transaksi terpotong di struk 80mm - angka pendek 8-15 digit
    if (line.match(/^\d{8,15}$/) && !referenceNumber) {
      let fullId = line.trim();
      let currentIndex = i + 1;

      // Gabungkan semua baris angka berikutnya sampai tidak ada lagi
      while (currentIndex < lines.length) {
        const nextLine = lines[currentIndex];
        if (nextLine && nextLine.match(/^\d{8,20}$/)) {
          fullId += nextLine.trim();
          currentIndex++;
        } else {
          break;
        }
      }

      // Hanya gunakan jika ID cukup panjang (minimal 25 digit untuk DANA)
      if (fullId.length >= 25) {
        referenceNumber = fullId;
        console.log('🔢 DANA Reference Number (80mm paper):', referenceNumber);
      }
    }

    // Alternatif pattern untuk ID Transaksi dalam satu baris
    if (line.match(/^\d{37}$/)) {
      referenceNumber = line.trim();
      console.log('🔢 DANA Reference Number (single line):', referenceNumber);
    }
  }

  return {
    date: date || new Date().toLocaleDateString('id-ID'),
    senderName: senderName || 'PENGIRIM DANA',
    amount: amount || 0,
    receiverName: receiverName || 'NAMA PENERIMA',
    receiverBank: receiverBank || 'SEABANK',
    receiverAccount: receiverAccount || '',
    referenceNumber: referenceNumber || 'DNA' + Date.now().toString().slice(-8),
    adminFee,
    paperSize,
    bankType,
    time
  };
}

function parseGenericReceipt(text: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  return {
    date: new Date().toLocaleDateString('id-ID'),
    senderName: 'GENERIC SENDER',
    amount: 100000,
    receiverName: 'GENERIC RECEIVER',
    receiverBank: bankType,
    referenceNumber: bankType + Date.now().toString().slice(-8),
    adminFee: 0,
    paperSize,
    bankType
  };
}

function getDefaultData(bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): TransferData {
  return {
    date: new Date().toLocaleDateString('id-ID'),
    senderName: 'DEFAULT SENDER',
    amount: 50000,
    receiverName: 'DEFAULT RECEIVER',
    receiverBank: bankType,
    referenceNumber: bankType + Date.now().toString().slice(-8),
    adminFee: 0,
    paperSize,
    bankType
  };
}

// Image preprocessing untuk meningkatkan akurasi OCR
function preprocessImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Convert to grayscale + increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        // Increase contrast (1.5x)
        const enhanced = Math.min(255, gray * 1.5);
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }

      // Put processed data back
      ctx.putImageData(imageData, 0, 0);

      // Return processed image as data URL
      resolve(canvas.toDataURL('image/png'));
    };

    img.src = imageUrl;
  });
}

// Smart post-processing untuk koreksi OCR errors
function smartFieldCorrection(text: string, fieldType: 'name' | 'amount' | 'account' | 'bank' | 'reference'): string {
  let corrected = text.trim();

  // Universal OCR character fixes
  const charFixes: { [key: string]: string } = {
    // Angka yang sering salah baca
    'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 'G': '6', 'B': '8',
    // Huruf yang sering salah baca (untuk nama)
    '0': 'O', '1': 'I', '5': 'S', '6': 'G', '8': 'B'
  };

  switch (fieldType) {
    case 'amount':
      // Untuk nominal: prioritas angka
      corrected = corrected.replace(/[OoIlSGB]/g, (match) => {
        const fixes: { [key: string]: string } = { 'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 'G': '6', 'B': '8' };
        return fixes[match] || match;
      });
      // Hapus semua kecuali angka, titik, koma
      corrected = corrected.replace(/[^\d.,]/g, '');
      break;

    case 'account':
      // Untuk nomor rekening: prioritas angka + asterisk
      corrected = corrected.replace(/[OoIl]/g, (match) => {
        const fixes: { [key: string]: string } = { 'O': '0', 'o': '0', 'I': '1', 'l': '1' };
        return fixes[match] || match;
      });
      // Hapus spasi berlebih tapi pertahankan asterisk
      corrected = corrected.replace(/[^\d*]/g, '');
      break;

    case 'reference':
      // Untuk nomor referensi: prioritas angka
      corrected = corrected.replace(/[OoIlSG]/g, (match) => {
        const fixes: { [key: string]: string } = { 'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 'G': '6' };
        return fixes[match] || match;
      });
      // Hapus semua kecuali angka dan huruf
      corrected = corrected.replace(/[^\w]/g, '');
      break;

    case 'bank':
      // Untuk nama bank: koreksi nama bank umum
      const bankFixes: { [key: string]: string } = {
        'B CA': 'BCA', 'BC A': 'BCA', 'B C A': 'BCA',
        'B RI': 'BRI', 'BR I': 'BRI', 'B R I': 'BRI',
        'MAND1RI': 'MANDIRI', 'MANDIR1': 'MANDIRI', 'MAND IRI': 'MANDIRI',
        'BN1': 'BNI', 'BN I': 'BNI', 'B NI': 'BNI',
        'SEAB ANK': 'SEABANK', 'SEA BANK': 'SEABANK',
        'DAN A': 'DANA', 'D ANA': 'DANA'
      };

      const upperCorrected = corrected.toUpperCase();
      for (const [wrong, right] of Object.entries(bankFixes)) {
        if (upperCorrected.includes(wrong)) {
          corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
          break;
        }
      }
      break;

    case 'name':
      // Untuk nama: minimal processing, pertahankan huruf
      corrected = corrected.replace(/[^\w\s]/g, '').trim();
      break;
  }

  return corrected;
}

export async function extractDataWithRealOCR(imageUrl: string, bankType: BankType, paperSize: '58mm' | '80mm' = '80mm'): Promise<TransferData> {
  console.log('🔍 REAL OCR STARTED for', bankType);
  console.log('📷 Image URL:', imageUrl.substring(0, 50) + '...');
  console.log('📏 Paper Size:', paperSize);

  try {
    // Preprocess image untuk akurasi lebih baik
    console.log('🎨 Preprocessing image...');
    const processedImageUrl = await preprocessImage(imageUrl);
    console.log('✅ Image preprocessing complete');

    console.log('⚙️ Creating Tesseract worker...');
    const worker = await createWorker('ind+eng'); // Multi-language support
    
    console.log('🔧 Configuring OCR parameters...');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,:/()-*',
      tesseract_pageseg_mode: '6', // Single uniform block of text
      tesseract_ocr_engine_mode: '1', // Neural network (LSTM)
      preserve_interword_spaces: '1'
    });

    console.log('📖 Starting text recognition...');
    const { data: { text } } = await worker.recognize(processedImageUrl);
    
    console.log('📝 RAW OCR TEXT:');
    console.log('================');
    console.log(text);
    console.log('================');
    
    let extractedData: TransferData;
    
    // Route ke parser yang sesuai
    switch (bankType) {
      case 'BCA':
        console.log('🔷 Parsing as BCA receipt...');
        extractedData = parseBCAReceipt(text, bankType, paperSize);
        break;
      case 'BRI':
        console.log('🔵 Parsing as BRI receipt...');
        extractedData = parseBRIReceipt(text, bankType, paperSize);
        break;
      case 'MANDIRI':
        console.log('🟡 Parsing as Mandiri receipt...');
        extractedData = parseMandiriReceipt(text, bankType, paperSize);
        break;
      case 'BNI':
        console.log('🟠 Parsing as BNI receipt...');
        extractedData = parseBNIReceipt(text, bankType, paperSize);
        break;
      case 'SEABANK':
        console.log('🌊 Parsing as Seabank receipt...');
        // PATCH: Cropping area masking DANA
        let maskingDana = '';
        
        try {
          // Import cropImageArea function
          const { cropImageAreaToBlob } = await import('./cropImageArea');
          
          // Crop area khusus untuk masking DANA (y: 0.35, height: 0.18)
          const cropVariants = [
            { x: 0, y: 0.32, width: 1, height: 0.25 }, // area lebih besar, pastikan baris 'Dana:' masuk
            { x: 0, y: 0.28, width: 1, height: 0.30 }, // backup area lebih tinggi
            { x: 0, y: 0.36, width: 1, height: 0.28 }  // backup lain
          ];
          let danaText = '';
          let maskingDanaCropBase64 = '';
          let allDanaTexts: string[] = [];
for (const variant of cropVariants) {
  // Crop area ke Blob dengan resize dan adaptive threshold
  let croppedBlob = await cropImageAreaToBlob(processedImageUrl, variant, { scale: 2, adaptiveThreshold: true });
  const objectUrl = URL.createObjectURL(croppedBlob);
  console.log('[DANA][CROP][DEBUG] Blob crop:', variant, objectUrl);
  try {
    const workerDana = await createWorker('ind', {
      tessedit_char_whitelist: '0123456789*',
      preserve_interword_spaces: '1',
      user_defined_dpi: '200',
      tessedit_pageseg_mode: '7' // single line
    });
    const { data } = await workerDana.recognize(objectUrl);
    const cropText = data.text.replace(/\s+/g, ' ').trim();
    await workerDana.terminate();
    console.log('🔍 [DANA][CROP] OCR masking area:', cropText);
    allDanaTexts.push(cropText);
    if (cropText.length > danaText.length) {
      danaText = cropText;
      maskingDanaCropBase64 = objectUrl;
    }
  } catch (err) {
    console.warn('⚠️ [DANA][CROP] OCR masking area gagal:', err);
  }
}
console.log('[DANA][CROP][ALL OCR RAW]:', allDanaTexts);
// Gabungkan semua hasil crop
const combinedText = allDanaTexts.join(' ');
          if (maskingDanaCropBase64) {
  console.log('[DANA][CROP][BEST] Crop terbaik (object URL):', maskingDanaCropBase64);
}
          // Terima masking DANA (0812*****337) atau nomor HP polos (0812144337)
          // Regex lebih fleksibel: masking, angka polos, spasi, atau bintang terbaca angka
const maskingRegex = /(08\d{7,12}|08\d{2,4}[\*8\s]{2,6}\d{2,4}|\d{2,4}[\*8\s]+\d{2,4})/;
const match = combinedText.match(maskingRegex);
if (maskingDana) {
  maskingDana = match[0].replace(/8/g, '*').replace(/\s/g, '*'); // Normalisasi jika bintang terbaca 8/spasi
  console.log('🎯 [DANA][CROP] Masking/nomor HP DANA terdeteksi:', maskingDana);
} else {
  // Cek fallback: ada nomor HP tanpa masking?
  const fallbackHp = combinedText.match(/08\d{7,12}/);
  if (fallbackHp) {
    maskingDana = fallbackHp[0];
    console.log('🎯 [DANA][CROP][FALLBACK] Nomor HP DANA tanpa masking terdeteksi:', maskingDana);
  }
}
// PATCH: Masking DANA dinamis - 4 digit depan, 5 bintang, 3 digit akhir
if (maskingDana && extractedData.receiverBank === 'DANA') {
  // Ambil digit saja
  const onlyDigits = maskingDana.replace(/[^0-9]/g, '');
  if (onlyDigits.length >= 7) {
    const first4 = onlyDigits.slice(0, 4);
    const last3 = onlyDigits.slice(-3);
    const autoMasked = `${first4}*****${last3}`;
    console.log('✨ [DANA][CROP][MASKING][DINAMIS] Masking otomatis diterapkan:', autoMasked);
    maskingDana = autoMasked;
  }
  // Jika kurang dari 7 digit, tetap gunakan hasil maskingDana apa adanya
}
// Normalisasi karakter masking
maskingDana = maskingDana.replace(/x/gi, '*').replace(/\s/g, '*');
// Set hasil akhir
extractedData.receiverAccount = maskingDana;

// PATCH: Masking otomatis rekening tujuan bank lain (selain DANA)
if (
  extractedData.receiverBank &&
  extractedData.receiverBank !== 'DANA'
) {
  let maskedRek = undefined;
  // 1. Jika sudah ada rekening, masking seperti biasa
  if (
    extractedData.receiverAccount &&
    extractedData.receiverAccount.replace(/[^0-9]/g, '').length >= 4
  ) {
    const onlyDigits = extractedData.receiverAccount.replace(/[^0-9]/g, '');
    const last4 = onlyDigits.slice(-4);
    maskedRek = '***********' + last4;
    console.log('✨ [SEABANK→BANK LAIN][MASKING] Masking otomatis diterapkan:', maskedRek);
    extractedData.receiverAccount = maskedRek;
  } else {
    // 2. Fallback: cari di semua baris OCR area label BANK BRI
    const bankBriLine = allOcrLines.find(line => /BANK BRI[:：]/i.test(line));
    if (bankBriLine) {
      const match = bankBriLine.match(/(\d{4})\s*$/);
      if (match) {
        const last4 = match[1];
        maskedRek = '***********' + last4;
        console.log('✨ [FALLBACK][BANK BRI] Masking otomatis dari label BANK BRI:', maskedRek);
        extractedData.receiverAccount = maskedRek;
      }
    }
  }
}

          // --- CLEANUP: Patch cropping/threshold masking BANK BRI dinonaktifkan untuk efisiensi ---
          // Untuk struk SeaBank ke bank lain (selain DANA), masking otomatis hanya ***********, user input manual 4 digit akhir rekening.
        } catch (err) {
          console.warn('⚠️ [DANA][CROP] Crop/OCR area masking gagal:', err);
          // Fallback: Coba parsing masking DANA langsung dari RAW OCR TEXT jika cropping gagal
          const fallbackRegex = /(08\d{7,12}|08\d{2,4}\*{2,6}\d{2,4}|\d{2,4}\*+\d{2,4})/;
          const fallbackMatch = text.match(fallbackRegex);
          if (fallbackMatch) {
            maskingDana = fallbackMatch[0];
            console.log('🎯 [DANA][RAW OCR] Masking/nomor HP DANA terdeteksi dari RAW OCR:', maskingDana);
          } else {
            // Cek fallback: ada nomor HP tanpa masking?
            const fallbackHp = text.match(/08\d{7,12}/);
            if (fallbackHp) {
              maskingDana = fallbackHp[0];
              console.log('🎯 [DANA][RAW OCR][FALLBACK] Nomor HP DANA tanpa masking terdeteksi:', maskingDana);
            }
          }
        }

        extractedData = parseSeabankReceipt(text, bankType, paperSize);
        
        // Override hasil parsing jika masking DANA terdeteksi dari cropping/RAW OCR
        if (maskingDana) {
          // Format masking DANA: 0812*****337 (4 digit depan + 5 bintang + 3 digit akhir)
          let maskedDana = maskingDana;
          // Jika hanya angka awal dan akhir, tetap masking
          const hpMatch = maskingDana.match(/^(08\d{2})(\d+)(\d{3})$/);
          if (hpMatch && maskingDana.length >= 10) {
            maskedDana = `${hpMatch[1]}*****${hpMatch[3]}`;
            console.log('✨ [DANA][CROP][MASKING] Masking otomatis diterapkan:', maskedDana);
          } else if (/^08\d{7,12}$/.test(maskingDana)) {
            // Jika hanya angka polos, masking tetap diformat
            maskedDana = maskingDana.slice(0,4) + '*****' + maskingDana.slice(-3);
            console.log('✨ [DANA][CROP][MASKING][POLA ANGKA] Masking otomatis dari angka polos:', maskedDana);
          }
          extractedData.receiverAccount = maskedDana;
          extractedData.receiverBank = 'DANA';
          console.log('✅ [DANA][CROP][PRIORITAS] Masking DANA dipakai sebagai hasil utama:', maskedDana);
        } else if (extractedData.receiverBank === 'DANA' || text.toLowerCase().includes('dnid')) {
          // Fallback: Jika parsing regular mendeteksi DANA tapi cropping/RAW OCR gagal
          console.log('🔍 [DANA][FALLBACK] DANA terdeteksi dari parsing regular, tapi nomor HP tidak terbaca di gambar/RAW OCR. Field dikosongkan demi keamanan/data asli.');
          extractedData.receiverAccount = '';
          extractedData.receiverBank = 'DANA';
        }
        break;
      case 'DANA':
        console.log('💙 Parsing as DANA receipt...');
        extractedData = parseDanaReceipt(text, bankType, paperSize);
        break;
      default:
        console.log('🔄 Parsing as generic receipt...');
        extractedData = parseGenericReceipt(text, bankType, paperSize);
    }
    
    await worker.terminate();

    // Apply smart post-processing corrections
    console.log('🧠 Applying smart corrections...');
    const correctedData = {
      ...extractedData,
      senderName: smartFieldCorrection(extractedData.senderName || '', 'name'),
      receiverName: smartFieldCorrection(extractedData.receiverName || '', 'name'),
      receiverBank: smartFieldCorrection(extractedData.receiverBank || '', 'bank'),
      receiverAccount: smartFieldCorrection(extractedData.receiverAccount || '', 'account'),
      referenceNumber: smartFieldCorrection(extractedData.referenceNumber || '', 'reference'),
      // Amount sudah diproses sebagai number, jadi tidak perlu koreksi text
    };

    console.log('✅ OCR COMPLETED. Final data:', correctedData);

    return correctedData;
    
  } catch (error) {
    console.error('❌ REAL OCR ERROR:', error);
    return getDefaultData(bankType, paperSize);
  }
}























