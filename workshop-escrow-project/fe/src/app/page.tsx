"use client";

import { useState } from "react";
import WalletConnection from "../components/WalletConnection";
import JobExplorer from "../components/JobExplorer";
import JobDashboard from "../components/JobDashboard";
import CreateJob from "../components/CreateJob";
import MarketplaceJobs from "../components/MarketplaceJobs";
import RoleSelector from "../components/RoleSelector";
import { useRole, UserRole } from "../hooks/useRole";

type TabType = "marketplace" | "explorer" | "dashboard" | "create";

// Define which tabs are available for each role
const getRoleTabs = (role: UserRole) => {
  switch (role) {
    case 'client':
      return [
        { id: "create", label: "📝 Post Job", component: CreateJob },
        { id: "explorer", label: "📋 My Jobs", component: JobExplorer },
        { id: "marketplace", label: "🏪 All Jobs", component: MarketplaceJobs },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    case 'freelancer':
      return [
        { id: "marketplace", label: "🔍 Find Jobs", component: MarketplaceJobs },
        { id: "explorer", label: "💼 My Work", component: JobExplorer },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    case 'arbiter':
      return [
        { id: "marketplace", label: "⚖️ Disputes", component: MarketplaceJobs },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    default:
      return [];
  }
};

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'client': return { label: 'Client', color: 'bg-blue-500', icon: '💼' };
    case 'freelancer': return { label: 'Freelancer', color: 'bg-green-500', icon: '👨‍💻' };
    case 'arbiter': return { label: 'Arbiter', color: 'bg-purple-500', icon: '⚖️' };
    default: return { label: '', color: '', icon: '' };
  }
};

export default function Home() {
  const { role, hasSelectedRole, clearRole } = useRole();
  const [activeTab, setActiveTab] = useState<TabType>("marketplace");

  // Show role selector if no role selected
  if (!hasSelectedRole || !role) {
    return <RoleSelector />;
  }

  const tabs = getRoleTabs(role);
  const roleInfo = getRoleLabel(role);
  
  // Get the first tab as default if current tab not available for this role
  const availableTabs = tabs.map(t => t.id);
  const currentTab = availableTabs.includes(activeTab) ? activeTab : (availableTabs[0] as TabType);
  
  const ActiveComponent =
    tabs.find((tab) => tab.id === currentTab)?.component || MarketplaceJobs;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Freelance Marketplace
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Decentralized platform on Sui Blockchain
                </p>
              </div>
              {/* Role Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 ${roleInfo.color} text-white rounded-full text-sm font-medium`}>
                <span>{roleInfo.icon}</span>
                <span>{roleInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Switch Role Button */}
              <button
                onClick={clearRole}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Switch Role
              </button>
              <WalletConnection />
            </div>
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
                currentTab === tab.id
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
