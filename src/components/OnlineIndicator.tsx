import React from 'react';
import { useOnlineCount } from '../utils/firebase';

export default function OnlineIndicator() {
    const onlineCount = useOnlineCount();

    return (
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-700">
                {onlineCount} User Online
            </span>
        </div>
    );
}
