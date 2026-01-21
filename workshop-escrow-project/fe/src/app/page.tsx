"use client";

import { useState } from "react";
import WalletConnection from "../components/WalletConnection";
import JobExplorer from "../components/JobExplorer";
import JobDashboard from "../components/JobDashboard";
import CreateJob from "../components/CreateJob";
import MarketplaceJobs from "../components/MarketplaceJobs";
import OpenJobsMarketplace from "../components/OpenJobsMarketplace";
import JobApplications from "../components/JobApplications";
import ArbiterDashboard from "../components/ArbiterDashboard";
import RoleSelector from "../components/RoleSelector";
import { useRole, UserRole } from "../hooks/useRole";

type TabType = "marketplace" | "explorer" | "dashboard" | "create" | "open_jobs" | "applications" | "arbiter";

// Define which tabs are available for each role
const getRoleTabs = (role: UserRole) => {
  switch (role) {
    case 'client':
      return [
        { id: "create", label: "📝 Post Job", component: CreateJob },
        { id: "applications", label: "📋 Review Applications", component: JobApplications },
        { id: "explorer", label: "💼 My Jobs", component: JobExplorer },
        { id: "marketplace", label: "🏪 All Jobs", component: MarketplaceJobs },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    case 'freelancer':
      return [
        { id: "open_jobs", label: "🔍 Find Jobs", component: OpenJobsMarketplace },
        { id: "explorer", label: "💼 My Work", component: JobExplorer },
        { id: "marketplace", label: "🏪 All Jobs", component: MarketplaceJobs },
        { id: "dashboard", label: "📊 Dashboard", component: JobDashboard },
      ];
    case 'arbiter':
      return [
        { id: "arbiter", label: "⚖️ Arbiter Panel", component: ArbiterDashboard },
        { id: "marketplace", label: "🏪 All Jobs", component: MarketplaceJobs },
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
    case 'freelancer': return 'open_jobs';
    case 'arbiter': return 'arbiter';
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
  
  // Get the first tab as default if current tab not available for this role
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
                  SUI Escrow v2
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Decentralized freelance marketplace with open jobs
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
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">SUI Escrow v2</span>
              <span>•</span>
              <span>Powered by SUI Blockchain</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Multi-Arbiter System</span>
              <span>•</span>
              <span>Deadline Protection</span>
              <span>•</span>
              <span>Open Jobs Marketplace</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
