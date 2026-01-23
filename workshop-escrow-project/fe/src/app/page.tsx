"use client";

import { useState } from "react";
import WalletConnection from "../components/WalletConnection";
import JobExplorer from "../components/JobExplorer";
import JobDashboard from "../components/JobDashboard";
import CreateJob from "../components/CreateJob";
import MarketplaceJobs from "../components/MarketplaceJobs";
import RoleSelector from "../components/RoleSelector";
import { useRole, UserRole } from "../hooks/useRole";
import { CONTRACT_CONFIG } from "../config/constants";

type TabType = "marketplace" | "explorer" | "dashboard" | "create";

// V1 - Simplified tabs (no open jobs/applications system)
const getRoleTabs = (role: UserRole) => {
  switch (role) {
    case 'client':
      return [
        { id: "create", label: "📝 Create Job", component: CreateJob },
        { id: "explorer", label: "💼 My Jobs", component: JobExplorer },
        { id: "marketplace", label: "🏪 All Jobs", component: MarketplaceJobs },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    case 'freelancer':
      return [
        { id: "explorer", label: "💼 My Work", component: JobExplorer },
        { id: "marketplace", label: "🏪 All Jobs", component: MarketplaceJobs },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    case 'arbiter':
      return [
        { id: "marketplace", label: "🏪 All Jobs (Disputes)", component: MarketplaceJobs },
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

const getDefaultTab = (role: UserRole): TabType => {
  switch (role) {
    case 'client': return 'create';
    case 'freelancer': return 'explorer';
    case 'arbiter': return 'marketplace';
    default: return 'marketplace';
  }
};

export default function Home() {
  const { role, hasSelectedRole, clearRole } = useRole();
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  // Show role selector if no role selected
  if (!hasSelectedRole || !role) {
    return <RoleSelector />;
  }

  const tabs = getRoleTabs(role);
  const roleInfo = getRoleLabel(role);
  
  const defaultTab = getDefaultTab(role);
  const availableTabs = tabs.map(t => t.id);
  const currentTab = activeTab && availableTabs.includes(activeTab) ? activeTab : defaultTab;
  
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
                  SUI Escrow
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Milestone-based freelance escrow
                </p>
              </div>
              {/* Role Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 ${roleInfo.color} text-white rounded-full text-sm font-medium`}>
                <span>{roleInfo.icon}</span>
                <span>{roleInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

      {/* V1 Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm">
          <span className="text-blue-700">
            <strong>V1 Module:</strong> {CONTRACT_CONFIG.MODULE_NAME} • Arbiter: {CONTRACT_CONFIG.ARBITER_ADDRESS?.slice(0, 10)}...
          </span>
          <span className="text-blue-600">
            Status: ASSIGNED(0) → WORKING(1) → IN_REVIEW(2) → APPROVED/REJECTED
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-2 mb-6 inline-flex gap-2 flex-wrap">
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span className="font-semibold text-gray-700">SUI Escrow V1</span>
            <span>Milestone-based payments • Arbiter dispute resolution</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
