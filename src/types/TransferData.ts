export type BankType = 'BCA' | 'BRI' | 'MANDIRI' | 'BNI' | 'SEABANK' | 'DANA' | 'BSI' | 'FLIP';

export interface TransferData {
  date: string;
  senderName: string;
  amount: number;
  receiverName: string;
  receiverBank: string;
  referenceNumber: string;
  adminFee: number;
  paperSize: '58mm' | '80mm';
  bankType: BankType;
  receiverAccount?: string;
  time?: string;
}
