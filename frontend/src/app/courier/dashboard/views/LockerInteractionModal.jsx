"use client";

import { useState } from "react";
import { Package, QrCode, Lock, Unlock, CheckCircle, ArrowRight, X, Loader2, Box, MapPin, AlertCircle } from "lucide-react";
import api from "@/axios/api";

export default function LockerInteractionModal({ stop, onClose, onComplete, routeId, onScanSuccess }) {
  const [activeTab, setActiveTab] = useState("dropoff");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanningId, setScanningId] = useState(null); 

  const dropoffs = stop.dropoffs || [];
  const pickups = stop.pickups || [];

  // --- Helpers ---
  const getPackageInfo = (pkg) => {
      const code = pkg.pickup_code || pkg.package?.pickup_code;
      const displayCode = code || `PKG-${(pkg.id || "").toString().slice(0, 4).toUpperCase()}`;
      const id = pkg.id;
      const status = pkg.status || pkg.package?.status;
      return { id, displayCode, status, raw: pkg };
  };

  const isPackageCompleted = (status, type) => {
      if (!status) return false;
      if (type === 'drop') {
          return ['placed_in_stash', 'in_warehouse', 'delivered'].includes(status);
      } else {
          return ['in_transit', 'picked_up', 'delivered'].includes(status);
      }
  };

  // --- Actions ---
  const handleScan = async (pkgId, type) => {
    if (!routeId) return alert("Błąd: Brak ID trasy.");
    setScanningId(pkgId);

    try {
        const res = await api.post(`/api/courier/routes/${routeId}/scan-package/`, {
            package_id: pkgId,
            stop_id: stop.id,
            action: type
        });

        if (onScanSuccess && res.data?.new_state) {
            onScanSuccess(stop.id, pkgId, res.data.new_state);
        }
    } catch (err) {
        console.error("Scan failed", err);
        alert("Błąd skanowania: " + (err.response?.data?.error || "Błąd serwera"));
    } finally {
        setScanningId(null);
    }
  };

  const scanAll = async (type) => {
    if(!confirm("Czy na pewno chcesz zasymulować zeskanowanie WSZYSTKICH paczek?")) return;
    setIsSubmitting(true);
    const items = type === 'drop' ? dropoffs : pickups;
    
    for (const item of items) {
        const { id, status } = getPackageInfo(item);
        if (!isPackageCompleted(status, type)) {
             await handleScan(id, type);
        }
    }
    setIsSubmitting(false);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onComplete(stop.id);
    setIsSubmitting(false);
    onClose();
  };

  // --- UI Calc ---
  const dropStatusList = dropoffs.map(pkg => {
      const info = getPackageInfo(pkg);
      return { ...info, completed: isPackageCompleted(info.status, 'drop') };
  });
  const pickStatusList = pickups.map(pkg => {
      const info = getPackageInfo(pkg);
      return { ...info, completed: isPackageCompleted(info.status, 'pick') };
  });

  const dropsLeft = dropStatusList.filter(p => !p.completed).length;
  const picksLeft = pickStatusList.filter(p => !p.completed).length;
  const isReadyToFinish = dropsLeft === 0 && picksLeft === 0;
  
  const totalItems = (dropoffs.length + pickups.length) || 1;
  const doneItems = (dropStatusList.length - dropsLeft) + (pickStatusList.length - picksLeft);
  const progress = (doneItems / totalItems) * 100;

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[750px] border border-gray-200 dark:border-gray-800">
        
        {/* LEFT PANEL: Dashboard & Status */}
        <div className="w-full md:w-1/3 bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Dekoracja tła */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                        <MapPin className="w-6 h-6 text-blue-200" />
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition md:hidden backdrop-blur-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <h2 className="text-3xl font-black mb-2 leading-tight tracking-tight">{stop.postmat?.name || "Magazyn"}</h2>
                <p className="text-blue-200 text-sm font-medium opacity-90 border-l-2 border-blue-400 pl-3 leading-relaxed">
                    {stop.postmat?.address || "Lokalizacja nieznana"}
                </p>
                
                <div className="grid grid-cols-2 gap-3 mt-8">
                    <div className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${dropsLeft === 0 ? 'bg-green-500/20 border-green-500/30' : 'bg-white/10 border-white/10'}`}>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1 opacity-70">Włóż (Drop)</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">{dropsLeft}</span>
                            <span className="text-sm opacity-60">/ {dropoffs.length}</span>
                        </div>
                        {dropsLeft === 0 && dropoffs.length > 0 && <CheckCircle className="w-5 h-5 text-green-400 mt-2" />}
                    </div>
                    <div className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${picksLeft === 0 ? 'bg-green-500/20 border-green-500/30' : 'bg-white/10 border-white/10'}`}>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1 opacity-70">Wyjmij (Pick)</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">{picksLeft}</span>
                            <span className="text-sm opacity-60">/ {pickups.length}</span>
                        </div>
                        {picksLeft === 0 && pickups.length > 0 && <CheckCircle className="w-5 h-5 text-green-400 mt-2" />}
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-6 md:mt-0 space-y-4">
                <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                        <span>Postęp obsługi</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(74,222,128,0.5)]" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <button 
                    onClick={handleConfirm}
                    disabled={!isReadyToFinish || isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-xl border
                        ${isReadyToFinish 
                            ? 'bg-white text-blue-700 hover:bg-blue-50 border-white' 
                            : 'bg-black/20 text-white/40 cursor-not-allowed border-transparent'}`}
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        isReadyToFinish ? <>Zakończ postój <ArrowRight className="w-5 h-5" /></> : "Dokończ skanowanie"
                    )}
                </button>
            </div>
        </div>

        {/* RIGHT PANEL: Scanner & List */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 relative">
            {/* Desktop Close */}
            <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full transition hidden md:block z-20 text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
            </button>

            {/* Tabs */}
            <div className="flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 pt-6 gap-6">
                <button 
                    onClick={() => setActiveTab('dropoff')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-all border-b-[3px] flex items-center gap-2
                        ${activeTab === 'dropoff' 
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <Box className="w-4 h-4" />
                    Wkładanie <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-md text-xs ml-1">{dropStatusList.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('pickup')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-all border-b-[3px] flex items-center gap-2
                        ${activeTab === 'pickup' 
                            ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <Unlock className="w-4 h-4" />
                    Odbieranie <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-md text-xs ml-1">{pickStatusList.length}</span>
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
                {(activeTab === 'dropoff' ? dropStatusList : pickStatusList).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <CheckCircle className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-700" />
                        <p className="text-lg font-medium">Brak paczek w tej kategorii.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                Kliknij kartę aby zeskanować
                            </span>
                            <button onClick={() => scanAll(activeTab === 'dropoff' ? 'drop' : 'pick')} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition uppercase tracking-wider">
                                Symuluj Skan Wszystkich
                            </button>
                        </div>
                        
                        {(activeTab === 'dropoff' ? dropStatusList : pickStatusList).map(pkg => {
                            const isProcessing = scanningId === pkg.id;
                            const isScanned = pkg.completed; 
                            const themeColor = activeTab === 'dropoff' ? 'blue' : 'amber';

                            return (
                                <div key={pkg.id} 
                                    onClick={() => !isProcessing && !isScanned && handleScan(pkg.id, activeTab === 'dropoff' ? 'drop' : 'pick')}
                                    className={`group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-between
                                        ${isScanned 
                                            ? 'bg-white dark:bg-gray-800 border-green-500/50 shadow-sm opacity-60' 
                                            : `bg-white dark:bg-gray-800 border-transparent hover:border-${themeColor}-400 shadow-md hover:shadow-lg hover:-translate-y-0.5`
                                        }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-inner
                                            ${isScanned 
                                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                                : (activeTab === 'dropoff' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' : 'bg-amber-50 text-amber-500 dark:bg-amber-900/20')
                                            }`}>
                                            {activeTab === 'dropoff' ? <Package className="w-6 h-6" /> : (isScanned ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-mono font-bold text-lg tracking-tight ${isScanned ? 'text-green-700 dark:text-green-400 decoration-slice' : 'text-gray-800 dark:text-gray-100'}`}>
                                                    {pkg.displayCode}
                                                </p>
                                                {isScanned && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Gotowe</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                                                Rozmiar: {(pkg.raw.size || pkg.raw.package?.size || "M").toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="pl-4">
                                        {isProcessing ? (
                                            <Loader2 className={`w-6 h-6 animate-spin text-${themeColor}-500`} />
                                        ) : (
                                            isScanned ? (
                                                <div className="bg-green-500 text-white p-1 rounded-full shadow-md shadow-green-200">
                                                    <CheckCircle className="w-6 h-6" />
                                                </div>
                                            ) : (
                                                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg group-hover:bg-gray-200 transition">
                                                    <QrCode className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}