"use client";

import { useState } from "react";
import WalletConnection from "../components/WalletConnection";
import JobExplorer from "../components/JobExplorer";
import JobDashboard from "../components/JobDashboard";
import CreateJob from "../components/CreateJob";
import MarketplaceJobs from "../components/MarketplaceJobs";

type TabType = "marketplace" | "explorer" | "dashboard" | "create";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("marketplace");

  const tabs = [
    { id: "marketplace", label: "Marketplace", component: MarketplaceJobs },
    { id: "explorer", label: "My Jobs", component: JobExplorer },
    { id: "dashboard", label: "Dashboard", component: JobDashboard },
    { id: "create", label: "Post Job", component: CreateJob },
  ] as const;

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || MarketplaceJobs;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Freelance Marketplace
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Decentralized platform on Sui Blockchain
              </p>
            </div>
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-2 mb-6 inline-flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[600px]">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
