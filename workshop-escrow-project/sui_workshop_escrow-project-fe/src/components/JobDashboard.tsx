"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import {
  useProgressiveEscrow,
  useJobRefresh,
} from "../hooks/useProgressiveEscrow";
import {
  JOB_STATUS,
  JOB_STATUS_LABELS,
  ARBITER_ADDRESS,
} from "../config/constants";

interface DashboardJob {
  id: string;
  title: string;
  description: string;
  status: number;
  budget: number;
  freelancer: string;
  client: string;
  milestones: {
    total: number;
    completed: number;
    current: number;
  };
  postedAt: string;
  deadline: string;
}

interface DashboardStats {
  totalJobsPosted: number;
  totalJobsWorked: number;
  jobsInProgress: number;
  completedJobs: number;
  totalSpent: number;
  totalEarned: number;
}

const JobDashboard = () => {
  const currentAccount = useCurrentAccount();
  const { getAllJobs, getUserActivity, isLoading } = useProgressiveEscrow();

  const [clientJobs, setClientJobs] = useState<DashboardJob[]>([]);
  const [freelancerJobs, setFreelancerJobs] = useState<DashboardJob[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobsPosted: 0,
    totalJobsWorked: 0,
    jobsInProgress: 0,
    completedJobs: 0,
    totalSpent: 0,
    totalEarned: 0,
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"client" | "freelancer">("client");

  const isArbiter = currentAccount?.address === ARBITER_ADDRESS;

  const transformJobs = useCallback(
    (
      allJobs: any[],
      userAddress: string
    ): {
      posted: DashboardJob[];
      worked: DashboardJob[];
    } => {
      const transform = (job: any): DashboardJob => {
        const budget =
          job.milestoneAmount && job.totalMilestones
            ? (Number(job.milestoneAmount) * Number(job.totalMilestones)) /
              1_000_000_000
            : 0;

        return {
          id: job.id,
          title: job.title || "Untitled Job",
          description: job.description || "No description provided",
          status: Number(job.status),
          budget,
          freelancer: job.freelancer,
          client: job.client,
          milestones: {
            total: Number(job.totalMilestones) || 1,
            completed: Number(job.completedMilestones) || 0,
            current: Number(job.currentMilestone) || 1,
          },
          postedAt: job.createdAt
            ? new Date(Number(job.createdAt)).toISOString().split("T")[0]
            : "Unknown",
          deadline: job.deadline || "Not specified",
        };
      };

      return {
        posted: allJobs
          .filter((job) => job.client === userAddress)
          .map(transform),
        worked: allJobs
          .filter((job) => job.freelancer === userAddress)
          .map(transform),
      };
    },
    []
  );

  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      if (!currentAccount) return;

      try {
        setIsLoadingData(true);
        setError(null);

        const [allJobs, userActivity] = await Promise.all([
          getAllJobs(forceRefresh),
          getUserActivity(currentAccount.address, forceRefresh),
        ]);


        const { posted, worked } = transformJobs(
          allJobs,
          currentAccount.address
        );

        setClientJobs(posted);
        setFreelancerJobs(worked);

        const totalJobsPosted = posted.length;
        const totalJobsWorked = worked.length;

        const allUserJobs = [...posted, ...worked];
        const uniqueJobs = allUserJobs.filter(
          (job, index, self) => index === self.findIndex((j) => j.id === job.id)
        );

        const jobsInProgress = uniqueJobs.filter(
          (job) =>
            job.status === JOB_STATUS.WORKING ||
            job.status === JOB_STATUS.IN_REVIEW ||
            job.status === JOB_STATUS.ASSIGNED
        ).length;

        const completedJobs = uniqueJobs.filter(
          (job) => job.status === JOB_STATUS.COMPLETED
        ).length;

        const totalSpent = posted
          .filter((job) => job.status === JOB_STATUS.COMPLETED)
          .reduce((sum, job) => sum + job.budget, 0);

        const totalEarned = (userActivity?.totalEarnings || 0) / 1_000_000_000;

        setStats({
          totalJobsPosted,
          totalJobsWorked,
          jobsInProgress,
          completedJobs,
          totalSpent,
          totalEarned,
        });

        if (worked.length > 0 && posted.length === 0) {
          setActiveTab("freelancer");
        }
      } catch (error) {
                setError(
          `Failed to load dashboard: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoadingData(false);
      }
    },
    [currentAccount, getAllJobs, getUserActivity, transformJobs]
  );

  useJobRefresh(
    useCallback(() => {
            fetchDashboardData(true);
    }, [fetchDashboardData])
  );

  useEffect(() => {
    if (currentAccount) {
      fetchDashboardData();
    }
  }, []);

  useEffect(() => {
    if (currentAccount?.address) {
            fetchDashboardData(true);
    }
  }, [currentAccount?.address]);

  const getStatusBadge = (status: number) => {
    const statusLabel =
      JOB_STATUS_LABELS[status as keyof typeof JOB_STATUS_LABELS] || "Unknown";

    const statusColors: { [key: number]: string } = {
      [JOB_STATUS.ASSIGNED]: "bg-cyan-100 text-cyan-700",
      [JOB_STATUS.WORKING]: "bg-blue-100 text-blue-700",
      [JOB_STATUS.IN_REVIEW]: "bg-orange-100 text-orange-700",
      [JOB_STATUS.REJECTED]: "bg-red-100 text-red-700",
      [JOB_STATUS.DISPUTED]: "bg-purple-100 text-purple-700",
      [JOB_STATUS.COMPLETED]: "bg-green-100 text-green-700",
      [JOB_STATUS.CANCELLED]: "bg-gray-100 text-gray-600",
    };

    const colorClass = statusColors[status] || "bg-gray-100 text-gray-600";

    return (
      <span className={`px-2 py-1 ${colorClass} rounded-full text-xs`}>
        {statusLabel}
      </span>
    );
  };

  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!currentAccount) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 bg-blue-50 rounded-full mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h3>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          Connect your wallet to view your jobs and work
        </p>
        <div className="mt-6">
          <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
            Wallet Required
          </span>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 bg-blue-50 rounded-full mb-6">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Loading Dashboard...
        </h3>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          Fetching your data from the blockchain
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 bg-red-50 rounded-full mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-3xl font-bold text-red-600 mb-4">
          Error Loading Dashboard
        </h3>
        <p className="text-gray-600 text-lg max-w-md mx-auto mb-6">{error}</p>
        <button
          onClick={() => fetchDashboardData(true)}
          className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentJobs = activeTab === "client" ? clientJobs : freelancerJobs;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">My Dashboard</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          {isArbiter &&
            "You are the Arbiter. Check disputes in the Marketplace."}
          {!isArbiter && `Connected: ${formatAddress(currentAccount.address)}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalJobsPosted}
          </div>
          <div className="text-gray-600 text-sm">Jobs Posted</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalJobsWorked}
          </div>
          <div className="text-gray-600 text-sm">Jobs Worked</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.jobsInProgress}
          </div>
          <div className="text-gray-600 text-sm">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.completedJobs}
          </div>
          <div className="text-gray-600 text-sm">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">
            {stats.totalSpent.toFixed(2)}
          </div>
          <div className="text-gray-600 text-sm">SUI Spent</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.totalEarned.toFixed(2)}
          </div>
          <div className="text-gray-600 text-sm">SUI Earned</div>
        </div>
      </div>

      {/* Tabs with Refresh Button */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("client")}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "client"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            My Posted Jobs ({clientJobs.length})
          </button>
          <button
            onClick={() => setActiveTab("freelancer")}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "freelancer"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            My Freelance Work ({freelancerJobs.length})
          </button>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={isLoadingData}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Jobs List */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {activeTab === "client" ? "Jobs I've Posted" : "Jobs I'm Working On"}
        </h2>

        {currentJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === "client"
                ? "No Jobs Posted Yet"
                : "No Work Assigned Yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === "client"
                ? "Start by creating a job to find talented freelancers"
                : "Clients will assign you work. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentJobs.map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {job.title}
                      </h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {job.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Posted: {job.postedAt}</span>
                      <span>Deadline: {job.deadline}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {job.budget.toFixed(2)} SUI
                    </div>
                    <div className="text-sm text-gray-600">Budget</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        {activeTab === "client"
                          ? "Assigned Freelancer:"
                          : "Client:"}
                      </div>
                      <div className="font-medium text-gray-900 font-mono">
                        {activeTab === "client"
                          ? formatAddress(job.freelancer)
                          : formatAddress(job.client)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Progress:
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (job.milestones.completed /
                                  job.milestones.total) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700">
                          {job.milestones.completed}/{job.milestones.total}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick action hints */}
                  <div className="mt-4 text-sm">
                    {activeTab === "client" && (
                      <>
                        {job.status === JOB_STATUS.IN_REVIEW && (
                          <span className="text-orange-600">
                            Milestone ready for your review - go to Marketplace
                          </span>
                        )}
                        {job.status === JOB_STATUS.DISPUTED && (
                          <span className="text-purple-600">
                            Dispute in progress - awaiting arbiter
                          </span>
                        )}
                      </>
                    )}
                    {activeTab === "freelancer" && (
                      <>
                        {job.status === JOB_STATUS.ASSIGNED && (
                          <span className="text-cyan-600">
                            Ready to start working - go to Marketplace
                          </span>
                        )}
                        {job.status === JOB_STATUS.WORKING && (
                          <span className="text-blue-600">
                            Submit milestone when ready - go to Marketplace
                          </span>
                        )}
                        {job.status === JOB_STATUS.REJECTED && (
                          <span className="text-red-600">
                            Revision needed or raise dispute - go to Marketplace
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arbiter Notice */}
      {isArbiter && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">
                You are the Arbiter
              </h4>
              <p className="text-gray-600 text-sm">
                Check the Marketplace for any disputed jobs that need your
                decision.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDashboard;
