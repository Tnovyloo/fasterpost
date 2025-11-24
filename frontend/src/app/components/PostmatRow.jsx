"use client"

import React, { useEffect, useState, useCallback } from "react";

export default function CollapsiblePostmatRow({ postmat, stashes, onEditPostmat, onDeletePostmat, onEditStash, onDeleteStash }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <React.Fragment>
      {/* Main Row */}
      <tr
        className="hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <td className="px-6 py-4 font-medium">
          <div className="flex items-center gap-2">
            <span className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
              ▶
            </span>
            {postmat.name}
          </div>
        </td>
        <td className="px-6 py-4">{postmat.warehouse?.name || postmat.warehouse_id}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 text-xs rounded-full ${
            postmat.status === "active" ? "bg-green-100 text-green-800" :
            postmat.status === "inactive" ? "bg-red-100 text-red-800" :
            "bg-yellow-100 text-yellow-800"
          }`}>
            {postmat.display_status}
          </span>
        </td>
        <td className="px-6 py-4 text-sm">
          {postmat.latitude.toFixed(4)}, {postmat.longitude.toFixed(4)}
          {postmat.postal_code && ` (${postmat.postal_code})`}
        </td>
        <td className="px-6 py-4 text-sm font-medium">
          {stashes.length} stash{stashes.length !== 1 ? "es" : ""}
        </td>
        <td className="px-6 py-4 space-x-3">
          <button
            onClick={(e) => { e.stopPropagation(); onEditPostmat(postmat); }}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeletePostmat(postmat.id); }}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </td>
      </tr>

      {/* Collapsible Stashes */}
      {isOpen && (
        <tr>
          <td colSpan={6} className="p-0 bg-gray-50 border-t border-gray-200">
            <div className="p-6">
              {stashes.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic">
                  No stashes in this postmat
                </p>
              ) : (
                <div className="space-y-3">
                  {stashes.map(stash => (
                    <div
                      key={stash.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow transition-shadow"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm flex-1">
                        <div><strong>Size:</strong> {stash.display_size}</div>
                        <div>
                          <strong>Empty:</strong>{" "}
                          {stash.is_empty ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-orange-600">No</span>
                          )}
                        </div>
                        <div>
                          <strong>Reserved:</strong>{" "}
                          {stash.reserved_until ? (
                            new Date(stash.reserved_until).toLocaleString()
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                        <div><strong>ID:</strong> {stash.id}</div>
                      </div>
                      <div className="flex gap-4 ml-6">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditStash(stash); }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteStash(stash.id); }}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
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
    </React.Fragment>
  );
}