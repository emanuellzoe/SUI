"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import { useProgressiveEscrow, useJobRefresh } from "../hooks/useProgressiveEscrow";
import { JOB_STATUS } from "../config/constants";

const ArbiterDashboard = () => {
  const currentAccount = useCurrentAccount();
  const {
    registerArbiter,
    getAllJobs,
    getUserActivity,
    arbiterDecide,
    isLoading,
  } = useProgressiveEscrow();

  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [disputedJobs, setDisputedJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const checkRegistrationStatus = useCallback(async () => {
    if (!currentAccount?.address) return;
    
    try {
      setIsCheckingStatus(true);
      const activity = await getUserActivity(currentAccount.address, true);
      setIsRegistered(activity.isArbiter || false);
      setDisputedJobs(activity.disputedJobs || []);
    } catch (error) {
      console.error("Failed to check arbiter status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [currentAccount?.address, getUserActivity]);

  const loadDisputedJobs = useCallback(async () => {
    if (!currentAccount?.address || !isRegistered) return;
    
    try {
      const allJobs = await getAllJobs(true);
      const myDisputes = allJobs.filter(
        (job: any) => 
          job.status === JOB_STATUS.DISPUTED && 
          job.arbiter === currentAccount.address
      );
      setDisputedJobs(myDisputes);
    } catch (error) {
      console.error("Failed to load disputed jobs:", error);
    }
  }, [currentAccount?.address, isRegistered, getAllJobs]);

  useJobRefresh(
    useCallback(() => {
      checkRegistrationStatus();
      loadDisputedJobs();
    }, [checkRegistrationStatus, loadDisputedJobs])
  );

  useEffect(() => {
    checkRegistrationStatus();
  }, [checkRegistrationStatus]);

  useEffect(() => {
    if (isRegistered) {
      loadDisputedJobs();
    }
  }, [isRegistered, loadDisputedJobs]);

  const handleRegister = async () => {
    try {
      await registerArbiter();
      setNotification({
        type: "success",
        message: "🎉 You are now registered as an arbiter! You will be randomly assigned to disputes.",
      });
      setIsRegistered(true);
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to register as arbiter",
      });
    }
  };

  const handleDecision = async (clientWins: boolean) => {
    if (!selectedJob) return;
    
    try {
      await arbiterDecide(selectedJob.id, clientWins);
      setNotification({
        type: "success",
        message: clientWins
          ? "Decision made: Client is right. Freelancer must revise."
          : "Decision made: Freelancer is right. Payment released.",
      });
      setSelectedJob(null);
      loadDisputedJobs();
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to make decision",
      });
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!currentAccount) {
    return (
      <div className="card text-center py-16 bg-purple-50 border-purple-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600">
          Connect your wallet to register as an arbiter.
        </p>
      </div>
    );
  }

  if (isCheckingStatus) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900">
          Checking arbiter status...
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg border max-w-md shadow-lg ${
            notification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2">✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚖️ Arbiter Dashboard
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          {isRegistered
            ? "Review disputes and make fair decisions to protect both clients and freelancers."
            : "Register as an arbiter to help resolve disputes on the platform."}
        </p>
      </div>

      {/* Not Registered - Registration Card */}
      {!isRegistered && (
        <div className="max-w-2xl mx-auto">
          <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <div className="text-center">
              <div className="text-6xl mb-4">⚖️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Become an Arbiter
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                As an arbiter, you will be randomly selected to resolve disputes between clients and freelancers. 
                Your decisions are final and help maintain trust in the platform.
              </p>
              
              <div className="bg-white rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Arbiter Responsibilities:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">✓</span>
                    Review disputed milestones fairly and impartially
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">✓</span>
                    Consider both client and freelancer perspectives
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">✓</span>
                    Make timely decisions to resolve conflicts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">✓</span>
                    You'll be randomly assigned to prevent collusion
                  </li>
                </ul>
              </div>

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="btn btn-primary px-8 py-4 text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering...
                  </div>
                ) : (
                  "Register as Arbiter"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registered - Disputes Dashboard */}
      {isRegistered && (
        <>
          {/* Status Banner */}
          <div className="card bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">⚖️</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">You are a Registered Arbiter</h2>
                  <p className="text-gray-600">You will be randomly assigned to disputes when they arise.</p>
                </div>
              </div>
              <div className="text-center bg-white rounded-lg px-6 py-3 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{disputedJobs.length}</div>
                <div className="text-sm text-gray-600">Pending Disputes</div>
              </div>
            </div>
          </div>

          {/* No Disputes */}
          {disputedJobs.length === 0 && (
            <div className="card text-center py-16 bg-gray-50">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No disputes assigned to you
              </h3>
              <p className="text-gray-600">
                When a dispute is raised and you're randomly selected, it will appear here.
              </p>
            </div>
          )}

          {/* Disputes List */}
          {disputedJobs.length > 0 && (
            <div className="grid gap-6">
              {disputedJobs.map((job: any) => (
                <div key={job.id} className="card border-purple-200 bg-purple-50/30">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Dispute - Decision Required
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-2">{job.title}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {((job.milestoneAmount * job.totalMilestones) / 1_000_000_000).toFixed(2)} SUI
                      </div>
                      <div className="text-sm text-gray-500">
                        Milestone {job.currentMilestone}/{job.totalMilestones}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Client:</span>
                      <span className="ml-2 font-mono text-gray-900">{formatAddress(job.client)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Freelancer:</span>
                      <span className="ml-2 font-mono text-gray-900">{formatAddress(job.freelancer)}</span>
                    </div>
                  </div>

                  {job.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <span className="text-red-700 font-medium">Client's Rejection Reason: </span>
                      <span className="text-gray-700">{job.rejectionReason}</span>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleDecision(true)}
                      disabled={isLoading}
                      className="flex-1 btn btn-secondary py-3"
                    >
                      {isLoading ? "Processing..." : "Client is Right (Revise)"}
                    </button>
                    <button
                      onClick={() => handleDecision(false)}
                      disabled={isLoading}
                      className="flex-1 btn btn-primary py-3"
                    >
                      {isLoading ? "Processing..." : "Freelancer is Right (Pay)"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArbiterDashboard;
