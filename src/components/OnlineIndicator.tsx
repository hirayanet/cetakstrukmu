import React, { useEffect, useState } from 'react';
import { useOnlineCount } from '../utils/firebase';

export default function OnlineIndicator() {
    const onlineCount = useOnlineCount();
    const [highlight, setHighlight] = useState(false);

    // Efek kedip saat angka berubah
    useEffect(() => {
        setHighlight(true);
        const timer = setTimeout(() => setHighlight(false), 1000);
        return () => clearTimeout(timer);
    }, [onlineCount]);

    return (
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-500 ${highlight ? 'bg-green-200 border-green-300 scale-105' : 'bg-green-50 border-green-100'
            }`}>
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className={`text-xs font-medium transition-colors duration-300 ${highlight ? 'text-green-800 font-bold' : 'text-green-700'
                }`}>
                {onlineCount} User Online
            </span>
        </div>
    );
}
