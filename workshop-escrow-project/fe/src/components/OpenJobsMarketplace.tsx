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
  APPLICATION_STATUS,
} from "../config/constants";

interface OpenJob {
  id: string;
  title: string;
  description: string;
  requirements: string;
  budget: number;
  client: string;
  status: number;
  totalMilestones: number;
  milestoneAmount: number;
  deadlinePerMilestoneMs: number;
  reviewPeriodMs: number;
  createdAt: string;
  isOpen: boolean;
}

const OpenJobsMarketplace = () => {
  const currentAccount = useCurrentAccount();
  const {
    getAllJobs,
    applyForJob,
    formatDeadline,
    isLoading,
  } = useProgressiveEscrow();

  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<OpenJob | null>(null);
  const [proposal, setProposal] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadJobs = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoadingJobs(true);
        setError(null);

        const blockchainJobs = await getAllJobs(forceRefresh);

        // Filter only open jobs that the current user didn't create
        const openJobs = blockchainJobs
          .filter((job: any) => 
            job.status === JOB_STATUS.OPEN && 
            job.isOpen === true &&
            job.client !== currentAccount?.address
          )
          .map((job: any) => ({
            id: job.id,
            title: job.title || "Untitled Job",
            description: job.description || "No description provided",
            requirements: job.requirements || "",
            budget: job.milestoneAmount && job.totalMilestones
              ? (Number(job.milestoneAmount) * Number(job.totalMilestones)) / 1_000_000_000
              : 0,
            client: job.client,
            status: Number(job.status),
            totalMilestones: Number(job.totalMilestones) || 1,
            milestoneAmount: Number(job.milestoneAmount) || 0,
            deadlinePerMilestoneMs: Number(job.deadlinePerMilestoneMs) || 0,
            reviewPeriodMs: Number(job.reviewPeriodMs) || 0,
            createdAt: job.createdAt
              ? new Date(Number(job.createdAt)).toISOString().split("T")[0]
              : "Unknown",
            isOpen: job.isOpen,
          }));

        setJobs(openJobs);
      } catch (error) {
        setError(
          `Failed to load jobs: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [getAllJobs, currentAccount?.address]
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
    }
  }, [currentAccount?.address]);

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDeadlineDays = (ms: number) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    return `${days} days`;
  };

  const handleApply = async () => {
    if (!selectedJob || !proposal.trim()) {
      setNotification({
        type: "error",
        message: "Please write a proposal before applying",
      });
      return;
    }

    try {
      await applyForJob(selectedJob.id, proposal);
      setNotification({
        type: "success",
        message: "🎉 Application submitted! The client will review your proposal.",
      });
      setShowApplyModal(false);
      setSelectedJob(null);
      setProposal("");
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to apply",
      });
    }
  };

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

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔍 Find Jobs
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Browse open jobs and submit your proposals. Get hired by clients looking for talented freelancers.
        </p>
      </div>

      {/* Search & Refresh */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search jobs by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
          <button
            onClick={() => loadJobs(true)}
            disabled={isLoadingJobs}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
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
      </div>

      {/* Loading State */}
      {isLoadingJobs && (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900">
            Loading open jobs...
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

      {/* Not Connected State */}
      {!currentAccount && !isLoadingJobs && (
        <div className="card text-center py-16 bg-blue-50 border-blue-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600">
            Connect your wallet to browse jobs and submit applications.
          </p>
        </div>
      )}

      {/* Jobs Grid */}
      {!isLoadingJobs && !error && currentAccount && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="card hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => {
                setSelectedJob(job);
                setShowApplyModal(true);
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Open for Applications
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Posted by {formatAddress(job.client)} • {job.createdAt}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {job.budget.toFixed(2)} SUI
                  </div>
                  <div className="text-xs text-gray-500">
                    {job.totalMilestones} milestones
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {job.description}
              </p>

              {/* Requirements */}
              {job.requirements && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Requirements:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{job.requirements}</p>
                </div>
              )}

              {/* Deadline Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatDeadlineDays(job.deadlinePerMilestoneMs)}/milestone</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatDeadlineDays(job.reviewPeriodMs)} review</span>
                </div>
              </div>

              {/* Apply Button */}
              <button className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                Apply Now →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingJobs && !error && currentAccount && filteredJobs.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No open jobs available
          </h3>
          <p className="text-gray-600">
            Check back later for new job opportunities, or try a different search.
          </p>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Apply for Job
                  </h2>
                  <p className="text-gray-600">{selectedJob.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedJob(null);
                    setProposal("");
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  ✕
                </button>
              </div>

              {/* Job Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Budget:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {selectedJob.budget.toFixed(2)} SUI
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Milestones:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {selectedJob.totalMilestones}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Work Deadline:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatDeadlineDays(selectedJob.deadlinePerMilestoneMs)}/milestone
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Review Period:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatDeadlineDays(selectedJob.reviewPeriodMs)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proposal Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">
                    Your Proposal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={proposal}
                    onChange={(e) => setProposal(e.target.value)}
                    placeholder="Introduce yourself and explain why you're the best fit for this job. Include relevant experience, your approach, and timeline..."
                    className="input h-40 resize-none"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Write a compelling proposal to stand out from other applicants.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowApplyModal(false);
                      setSelectedJob(null);
                      setProposal("");
                    }}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={isLoading || !proposal.trim()}
                    className="flex-1 btn btn-primary"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenJobsMarketplace;
