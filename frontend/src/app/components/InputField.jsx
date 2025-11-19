"use client"

// Reusable styled input field with icons
export default function InputField({ label, name, value, onChange, icon }) {
    return (
        <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">{label}</label>

            <div className="flex items-center gap-2 border border-gray-300 bg-white rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-400 transition">
                {icon}
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full outline-none"
                />
            </div>
        </div>
    );
}
