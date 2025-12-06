"use client";

import { useState } from "react";
import AddressDisplay from "@/app/components/AddressDisplay"; // Import AddressDisplay

export default function PostmatRow({ postmat, stashes, onEditPostmat, onDeletePostmat, onEditStash, onDeleteStash }) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to format status/size text nicely
  const formatText = (text) => text ? text.replace(/_/g, " ").toUpperCase() : "UNKNOWN";

  // Helper for status colors (aligned with warehouse style borders)
  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border border-green-200";
      case "inactive": return "bg-red-100 text-red-800 border border-red-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  return (
    <>
      {/* Main Postmat Row */}
      <tr
        // Updated hover style to match warehouse rows
        className={`cursor-pointer transition-colors ${isOpen ? "bg-blue-50/50" : "hover:bg-blue-50/50"}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            {/* Updated chevron color to match styling tone */}
            <span className={`text-blue-600 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
              ▶
            </span>
            {/* Bolder font for name */}
            <span className="font-bold text-gray-900">{postmat.name}</span>
          </div>
        </td>
        
        {/* Darker text for warehouse */}
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
          {postmat.warehouse?.name || postmat.warehouse?.city || "Unknown Warehouse"}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(postmat.status)}`}>
            {postmat.display_status || formatText(postmat.status)}
          </span>
        </td>
        
        {/* Replaced Coords with AddressDisplay */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          <div className="flex flex-col">
            {postmat.latitude.toFixed(4)}, {postmat.longitude.toFixed(4)}
            {postmat.postal_code && (
              <span className="text-xs text-gray-500 mt-0.5 font-medium">{postmat.postal_code}</span>
            )}
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
          {/* Bolder number */}
          <span className="font-bold">{stashes.length}</span> <span className="text-gray-500 font-normal">stash{stashes.length !== 1 ? "es" : ""}</span>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <div className="flex items-center gap-2">
            {/* Restyled buttons to match warehouse row actions */}
            <button
              onClick={(e) => { e.stopPropagation(); onEditPostmat(postmat); }}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700 transition"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeletePostmat(postmat.id); }}
              className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded shadow-sm hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>

      {/* Collapsible Stashes Details (Kept mostly the same as it's good for details view) */}
      {isOpen && (
        <tr>
          <td colSpan={6} className="p-0 border-b border-gray-200 bg-gray-50/50">
            <div className="px-6 py-4 pl-12 shadow-inner">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Configured Stashes
              </h4>
              
              {stashes.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                  <p className="text-gray-400 text-sm italic">No stashes configured for this postmat.</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditPostmat(postmat); }} 
                    className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                  >
                    Add one via Edit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stashes.map(stash => (
                    <div
                      key={stash.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      {/* Stash Header */}
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize
                          ${stash.size === 'large' ? 'bg-purple-100 text-purple-800' : 
                            stash.size === 'medium' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}
                        `}>
                          {stash.size}
                        </span>
                        
                        {stash.is_empty ? (
                          <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Empty
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Occupied
                          </span>
                        )}
                      </div>

                      {/* Stash Details */}
                      <div className="text-xs text-gray-600 space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>Reserved:</span>
                          <span className={stash.reserved_until ? "text-blue-600 font-medium" : "text-gray-400"}>
                            {stash.reserved_until ? new Date(stash.reserved_until).toLocaleString() : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span className="font-mono text-gray-400">...{stash.id.slice(-6)}</span>
                        </div>
                      </div>

                      {/* Stash Actions */}
                      <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditStash(stash); }}
                          className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          Modify
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteStash(stash.id); }}
                          className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}