"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import {
  useProgressiveEscrow,
  useJobRefresh,
} from "../hooks/useProgressiveEscrow";
import {
  JOB_STATUS,
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
} from "../config/constants";

interface Application {
  id: string;
  jobId: string;
  freelancer: string;
  proposal: string;
  bidAmount: number;
  appliedAt: string;
  status: number;
}

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: number;
  isOpen: boolean;
  totalMilestones: number;
}

const JobApplications = () => {
  const currentAccount = useCurrentAccount();
  const {
    getAllJobs,
    getJobApplications,
    acceptApplication,
    rejectApplication,
    isLoading,
  } = useProgressiveEscrow();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadJobs = useCallback(
    async (forceRefresh = false) => {
      if (!currentAccount?.address) return;

      try {
        setIsLoadingJobs(true);
        setError(null);

        const blockchainJobs = await getAllJobs(forceRefresh);

        // Filter only open jobs created by the current user
        const myOpenJobs = blockchainJobs
          .filter(
            (job: any) =>
              job.client === currentAccount.address &&
              (job.status === JOB_STATUS.OPEN || job.isOpen === true)
          )
          .map((job: any) => ({
            id: job.id,
            title: job.title || "Untitled Job",
            description: job.description || "No description",
            budget:
              job.milestoneAmount && job.totalMilestones
                ? (Number(job.milestoneAmount) * Number(job.totalMilestones)) /
                  1_000_000_000
                : 0,
            status: Number(job.status),
            isOpen: job.isOpen,
            totalMilestones: Number(job.totalMilestones) || 1,
          }));

        setJobs(myOpenJobs);

        // Auto-select first job if none selected
        if (myOpenJobs.length > 0 && !selectedJob) {
          setSelectedJob(myOpenJobs[0]);
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
    [getAllJobs, currentAccount?.address, selectedJob]
  );

  const loadApplications = useCallback(
    async (jobId: string) => {
      try {
        setIsLoadingApplications(true);
        const apps = await getJobApplications(jobId, true);
        setApplications(
          apps.map((app: any) => ({
            id: app.id,
            jobId: app.jobId,
            freelancer: app.freelancer,
            proposal: app.proposal || "No proposal provided",
            bidAmount: Number(app.bidAmount) / 1_000_000_000,
            appliedAt: app.appliedAt
              ? new Date(Number(app.appliedAt)).toLocaleDateString()
              : "Unknown",
            status: Number(app.status),
          }))
        );
      } catch (error) {
        console.error("Failed to load applications:", error);
      } finally {
        setIsLoadingApplications(false);
      }
    },
    [getJobApplications]
  );

  useJobRefresh(
    useCallback(() => {
      loadJobs(true);
      if (selectedJob) {
        loadApplications(selectedJob.id);
      }
    }, [loadJobs, selectedJob, loadApplications])
  );

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (currentAccount?.address) {
      loadJobs(true);
    }
  }, [currentAccount?.address]);

  useEffect(() => {
    if (selectedJob) {
      loadApplications(selectedJob.id);
    }
  }, [selectedJob, loadApplications]);

  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 10)}...${address.slice(-6)}`;
  };

  const handleAccept = async (application: Application) => {
    if (!selectedJob) return;
    try {
      await acceptApplication(selectedJob.id, application.id);
      setNotification({
        type: "success",
        message: `🎉 Freelancer accepted! ${formatAddress(application.freelancer)} is now assigned to this job.`,
      });
      // Reload everything
      loadJobs(true);
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to accept application",
      });
    }
  };

  const handleReject = async (application: Application) => {
    if (!selectedJob) return;
    try {
      await rejectApplication(selectedJob.id, application.id);
      setNotification({
        type: "success",
        message: "Application rejected.",
      });
      loadApplications(selectedJob.id);
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to reject application",
      });
    }
  };

  const getStatusBadge = (status: number) => {
    const colors: { [key: number]: string } = {
      [APPLICATION_STATUS.PENDING]: "bg-yellow-100 text-yellow-700",
      [APPLICATION_STATUS.ACCEPTED]: "bg-green-100 text-green-700",
      [APPLICATION_STATUS.REJECTED]: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
        {APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] || "Unknown"}
      </span>
    );
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const pendingApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.PENDING
  );

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
          📋 Review Applications
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Review proposals from freelancers and select the best candidate for your jobs.
        </p>
      </div>

      {/* Not Connected State */}
      {!currentAccount && (
        <div className="card text-center py-16 bg-blue-50 border-blue-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600">
            Connect your wallet to view applications to your jobs.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingJobs && (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900">Loading your jobs...</h3>
        </div>
      )}

      {/* No Open Jobs */}
      {!isLoadingJobs && currentAccount && jobs.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No open jobs
          </h3>
          <p className="text-gray-600 mb-4">
            You don't have any open jobs waiting for applications.
          </p>
          <p className="text-sm text-gray-500">
            Post a new job to start receiving applications from freelancers.
          </p>
        </div>
      )}

      {/* Main Content */}
      {!isLoadingJobs && currentAccount && jobs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Your Open Jobs</h2>
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`card cursor-pointer transition-all ${
                  selectedJob?.id === job.id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:border-gray-300"
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {job.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">
                    {job.budget.toFixed(2)} SUI
                  </span>
                  <span className="text-gray-500">
                    {job.totalMilestones} milestones
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Applications List */}
          <div className="lg:col-span-2 space-y-4">
            {selectedJob ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    Applications for: {selectedJob.title}
                  </h2>
                  <button
                    onClick={() => loadApplications(selectedJob.id)}
                    disabled={isLoadingApplications}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <svg
                      className={`w-4 h-4 ${isLoadingApplications ? "animate-spin" : ""}`}
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

                {isLoadingApplications && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                )}

                {!isLoadingApplications && applications.length === 0 && (
                  <div className="card text-center py-12 bg-gray-50">
                    <div className="text-4xl mb-2">📪</div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      No applications yet
                    </h3>
                    <p className="text-sm text-gray-600">
                      Freelancers will appear here when they apply.
                    </p>
                  </div>
                )}

                {!isLoadingApplications && applications.length > 0 && (
                  <div className="space-y-4">
                    {/* Pending Count */}
                    {pendingApplications.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        <strong>{pendingApplications.length}</strong> application(s) waiting for your review
                      </div>
                    )}

                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className={`card transition-all ${
                          app.status === APPLICATION_STATUS.PENDING
                            ? "border-yellow-200 bg-yellow-50/30"
                            : ""
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {formatAddress(app.freelancer)}
                              </span>
                              {getStatusBadge(app.status)}
                            </div>
                            <p className="text-sm text-gray-500">
                              Applied: {app.appliedAt}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {app.bidAmount.toFixed(2)} SUI
                            </div>
                            <p className="text-xs text-gray-500">Bid Amount</p>
                          </div>
                        </div>

                        {/* Proposal */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-gray-500 mb-1">Proposal:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {app.proposal}
                          </p>
                        </div>

                        {/* Actions */}
                        {app.status === APPLICATION_STATUS.PENDING && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReject(app)}
                              disabled={isLoading}
                              className="flex-1 btn btn-secondary"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleAccept(app)}
                              disabled={isLoading}
                              className="flex-1 btn btn-primary"
                            >
                              {isLoading ? "Processing..." : "Accept & Hire"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="card text-center py-12 bg-gray-50">
                <p className="text-gray-600">
                  Select a job from the left to view its applications.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobApplications;
