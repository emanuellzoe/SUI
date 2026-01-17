"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { useProgressiveEscrow } from "../hooks/useProgressiveEscrow";

interface JobSummary {
  id: string;
  client: string;
  freelancer: string;
  title: string;
  description: string;
  status: number;
  completed_milestones: number;
  total_milestones: number;
  balance: number;
  proposals: any[];
  created_at: number;
}

const JobExplorer = () => {
  const currentAccount = useCurrentAccount();
  const { getAllJobs, getUserActivity, submitWork, isLoading } =
    useProgressiveEscrow();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSubmitForm, setShowSubmitForm] = useState<string | null>(null);
  const [submissionDescription, setSubmissionDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadMyJobs = async () => {
      if (!currentAccount) return;

      try {
        setIsLoadingJobs(true);
        setError(null);

        const allJobs = await getAllJobs();

        const myFreelancerJobs = allJobs
          .filter((job: any) => job.freelancer === currentAccount.address)
          .map((job: any, index: number) => ({
            id: job.id || `job_${index}`,
            client: job.client || "Unknown",
            freelancer: job.freelancer || currentAccount.address,
            title:
              job.description?.substring(0, 50) + "..." || `Job #${index + 1}`,
            description: job.description || "No description provided",
            status: Number(job.status) || 0,
            completed_milestones: Number(job.completedMilestones) || 0,
            total_milestones: Number(job.totalMilestones) || 1,
            balance: job.milestoneAmount
              ? Number(job.milestoneAmount) / 1000000000
              : 0, // Convert MIST to SUI
            proposals: [],
            created_at: Date.now() - 86400000 * Math.floor(Math.random() * 30), // Random within 30 days
          }));

                setJobs(myFreelancerJobs);
      } catch (error) {
                setError(
          `Failed to load jobs: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoadingJobs(false);
      }
    };

    if (currentAccount) {
      loadMyJobs();
    }
  }, [currentAccount, getAllJobs]);

  const getStatusLabel = (status: number): string => {
    switch (status) {
      case 0:
        return "Open";
      case 1:
        return "Reviewing";
      case 2:
        return "Assigned";
      case 3:
        return "In Progress";
      case 4:
        return "Review";
      case 5:
        return "Disputed";
      case 6:
        return "Completed";
      case 7:
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const getStatusStyle = (status: number): string => {
    switch (status) {
      case 0:
        return "status-pending";
      case 1:
        return "status-review";
      case 2:
        return "status-accepted";
      case 3:
        return "status-working";
      case 4:
        return "status-review";
      case 5:
        return "status-disputed";
      case 6:
        return "status-completed";
      case 7:
        return "status-cancelled";
      default:
        return "status-pending";
    }
  };

  const getUserRole = (job: JobSummary): string => {
    if (!currentAccount) return "None";
    if (job.client === currentAccount.address) return "Client";
    if (job.freelancer === currentAccount.address) return "Freelancer";

    const hasProposal = job.proposals.some(
      (proposal: any) => proposal.freelancer === currentAccount.address
    );
    if (hasProposal) return "Applicant";

    return "Observer";
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
          }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Recently";
  };

  const handleSubmitWork = async (jobId: string) => {
    if (!submissionDescription.trim()) {
      alert("Please enter a description of your completed work");
      return;
    }

    try {
      setIsSubmitting(true);

      await submitWork(jobId, submissionDescription);

      alert("✅ Milestone submitted successfully!");
      setShowSubmitForm(null);
      setSubmissionDescription("");

      window.location.reload();
    } catch (error) {
            alert(
        `Failed to submit work: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">My Jobs</h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Connect your wallet to view your jobs
        </p>
      </div>
    );
  }

  if (isLoadingJobs) {
    return (
      <div className="text-center py-16">
        <div className="loading-spinner mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Loading Jobs...
        </h3>
        <p className="text-gray-600 text-sm">Fetching data from blockchain</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-red-600 mb-2">
          Error Loading Jobs
        </h3>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-secondary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">My Jobs</h2>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connected Account</p>
              <p className="text-sm text-gray-900 font-mono mt-1">
                {currentAccount.address.slice(0, 12)}...
                {currentAccount.address.slice(-8)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {jobs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {jobs.filter((job) => getUserRole(job) === "Client").length}
          </div>
          <div className="text-gray-600 text-sm mt-1">Posted</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {jobs.filter((job) => getUserRole(job) === "Freelancer").length}
          </div>
          <div className="text-gray-600 text-sm mt-1">Active</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {jobs.filter((job) => getUserRole(job) === "Applicant").length}
          </div>
          <div className="text-gray-600 text-sm mt-1">Applied</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-success">
            {jobs.filter((job) => job.status === 6).length}
          </div>
          <div className="text-gray-600 text-sm mt-1">Completed</div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Job Activity</h3>
          <div className="text-sm text-gray-500">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              No Jobs Found
            </h4>
            <p className="text-gray-600 text-sm mb-4">
              You haven't taken any jobs yet.
            </p>
            <button
              onClick={() => (window.location.href = "/?tab=marketplace")}
              className="btn btn-primary"
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
              >
                {/* Job Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(
                          job.status
                        )}`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {getUserRole(job)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>ID: {formatAddress(job.id)}</span>
                      <span>{formatTimeAgo(job.created_at)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {job.balance} SUI
                    </div>
                    <div className="text-sm text-gray-500">
                      {job.completed_milestones}/{job.total_milestones}{" "}
                      milestones
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <p className="text-gray-700 mb-4 text-sm">{job.description}</p>

                {/* Progress Bar */}
                {job.total_milestones > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-gray-600">
                        {(
                          (job.completed_milestones / job.total_milestones) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (job.completed_milestones / job.total_milestones) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Job Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(job.id, job.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      {copiedId === job.id ? "Copied" : "Copy ID"}
                    </button>

                    {getUserRole(job) === "Client" && job.status === 1 && (
                      <button className="btn btn-primary btn-sm">
                        Review Proposals
                      </button>
                    )}

                    {getUserRole(job) === "Freelancer" && job.status === 3 && (
                      <button
                        onClick={() => setShowSubmitForm(job.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Submit Milestone
                      </button>
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    Role:{" "}
                    <span className="text-gray-900 font-medium">
                      {getUserRole(job)}
                    </span>
                  </div>
                </div>

                {/* Submission Form Modal */}
                {showSubmitForm === job.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-gray-900">
                        Submit Milestone Work
                      </h4>
                      <button
                        onClick={() => {
                          setShowSubmitForm(null);
                          setSubmissionDescription("");
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">
                          Work Description
                        </label>
                        <textarea
                          value={submissionDescription}
                          onChange={(e) =>
                            setSubmissionDescription(e.target.value)
                          }
                          placeholder="Describe the work you've completed for this milestone..."
                          className="input h-32"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmitWork(job.id)}
                          disabled={
                            isSubmitting || !submissionDescription.trim()
                          }
                          className="btn btn-primary flex-1"
                        >
                          {isSubmitting ? "Submitting..." : "Submit Work"}
                        </button>
                        <button
                          onClick={() => {
                            setShowSubmitForm(null);
                            setSubmissionDescription("");
                          }}
                          disabled={isSubmitting}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobExplorer;
