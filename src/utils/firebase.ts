import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, onDisconnect, set, push, runTransaction, remove } from 'firebase/database';
import { useEffect, useState } from 'react';

// KONFIGURASI FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyD-AIzaSyCZcGKXV7v7pJmQvMmauTRg8KQBJD_e6G0",
    authDomain: "cetakstrukmu.firebaseapp.com",
    databaseURL: "https://cetakstrukmu-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cetakstrukmu",
    storageBucket: "cetakstrukmu.firebasestorage.app",
    messagingSenderId: "967230293788",
    appId: "1:967230293788:web:882163bdd07ad938a05cd9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// HOOK: Register Presence (Panggil sekali saja di App.tsx)
export function usePresenceRegistration() {
    useEffect(() => {
        const connectedRef = ref(database, '.info/connected');
        const onlineUsersRef = ref(database, 'status/online_users');
        let myUserRef: any;

        const unsubscribe = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // Kita terkoneksi!
                myUserRef = push(onlineUsersRef);

                // Saat putus koneksi (tab tutup/internet mati), hapus data
                onDisconnect(myUserRef).remove();

                // Set status online
                set(myUserRef, true);
            }
        });

        return () => {
            unsubscribe();
            // Bersihkan saat component unmount
            if (myUserRef) {
                remove(myUserRef);
            }
        };
    }, []);
}

// HOOK: Baca Jumlah Online User (Read-Only)
export function useOnlineCount() {
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        const onlineUsersRef = ref(database, 'status/online_users');
        const unsubscribe = onValue(onlineUsersRef, (snap) => {
            if (snap.exists()) {
                setOnlineCount(Object.keys(snap.val()).length);
            } else {
                setOnlineCount(0);
            }
        });

        return () => unsubscribe();
    }, []);

    return onlineCount;
}

// HOOK: Melacak Statistik Global
export function useGlobalStats() {
    const [stats, setStats] = useState({
        total_generated: 0,
        total_printed: 0,
        total_pdf: 0,
        total_whatsapp: 0
    });

    useEffect(() => {
        const statsRef = ref(database, 'stats/global');
        const unsubscribe = onValue(statsRef, (snap) => {
            if (snap.exists()) {
                setStats(snap.val());
            }
        });

        return () => unsubscribe();
    }, []);

    return stats;
}

// HOOK: Melacak Statistik Harian (7 Hari Terakhir)
export function useDailyStats() {
    const [dailyStats, setDailyStats] = useState<{ date: string; receipts: number }[]>([]);

    useEffect(() => {
        const dailyRef = ref(database, 'stats/daily');
        const unsubscribe = onValue(dailyRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                // Convert object to array and sort by date
                const formattedData = Object.keys(data)
                    .map(date => ({
                        date,
                        receipts: data[date].receipts || 0
                    }))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(-7); // Ambil 7 hari terakhir

                setDailyStats(formattedData);
            }
        });

        return () => unsubscribe();
    }, []);

    return dailyStats;
}

// FUNGSI: Update Statistik
export const incrementStat = (type: 'generated' | 'printed' | 'pdf' | 'whatsapp') => {
    const globalRef = ref(database, `stats/global/total_${type}`);

    // Update Global
    runTransaction(globalRef, (currentValue) => {
        return (currentValue || 0) + 1;
    });

    // Update Harian (hanya untuk 'generated')
    if (type === 'generated') {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyRef = ref(database, `stats/daily/${today}/receipts`);
        runTransaction(dailyRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });
    }
};

// FUNGSI: Log Visitor Harian
export const logVisitor = () => {
    const today = new Date().toISOString().split('T')[0];
    const sessionKey = `visitor_logged_${today}`;

    if (!sessionStorage.getItem(sessionKey)) {
        const dailyRef = ref(database, `stats/daily/${today}/visitors`);
        runTransaction(dailyRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });
        sessionStorage.setItem(sessionKey, 'true');
    }
};
