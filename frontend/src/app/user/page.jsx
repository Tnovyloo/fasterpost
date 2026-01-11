"use client";

import { useState } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import DashboardSidebar from "@/app/components/DashboardSidebar";
import MyParcels from "./views/MyParcels";
import Settings from "./views/Settings";
import IncomingParcels from "./views/IncomingParcels";
import EditPackageModal from "@/app/components/EditPackageModal"; // Reusing for creation

export default function UserDashboardPage() {
  const [activeView, setActiveView] = useState("parcels");
  const [showSendModal, setShowSendModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Simple way to trigger refresh in MyParcels

  const renderContent = () => {
    switch (activeView) {
      case "parcels":
        return <MyParcels key={refreshTrigger} />;
      case "incoming":
        return <IncomingParcels />;
      case "settings":
        return <Settings />;
      default:
        return <MyParcels key={refreshTrigger} />;
    }
  };

  const handlePackageCreated = () => {
      setShowSendModal(false);
      setRefreshTrigger(prev => prev + 1); // Reload list
      setActiveView("parcels");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 text-black font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 pt-24">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="lg:w-72 flex-shrink-0">
            <DashboardSidebar 
                activeView={activeView} 
                setActiveView={setActiveView} 
                onSendPackage={() => setShowSendModal(true)}
            />
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-1 md:p-8 border border-white/60 shadow-xl shadow-blue-900/5 min-h-[700px]">
              {renderContent()}
            </div>
          </div>

        </div>
      </main>

      {/* Send Package Modal (Creation Mode) */}
      {showSendModal && (
        <EditPackageModal
          package={{}} // Empty object signals creation mode
          onClose={() => setShowSendModal(false)}
          onSuccess={handlePackageCreated}
        />
      )}

      <Footer />
    </div>
  );
}