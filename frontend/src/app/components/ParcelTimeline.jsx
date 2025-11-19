"use client";

export default function ParcelTimeline({ actualizations = [] }) {
    if (!actualizations.length) {
        return (
            <p className="text-gray-500 text-sm">
                No updates yet for this parcel.
            </p>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Parcel Timeline
            </h3>

            <div className="relative border-l-2 border-blue-300 pl-6 space-y-6">
                {actualizations.map((a, index) => (
                    <div key={a.id} className="relative">
                        {/* Dot */}
                        <div className="w-3 h-3 bg-blue-500 rounded-full absolute -left-[9px] top-1.5 shadow" />

                        <div className="flex flex-col ml-5">
                            <p className="font-medium text-blue-700">
                                {a.status_display}
                            </p>

                            {a.warehouse_city && (
                                <p className="text-sm text-gray-600">
                                    📍 {a.warehouse_city}
                                </p>
                            )}

                            {a.courier_name && (
                                <p className="text-sm text-gray-600">
                                    🚚 Courier: {a.courier_name}
                                </p>
                            )}

                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(a.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
