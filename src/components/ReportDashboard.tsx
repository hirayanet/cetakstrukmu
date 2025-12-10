import React from 'react';
import { X, Printer, Download, Share2, FileText, Users } from 'lucide-react';
import { useGlobalStats, useDailyStats, useOnlineCount } from '../utils/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportDashboardProps {
    onClose: () => void;
}

export default function ReportDashboard({ onClose }: ReportDashboardProps) {
    const stats = useGlobalStats();
    const dailyStats = useDailyStats();
    const onlineCount = useOnlineCount();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Laporan Aktivitas</h2>
                        <p className="text-sm text-gray-500">Real-time monitoring penggunaan aplikasi</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-blue-600 font-medium">Total Struk</span>
                                <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-3xl font-bold text-blue-900">{stats.total_generated}</p>
                            <p className="text-xs text-blue-600 mt-1">Struk berhasil dibuat</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-green-600 font-medium">User Online</span>
                                <Users className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-3xl font-bold text-green-900">{onlineCount}</p>
                            <p className="text-xs text-green-600 mt-1">Sedang aktif sekarang</p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-purple-600 font-medium">Cetak Thermal</span>
                                <Printer className="w-5 h-5 text-purple-500" />
                            </div>
                            <p className="text-3xl font-bold text-purple-900">{stats.total_printed}</p>
                            <p className="text-xs text-purple-600 mt-1">Klik tombol cetak</p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-orange-600 font-medium">Share WA</span>
                                <Share2 className="w-5 h-5 text-orange-500" />
                            </div>
                            <p className="text-3xl font-bold text-orange-900">{stats.total_whatsapp}</p>
                            <p className="text-xs text-orange-600 mt-1">Klik tombol share</p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Daily Trend Chart */}
                        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Tren Harian (7 Hari Terakhir)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyStats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => {
                                                const d = new Date(date);
                                                return `${d.getDate()}/${d.getMonth() + 1}`;
                                            }}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            formatter={(value: number) => [`${value} Struk`, 'Jumlah']}
                                            labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        />
                                        <Bar dataKey="receipts" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Struk Dibuat" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Action Breakdown */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Metode Favorit</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="flex items-center text-gray-600"><Printer className="w-4 h-4 mr-2" /> Cetak Thermal</span>
                                        <span className="font-bold">{stats.total_printed}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-purple-500 h-2 rounded-full"
                                            style={{ width: `${(stats.total_printed / (stats.total_generated || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="flex items-center text-gray-600"><Download className="w-4 h-4 mr-2" /> Simpan PDF</span>
                                        <span className="font-bold">{stats.total_pdf}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${(stats.total_pdf / (stats.total_generated || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="flex items-center text-gray-600"><Share2 className="w-4 h-4 mr-2" /> WhatsApp</span>
                                        <span className="font-bold">{stats.total_whatsapp}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-orange-500 h-2 rounded-full"
                                            style={{ width: `${(stats.total_whatsapp / (stats.total_generated || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
                                <p>Data ini diupdate secara real-time dari semua pengguna yang sedang aktif menggunakan aplikasi.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
