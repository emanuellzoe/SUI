"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import {
  useProgressiveEscrow,
  useJobRefresh,
} from "../hooks/useProgressiveEscrow";
import MilestoneSubmitForm from "./MilestoneSubmitForm";
import {
  JOB_STATUS,
  JOB_STATUS_LABELS,
  ARBITER_ADDRESS,
} from "../config/constants";

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  client: string;
  freelancer: string;
  status: number;
  skills: string[];
  postedAt: string;
  totalMilestones: number;
  completedMilestones: number;
  currentMilestone: number;
  milestoneAmount: number;
  rejectionReason?: string;
  milestoneReports?: string[];
}

const MarketplaceJobs = () => {
  const currentAccount = useCurrentAccount();
  const {
    getAllJobs,
    startWork,
    submitWork,
    approveMilestone,
    rejectMilestone,
    raiseDispute,
    arbiterDecide,
    isLoading,
  } = useProgressiveEscrow();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "my_jobs" | "my_work" | "disputes"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "budget_high" | "budget_low">(
    "newest"
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isArbiter = currentAccount?.address === ARBITER_ADDRESS;

  const disputedJobsCount = jobs.filter(
    (job) => job.status === JOB_STATUS.DISPUTED
  ).length;

  const transformJobs = useCallback((blockchainJobs: any[]): Job[] => {
    return blockchainJobs.map((job: any) => {
      const extractSkills = (description: string): string[] => {
        const skillKeywords = [
          "React",
          "Node.js",
          "TypeScript",
          "Python",
          "Figma",
          "UI/UX",
          "Move",
          "Sui",
          "Smart Contract",
          "Web3",
          "Frontend",
          "Backend",
          "Full Stack",
          "Design",
          "Development",
        ];
        return skillKeywords.filter((skill) =>
          description?.toLowerCase().includes(skill.toLowerCase())
        );
      };

      const extractCategory = (description: string, title?: string): string => {
        const text = `${title || ""} ${description || ""}`.toLowerCase();
        if (
          text.includes("web") ||
          text.includes("frontend") ||
          text.includes("react")
        )
          return "Web Development";
        if (
          text.includes("mobile") ||
          text.includes("app") ||
          text.includes("ios")
        )
          return "Mobile Development";
        if (
          text.includes("design") ||
          text.includes("ui") ||
          text.includes("ux")
        )
          return "UI/UX Design";
        if (
          text.includes("smart contract") ||
          text.includes("blockchain") ||
          text.includes("move")
        )
          return "Blockchain Development";
        if (
          text.includes("data") ||
          text.includes("analytics") ||
          text.includes("python")
        )
          return "Data Science";
        return "Other";
      };

      const budget =
        job.milestoneAmount && job.totalMilestones
          ? (Number(job.milestoneAmount) * Number(job.totalMilestones)) /
            1_000_000_000
          : 0;

      return {
        id: job.id,
        title: job.title || "Untitled Job",
        description: job.description || "No description provided",
        category: extractCategory(job.description, job.title),
        budget,
        deadline: job.deadline || "Not specified",
        client: job.client || "Unknown",
        freelancer: job.freelancer,
        status: Number(job.status),
        skills: extractSkills(job.description || ""),
        postedAt: job.createdAt
          ? new Date(Number(job.createdAt)).toISOString().split("T")[0]
          : "Unknown",
        totalMilestones: Number(job.totalMilestones) || 1,
        completedMilestones: Number(job.completedMilestones) || 0,
        currentMilestone: Number(job.currentMilestone) || 1,
        milestoneAmount: Number(job.milestoneAmount) || 0,
        rejectionReason: job.rejectionReason,
        milestoneReports: job.milestoneReports || [],
      };
    });
  }, []);

  const loadJobs = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoadingJobs(true);
        setError(null);

        const blockchainJobs = await getAllJobs(forceRefresh);

        const transformedJobs = transformJobs(blockchainJobs);
                setJobs(transformedJobs);

        if (selectedJob) {
          const updated = transformedJobs.find((j) => j.id === selectedJob.id);
          if (updated) setSelectedJob(updated);
        }
      } catch (error) {
                setError(
          `Failed to load jobs: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [getAllJobs, transformJobs, selectedJob]
  );

  useJobRefresh(
    useCallback(() => {
            loadJobs(true);
    }, [loadJobs])
  );

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (currentAccount?.address) {
            loadJobs(true);

      if (currentAccount.address === ARBITER_ADDRESS) {
        setActiveFilter("disputes");
      }
    }
  }, [currentAccount?.address]);

  const filterJobs = (jobs: Job[]) => {
    let filtered = jobs;

    if (activeFilter === "my_jobs") {
      filtered = filtered.filter(
        (job) => job.client === currentAccount?.address
      );
    } else if (activeFilter === "my_work") {
      filtered = filtered.filter(
        (job) => job.freelancer === currentAccount?.address
      );
    } else if (activeFilter === "disputes") {
      filtered = filtered.filter((job) => job.status === JOB_STATUS.DISPUTED);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.skills.some((skill) =>
            skill.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    switch (sortBy) {
      case "budget_high":
        filtered.sort((a, b) => b.budget - a.budget);
        break;
      case "budget_low":
        filtered.sort((a, b) => a.budget - b.budget);
        break;
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        );
    }

    return filtered;
  };

  const getStatusBadge = (status: number) => {
    const statusLabel =
      JOB_STATUS_LABELS[status as keyof typeof JOB_STATUS_LABELS] || "Unknown";

    const statusColors: { [key: number]: string } = {
      [JOB_STATUS.ASSIGNED]: "bg-accent-cyan/20 text-accent-cyan",
      [JOB_STATUS.WORKING]: "bg-accent-blue/20 text-accent-blue",
      [JOB_STATUS.IN_REVIEW]: "bg-accent-orange/20 text-accent-orange",
      [JOB_STATUS.REJECTED]: "bg-accent-red/20 text-accent-red",
      [JOB_STATUS.DISPUTED]: "bg-accent-purple/20 text-accent-purple",
      [JOB_STATUS.COMPLETED]: "bg-accent-green/20 text-accent-green",
      [JOB_STATUS.CANCELLED]: "bg-dark-600/20 text-dark-400",
    };

    const colorClass = statusColors[status] || "bg-dark-600/20 text-dark-400";

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

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setShowSubmitForm(false);
    setShowRejectForm(false);
    setRejectReason("");
  };

  const handleStartWork = async () => {
    if (!selectedJob) return;
    try {
      await startWork(selectedJob.id);
      setNotification({ type: "success", message: "Work started! Good luck!" });
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to start work",
      });
    }
  };

  const handleSubmitMilestone = async (description: string) => {
    if (!selectedJob) return;
    try {
      await submitWork(selectedJob.id, description);
      setNotification({
        type: "success",
        message: "Milestone submitted for review!",
      });
      setShowSubmitForm(false);
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to submit milestone",
      });
      throw err;
    }
  };

  const handleApproveMilestone = async () => {
    if (!selectedJob) return;
    try {
      await approveMilestone(selectedJob.id);
      setNotification({
        type: "success",
        message: "Milestone approved! Payment released.",
      });
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to approve milestone",
      });
    }
  };

  const handleRejectMilestone = async () => {
    if (!selectedJob || !rejectReason.trim()) {
      setNotification({
        type: "error",
        message: "Please provide a reason for rejection",
      });
      return;
    }
    try {
      await rejectMilestone(selectedJob.id, rejectReason);
      setNotification({
        type: "success",
        message: "Milestone rejected. Freelancer will revise.",
      });
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to reject milestone",
      });
    }
  };

  const handleRaiseDispute = async () => {
    if (!selectedJob) return;
    try {
      await raiseDispute(selectedJob.id);
      setNotification({
        type: "success",
        message: "Dispute raised. Awaiting arbiter decision.",
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to raise dispute",
      });
    }
  };

  const handleArbiterDecision = async (clientWins: boolean) => {
    if (!selectedJob) return;
    try {
      await arbiterDecide(selectedJob.id, clientWins);
      setNotification({
        type: "success",
        message: clientWins
          ? "✅ Client menang. Freelancer harus revisi milestone ini."
          : "✅ Freelancer menang. Pembayaran milestone dikirim ke freelancer.",
      });
      setSelectedJob(null); // Close modal after decision
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to make decision",
      });
    }
  };

  const filteredJobs = filterJobs(jobs);

  const isClient = selectedJob?.client === currentAccount?.address;
  const isFreelancer = selectedJob?.freelancer === currentAccount?.address;

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="space-y-8">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg border max-w-md shadow-lg transition-all ${
            notification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Arbiter Banner - Show prominently if user is arbiter */}
      {isArbiter && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  You are the Arbiter
                </h2>
                <p className="text-gray-700">
                  You have authority to resolve disputes between clients and
                  freelancers.
                </p>
              </div>
            </div>
            {disputedJobsCount > 0 && (
              <div className="text-center bg-blue-100 rounded-lg px-6 py-3">
                <div className="text-2xl font-bold text-gray-900">
                  {disputedJobsCount}
                </div>
                <div className="text-sm text-gray-700">Pending Disputes</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Escrow Jobs Dashboard
        </h1>
        <p className="text-gray-700 text-base max-w-2xl mx-auto">
          {!currentAccount && "Connect your wallet to view your jobs"}
          {currentAccount &&
            !isArbiter &&
            `Connected: ${formatAddress(currentAccount.address)}`}
        </p>
      </div>

      {/* Filters & Search */}
      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="newest">Newest First</option>
            <option value="budget_high">Highest Budget</option>
            <option value="budget_low">Lowest Budget</option>
          </select>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadJobs(true)}
            disabled={isLoadingJobs}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <svg
              className={`w-5 h-5 ${isLoadingJobs ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Jobs", show: true },
            { key: "my_jobs", label: "My Posted Jobs", show: true },
            { key: "my_work", label: "My Freelance Work", show: true },
            {
              key: "disputes",
              label: `Disputes${
                disputedJobsCount > 0 ? ` (${disputedJobsCount})` : ""
              }`,
              show: isArbiter || disputedJobsCount > 0,
            },
          ]
            .filter((f) => f.show)
            .map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === filter.key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingJobs && (
        <div className="text-center py-16">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900">
            Loading Jobs...
          </h3>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card text-center py-12 bg-red-50 border-red-200">
          <p className="text-red-700 mb-4">{error}</p>
          <button onClick={() => loadJobs(true)} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* Jobs Grid */}
      {!isLoadingJobs && !error && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className={`card hover:border-gray-300 transition-colors cursor-pointer ${
                job.status === JOB_STATUS.DISPUTED && isArbiter
                  ? "border-blue-300 bg-blue-50"
                  : ""
              }`}
              onClick={() => handleJobClick(job)}
            >
              {/* Arbiter Action Needed Badge */}
              {job.status === JOB_STATUS.DISPUTED && isArbiter && (
                <div className="mb-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <span className="text-gray-900 font-semibold">
                    Decision Required
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    {getStatusBadge(job.status)}
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-700">{job.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {job.budget.toFixed(2)} SUI
                  </div>
                  <div className="text-xs text-gray-600">
                    {job.completedMilestones}/{job.totalMilestones} milestones
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                {job.description}
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (job.completedMilestones / job.totalMilestones) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-700">
                    {Math.round(
                      (job.completedMilestones / job.totalMilestones) * 100
                    )}
                    %
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Client:</span>{" "}
                  {formatAddress(job.client)}
                  {job.client === currentAccount?.address && (
                    <span className="text-blue-600 ml-1">(You)</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Freelancer:</span>{" "}
                  {formatAddress(job.freelancer)}
                  {job.freelancer === currentAccount?.address && (
                    <span className="text-blue-600 ml-1">(You)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingJobs && !error && filteredJobs.length === 0 && (
        <div className="card text-center py-16">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {activeFilter === "disputes" ? "No disputes" : "No jobs found"}
          </h3>
          <p className="text-gray-700">
            {activeFilter === "my_jobs" && "You haven't posted any jobs yet."}
            {activeFilter === "my_work" &&
              "You don't have any assigned work yet."}
            {activeFilter === "disputes" && "All disputes have been resolved."}
            {activeFilter === "all" && "No jobs available at the moment."}
          </p>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && !showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {selectedJob.title}
                  </h2>
                  <div className="flex items-center gap-4 mb-4">
                    {getStatusBadge(selectedJob.status)}
                    <span className="text-gray-700 font-medium">
                      {selectedJob.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  ✕
                </button>
              </div>

              {/* Arbiter Decision Panel - Prominent for arbiter */}
              {isArbiter && selectedJob.status === JOB_STATUS.DISPUTED && (
                <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Arbiter Decision Panel
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Freelancer has disputed the client's rejection for milestone{" "}
                    {selectedJob.currentMilestone}. Please review the evidence
                    and make a decision:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        If Client is Right:
                      </h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Freelancer must revise this milestone</li>
                        <li>• Status returns to REJECTED</li>
                        <li>• No payment</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        If Freelancer is Right:
                      </h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Milestone is considered complete</li>
                        <li>• Payment goes to freelancer</li>
                        <li>• Proceed to next milestone</li>
                      </ul>
                    </div>
                  </div>

                  {selectedJob.rejectionReason && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-red-700 font-medium">
                        Client's Rejection Reason:{" "}
                      </span>
                      <span className="text-gray-700">
                        {selectedJob.rejectionReason}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleArbiterDecision(true)}
                      className="flex-1 btn btn-secondary py-4"
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Client is Right (Revise)"}
                    </button>
                    <button
                      onClick={() => handleArbiterDecision(false)}
                      className="flex-1 btn btn-primary py-4"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Processing..."
                        : "Freelancer is Right (Pay)"}
                    </button>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedJob.budget.toFixed(2)} SUI
                  </div>
                  <div className="text-sm text-gray-600">Total Budget</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedJob.completedMilestones}/
                    {selectedJob.totalMilestones}
                  </div>
                  <div className="text-sm text-gray-600">Milestones</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    {(selectedJob.milestoneAmount / 1_000_000_000).toFixed(2)}{" "}
                    SUI
                  </div>
                  <div className="text-sm text-gray-600">Per Milestone</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Description
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Rejection Reason - if rejected or disputed */}
                {(selectedJob.status === JOB_STATUS.REJECTED ||
                  selectedJob.status === JOB_STATUS.DISPUTED) &&
                  selectedJob.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-red-700 font-semibold mb-2">
                        Rejection Reason
                      </h4>
                      <p className="text-gray-700">
                        {selectedJob.rejectionReason}
                      </p>
                    </div>
                  )}

                {/* Milestone Reports */}
                {selectedJob.milestoneReports &&
                  selectedJob.milestoneReports.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Milestone Reports
                      </h4>
                      <div className="space-y-3">
                        {selectedJob.milestoneReports.map((report, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                          >
                            <div className="text-sm text-blue-600 font-medium mb-2">
                              Milestone {index + 1}
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {report}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Parties Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Parties
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <span className="text-gray-900 ml-2 font-mono text-sm">
                        {formatAddress(selectedJob.client)}
                        {isClient && " (You)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Freelancer:</span>
                      <span className="text-gray-900 ml-2 font-mono text-sm">
                        {formatAddress(selectedJob.freelancer)}
                        {isFreelancer && " (You)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reject Form */}
              {showRejectForm && isClient && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Rejection Reason
                  </h4>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this milestone needs revision..."
                    className="input h-24 resize-none mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleRejectMilestone}
                      className="btn btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-gray-200">
                {/* Freelancer Actions */}
                {isFreelancer && (
                  <>
                    {selectedJob.status === JOB_STATUS.ASSIGNED && (
                      <button
                        onClick={handleStartWork}
                        className="btn btn-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? "Starting..." : "Start Working"}
                      </button>
                    )}
                    {(selectedJob.status === JOB_STATUS.WORKING ||
                      selectedJob.status === JOB_STATUS.REJECTED) && (
                      <button
                        onClick={() => setShowSubmitForm(true)}
                        className="btn btn-primary"
                        disabled={isLoading}
                      >
                        Submit Milestone
                      </button>
                    )}
                    {selectedJob.status === JOB_STATUS.REJECTED && (
                      <button
                        onClick={handleRaiseDispute}
                        className="btn btn-secondary"
                        disabled={isLoading}
                      >
                        Raise Dispute
                      </button>
                    )}
                  </>
                )}

                {/* Client Actions */}
                {isClient && selectedJob.status === JOB_STATUS.IN_REVIEW && (
                  <>
                    <button
                      onClick={handleApproveMilestone}
                      className="btn btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Approving..." : "Approve Milestone"}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="btn btn-secondary"
                      disabled={isLoading}
                    >
                      Reject
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedJob(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Submit Form Modal */}
      {selectedJob && showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <MilestoneSubmitForm
              jobId={selectedJob.id}
              currentMilestone={selectedJob.currentMilestone}
              totalMilestones={selectedJob.totalMilestones}
              onSubmit={handleSubmitMilestone}
              onCancel={() => setShowSubmitForm(false)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceJobs;
