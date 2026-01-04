"use client";

export default function ParcelTimeline({ actualizations }) {
    // Safety check: ensure actualizations is a valid array
    const history = Array.isArray(actualizations) ? actualizations : [];

    if (history.length === 0) {
        return (
            <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-500 text-sm italic">
                    No tracking updates available yet.
                </p>
            </div>
        );
    }

    // Helper for consistent date formatting
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return "Invalid Date";
        }
    };

    // Helper for status styling
    const getStatusStyle = (status) => {
        const lowerStatus = (status || "").toLowerCase();
        
        if (lowerStatus.includes('delivered') || lowerStatus.includes('picked up')) return "bg-green-100 text-green-700 border-green-200";
        if (lowerStatus.includes('transit')) return "bg-blue-100 text-blue-700 border-blue-200";
        if (lowerStatus.includes('warehouse')) return "bg-indigo-50 text-indigo-700 border-indigo-200";
        if (lowerStatus.includes('stash') || lowerStatus.includes('ready')) return "bg-yellow-50 text-yellow-700 border-yellow-200";
        
        return "bg-gray-100 text-gray-600 border-gray-200";
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                    Tracking Events
                </h3>
            </div>
            
            <div className="p-6">
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                    {history.map((a, index) => {
                        const isLatest = index === 0;
                        
                        return (
                            <div key={a.id || index} className="relative pl-8">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 
                                    ${isLatest ? 'bg-blue-600 border-blue-100 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' : 'bg-gray-300 border-white'}
                                `}></div>

                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                    <div>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase mb-1 border ${getStatusStyle(a.status)}`}>
                                            {a.status_display || a.status}
                                        </span>
                                        
                                        <div className="text-sm text-gray-600 space-y-0.5">
                                            {a.warehouse_name && (
                                                <p className="flex items-center gap-1">
                                                    <span className="text-gray-400">🏢</span> 
                                                    {a.warehouse_name}
                                                </p>
                                            )}
                                            {a.warehouse_city && (
                                                <p className="flex items-center gap-1">
                                                    <span className="text-gray-400">📍</span> 
                                                    {a.warehouse_city}
                                                </p>
                                            )}
                                            {a.courier_name && (
                                                <p className="flex items-center gap-1">
                                                    <span className="text-gray-400">🚚</span> 
                                                    Courier: {a.courier_name}
                                                </p>
                                            )}
                                            {/* Fallback if detailed info is missing but we have status */}
                                            {!a.warehouse_name && !a.courier_name && a.status === 'created' && (
                                                <p className="text-gray-400 italic">Package created</p>
                                            )}
                                        </div>
                                    </div>

                                    <time className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded whitespace-nowrap mt-2 sm:mt-0">
                                        {formatDate(a.created_at)}
                                    </time>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}