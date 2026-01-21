"use client";

import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG, DEADLINE_CONFIG } from "../config/constants";
import { useState, useRef, useCallback, useEffect } from "react";

// V2 Job Data - now supports open jobs with deadlines
export interface JobDataV2 {
  title: string;
  description: string;
  requirements: string;
  milestones: number;
  payment: number;
  deadlinePerMilestoneDays?: number; // Optional, defaults to 7 days
  reviewPeriodDays?: number;          // Optional, defaults to 3 days
}

// Application data for applying to jobs
export interface ApplicationData {
  proposal: string;
}

type RefreshCallback = () => void;
const refreshCallbacks = new Set<RefreshCallback>();

export const triggerGlobalRefresh = () => {
  refreshCallbacks.forEach((callback) => callback());
};

export const useJobRefresh = (callback: RefreshCallback) => {
  useEffect(() => {
    refreshCallbacks.add(callback);
    return () => {
      refreshCallbacks.delete(callback);
    };
  }, [callback]);
};

export const useProgressiveEscrow = () => {
  const { mutateAsync: signAndExecuteAsync } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);

  const jobsCache = useRef<{
    data: any[] | null;
    timestamp: number;
    isLoading: boolean;
  }>({
    data: null,
    timestamp: 0,
    isLoading: false,
  });

  const applicationsCache = useRef<{
    [jobId: string]: { data: any[]; timestamp: number; isLoading: boolean };
  }>({});

  const userActivityCache = useRef<{
    [key: string]: { data: any; timestamp: number; isLoading: boolean };
  }>({});

  const CACHE_DURATION = 30 * 1000; // 30 seconds

  const clearCache = useCallback(() => {
    jobsCache.current.data = null;
    jobsCache.current.timestamp = 0;
    Object.keys(applicationsCache.current).forEach((key) => {
      applicationsCache.current[key].data = [];
      applicationsCache.current[key].timestamp = 0;
    });
    Object.keys(userActivityCache.current).forEach((key) => {
      userActivityCache.current[key].data = null;
      userActivityCache.current[key].timestamp = 0;
    });
  }, []);

  const onTransactionSuccess = useCallback(() => {
    clearCache();
    setTimeout(() => {
      triggerGlobalRefresh();
    }, 1000);
  }, [clearCache]);

  const safeApiCall = async (
    apiCall: () => Promise<any>,
    retries = 3
  ): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await apiCall();
        return result;
      } catch (error: any) {
        if (i === retries - 1 || !error.message?.includes("CORS")) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const vectorU8ToString = (vectorU8: any): string => {
    if (!vectorU8 || !Array.isArray(vectorU8)) {
      return "";
    }
    try {
      return String.fromCharCode(...vectorU8);
    } catch (error) {
      return "";
    }
  };

  const parseJobMetadata = (descriptionBytes: any): any => {
    try {
      const jsonString = vectorU8ToString(descriptionBytes);
      if (jsonString) {
        return JSON.parse(jsonString);
      }
      return {};
    } catch (error) {
      return { description: vectorU8ToString(descriptionBytes) };
    }
  };

  // ============= ARBITER FUNCTIONS =============

  /**
   * Register the current wallet as an arbiter
   */
  const registerArbiter = async () => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.REGISTER_ARBITER}`,
        arguments: [tx.object(CONTRACT_CONFIG.ARBITER_REGISTRY_ID)],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // ============= JOB FUNCTIONS =============

  /**
   * Post an open job that freelancers can apply to
   * V2: No freelancer address needed - job is open for applications
   */
  const postJob = async (jobData: JobDataV2) => {
    try {
      setIsLoading(true);

      if (!jobData.title || !jobData.description || !jobData.payment) {
        throw new Error("Title, description, and payment are required");
      }

      if (jobData.payment <= 0) {
        throw new Error("Payment must be greater than 0");
      }

      if (jobData.milestones <= 0) {
        throw new Error("Milestones must be greater than 0");
      }

      const paymentInMist = Math.floor(jobData.payment * 1_000_000_000);

      if (paymentInMist <= 0) {
        throw new Error("Payment amount is too small");
      }

      // Convert days to milliseconds for deadlines
      const deadlineMs = (jobData.deadlinePerMilestoneDays || 7) * 24 * 60 * 60 * 1000;
      const reviewPeriodMs = (jobData.reviewPeriodDays || 3) * 24 * 60 * 60 * 1000;

      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [paymentInMist]);

      const jobMetadata = {
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
      };

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.POST_JOB}`,
        arguments: [
          tx.pure.u64(jobData.milestones),
          tx.pure.string(JSON.stringify(jobMetadata)),
          tx.pure.u64(deadlineMs),
          tx.pure.u64(reviewPeriodMs),
          paymentCoin,
          tx.object("0x6"), // Clock object
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Cancel a job (only if no work started)
   */
  const cancelJob = async (jobId: string, reason: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.CANCEL_JOB}`,
        arguments: [tx.object(jobId), tx.pure.string(reason || "")],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // ============= APPLICATION FUNCTIONS =============

  /**
   * Apply for an open job as a freelancer
   */
  const applyForJob = async (jobId: string, proposal: string) => {
    try {
      setIsLoading(true);

      if (!proposal || proposal.trim() === "") {
        throw new Error("Proposal is required");
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.APPLY_FOR_JOB}`,
        arguments: [
          tx.object(jobId),
          tx.pure.string(proposal),
          tx.object("0x6"), // Clock object
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Accept an application (client only)
   */
  const acceptApplication = async (jobId: string, applicationId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.ACCEPT_APPLICATION}`,
        arguments: [tx.object(jobId), tx.object(applicationId)],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Reject an application (client only)
   */
  const rejectApplication = async (jobId: string, applicationId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.REJECT_APPLICATION}`,
        arguments: [tx.object(jobId), tx.object(applicationId)],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // ============= WORK FUNCTIONS =============

  /**
   * Start work on an assigned job (with deadline tracking)
   */
  const startWork = async (jobId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.START_WORK}`,
        arguments: [
          tx.object(jobId),
          tx.object("0x6"), // Clock object for deadline tracking
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Submit milestone work (with review deadline tracking)
   */
  const submitWork = async (jobId: string, milestoneDescription: string) => {
    try {
      setIsLoading(true);

      if (!milestoneDescription || milestoneDescription.trim() === "") {
        throw new Error("Milestone description is required");
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.SUBMIT_WORK}`,
        arguments: [
          tx.object(jobId),
          tx.pure.string(milestoneDescription),
          tx.object("0x6"), // Clock object for review deadline
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // ============= REVIEW FUNCTIONS =============

  /**
   * Approve milestone (client only)
   */
  const approveMilestone = async (jobId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.APPROVE_MILESTONE}`,
        arguments: [tx.object(jobId)],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Reject milestone (client only, includes deadline for revision)
   */
  const rejectMilestone = async (jobId: string, reason: string) => {
    try {
      setIsLoading(true);

      if (!reason || reason.trim() === "") {
        throw new Error("Rejection reason is required");
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.REJECT_MILESTONE}`,
        arguments: [
          tx.object(jobId),
          tx.pure.string(reason),
          tx.object("0x6"), // Clock object
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Auto-approve if client review deadline has passed
   * Anyone can call this - protects freelancer from unresponsive clients
   */
  const autoApproveIfDeadlinePassed = async (jobId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.AUTO_APPROVE_IF_DEADLINE_PASSED}`,
        arguments: [
          tx.object(jobId),
          tx.object("0x6"), // Clock object
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // ============= DISPUTE FUNCTIONS =============

  /**
   * Raise a dispute (freelancer only, when milestone rejected)
   * V2: Arbiter is randomly selected from the ArbiterRegistry
   */
  const raiseDispute = async (jobId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.RAISE_DISPUTE}`,
        arguments: [
          tx.object(jobId),
          tx.object(CONTRACT_CONFIG.ARBITER_REGISTRY_ID),
          tx.object("0x8"), // Random object for random arbiter selection
        ],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  /**
   * Arbiter makes a decision on dispute
   */
  const arbiterDecide = async (jobId: string, clientWins: boolean) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.ARBITER_DECIDE}`,
        arguments: [tx.object(jobId), tx.pure.bool(clientWins)],
      });

      const result = await signAndExecuteAsync({ transaction: tx });
      onTransactionSuccess();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // ============= QUERY FUNCTIONS =============

  /**
   * Get job details with v2 fields (deadlines, open status, etc.)
   */
  const getJobDetails = async (jobId: string) => {
    try {
      const result = await suiClient.getObject({
        id: jobId,
        options: {
          showContent: true,
          showOwner: true,
          showType: true,
        },
      });

      if (result.data && result.data.content) {
        const fields = (result.data.content as any).fields;

        const jobMetadata = parseJobMetadata(fields.description);
        const decodedRejectionReason = vectorU8ToString(
          fields.rejection_reason
        );

        const milestoneReports = (fields.milestone_reports || []).map(
          (report: any) => vectorU8ToString(report)
        );

        return {
          objectData: result.data,
          fields: {
            ...fields,
            title: jobMetadata.title || "Untitled Job",
            description: jobMetadata.description || "No description available",
            requirements: jobMetadata.requirements || "",
            rejection_reason: decodedRejectionReason,
            milestone_reports: milestoneReports,
            // V2 fields
            is_open: fields.is_open,
            work_deadline: fields.work_deadline,
            review_deadline: fields.review_deadline,
            deadline_per_milestone_ms: fields.deadline_per_milestone_ms,
            review_period_ms: fields.review_period_ms,
            created_at: fields.created_at,
          },
        };
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get all jobs (with caching)
   */
  const getAllJobs = useCallback(
    async (forceRefresh = false) => {
      try {
        const now = Date.now();
        const cache = jobsCache.current;

        if (
          !forceRefresh &&
          cache.data &&
          now - cache.timestamp < CACHE_DURATION
        ) {
          return cache.data;
        }

        if (cache.isLoading) {
          while (cache.isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return cache.data || [];
        }

        cache.isLoading = true;

        const jobCreatedEvents = await safeApiCall(
          async () =>
            await suiClient.queryEvents({
              query: {
                MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::JobCreated`,
              },
              order: "descending",
              limit: 100,
            })
        );

        const jobs = [];

        for (const event of jobCreatedEvents.data) {
          try {
            const eventData = event.parsedJson as any;

            let jobObject = null;
            if (eventData.job_id) {
              try {
                const objectResponse = await safeApiCall(
                  async () =>
                    await suiClient.getObject({
                      id: eventData.job_id,
                      options: {
                        showContent: true,
                        showType: true,
                        showOwner: true,
                      },
                    })
                );
                jobObject = objectResponse.data;
              } catch (objErr) {}
            }

            let jobData: any = {
              id: eventData.job_id || event.id.txDigest,
              client: eventData.client,
              isOpen: eventData.is_open,
              totalPayment: eventData.total_payment,
              totalMilestones: eventData.total_milestones,
              deadlinePerMilestoneMs: eventData.deadline_per_milestone_ms,
              createdAt: event.timestampMs,
              txDigest: event.id.txDigest,
            };

            if (jobObject && jobObject.content) {
              const fields = (jobObject.content as any).fields;

              const jobMetadata = parseJobMetadata(fields.description);

              const milestoneReports = (fields.milestone_reports || []).map(
                (report: any) => vectorU8ToString(report)
              );

              // Handle Option<address> for freelancer
              const freelancerField = fields.freelancer;
              const freelancer = freelancerField && typeof freelancerField === 'object' 
                ? freelancerField.vec?.[0] || null 
                : freelancerField || null;

              // Handle Option<address> for arbiter
              const arbiterField = fields.arbiter;
              const arbiter = arbiterField && typeof arbiterField === 'object'
                ? arbiterField.vec?.[0] || null
                : arbiterField || null;

              jobData = {
                ...jobData,
                title: jobMetadata.title || "Untitled Job",
                description:
                  jobMetadata.description || "No description available",
                requirements: jobMetadata.requirements || "",
                status: fields.status,
                completedMilestones: fields.completed_milestones,
                currentMilestone: fields.current_milestone,
                milestoneAmount: fields.milestone_amount,
                arbiter,
                freelancer,
                client: fields.client || jobData.client,
                remainingAmount: fields.remaining_amount,
                disputedMilestone: fields.disputed_milestone,
                rejectionReason: vectorU8ToString(fields.rejection_reason),
                milestoneReports: milestoneReports,
                // V2 fields
                isOpen: fields.is_open,
                workDeadline: fields.work_deadline,
                reviewDeadline: fields.review_deadline,
                deadlinePerMilestoneMs: fields.deadline_per_milestone_ms,
                reviewPeriodMs: fields.review_period_ms,
                createdAtTimestamp: fields.created_at,
              };
            }

            jobs.push(jobData);
          } catch (err) {}
        }

        jobsCache.current.data = jobs;
        jobsCache.current.timestamp = now;
        jobsCache.current.isLoading = false;

        return jobs;
      } catch (error) {
        jobsCache.current.isLoading = false;
        throw error;
      }
    },
    [suiClient]
  );

  /**
   * Get applications for a specific job
   */
  const getJobApplications = useCallback(
    async (jobId: string, forceRefresh = false) => {
      try {
        const now = Date.now();
        const cache = applicationsCache.current[jobId];

        if (
          !forceRefresh &&
          cache &&
          now - cache.timestamp < CACHE_DURATION
        ) {
          return cache.data;
        }

        if (cache?.isLoading) {
          while (cache.isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return cache.data || [];
        }

        if (!applicationsCache.current[jobId]) {
          applicationsCache.current[jobId] = {
            data: [],
            timestamp: 0,
            isLoading: false,
          };
        }

        applicationsCache.current[jobId].isLoading = true;

        const applicationEvents = await safeApiCall(
          async () =>
            await suiClient.queryEvents({
              query: {
                MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::ApplicationSubmitted`,
              },
              order: "descending",
              limit: 100,
            })
        );

        const applications = [];

        for (const event of applicationEvents.data) {
          try {
            const eventData = event.parsedJson as any;
            
            // Filter for this job
            if (eventData.job_id !== jobId) continue;

            let applicationObject = null;
            if (eventData.application_id) {
              try {
                const objectResponse = await safeApiCall(
                  async () =>
                    await suiClient.getObject({
                      id: eventData.application_id,
                      options: {
                        showContent: true,
                        showType: true,
                        showOwner: true,
                      },
                    })
                );
                applicationObject = objectResponse.data;
              } catch (objErr) {}
            }

            let appData: any = {
              id: eventData.application_id,
              jobId: eventData.job_id,
              freelancer: eventData.freelancer,
              bidAmount: eventData.bid_amount,
              createdAt: event.timestampMs,
            };

            if (applicationObject && applicationObject.content) {
              const fields = (applicationObject.content as any).fields;
              appData = {
                ...appData,
                proposal: vectorU8ToString(fields.proposal),
                appliedAt: fields.applied_at,
                status: fields.status,
              };
            }

            applications.push(appData);
          } catch (err) {}
        }

        applicationsCache.current[jobId].data = applications;
        applicationsCache.current[jobId].timestamp = now;
        applicationsCache.current[jobId].isLoading = false;

        return applications;
      } catch (error) {
        if (applicationsCache.current[jobId]) {
          applicationsCache.current[jobId].isLoading = false;
        }
        throw error;
      }
    },
    [suiClient]
  );

  /**
   * Get user activity summary
   */
  const getUserActivity = useCallback(
    async (userAddress: string, forceRefresh = false) => {
      try {
        const now = Date.now();
        const cache = userActivityCache.current[userAddress];

        if (!forceRefresh && cache && now - cache.timestamp < CACHE_DURATION) {
          return cache.data;
        }

        if (cache?.isLoading) {
          while (cache.isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return cache.data || {};
        }

        if (!userActivityCache.current[userAddress]) {
          userActivityCache.current[userAddress] = {
            data: null,
            timestamp: 0,
            isLoading: false,
          };
        }

        userActivityCache.current[userAddress].isLoading = true;

        const allJobs = await getAllJobs(forceRefresh);

        const jobsAsClient = allJobs.filter(
          (job: any) => job.client === userAddress
        );
        const jobsAsFreelancer = allJobs.filter(
          (job: any) => job.freelancer === userAddress
        );

        // Check if user is a registered arbiter
        let isArbiter = false;
        try {
          const registryResponse = await suiClient.getObject({
            id: CONTRACT_CONFIG.ARBITER_REGISTRY_ID,
            options: { showContent: true },
          });
          if (registryResponse.data?.content) {
            const fields = (registryResponse.data.content as any).fields;
            const arbiters = fields.arbiters || [];
            isArbiter = arbiters.includes(userAddress);
          }
        } catch (err) {}

        // Get disputes where user is arbiter
        const disputedJobs = allJobs.filter(
          (job: any) => job.arbiter === userAddress && job.status === 5 // DISPUTED status
        );

        const milestoneEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::MilestoneApproved`,
          },
          order: "descending",
          limit: 100,
        });

        const userMilestones = milestoneEvents.data.filter((event) => {
          const eventData = event.parsedJson as any;
          return (
            eventData.client === userAddress ||
            eventData.freelancer === userAddress
          );
        });

        const result = {
          jobsAsClient,
          jobsAsFreelancer,
          disputedJobs,
          milestones: userMilestones,
          totalJobsPosted: jobsAsClient.length,
          totalJobsWorked: jobsAsFreelancer.length,
          totalEarnings: userMilestones.reduce((sum, event) => {
            const eventData = event.parsedJson as any;
            if (eventData.freelancer === userAddress) {
              return sum + (Number(eventData.payment_amount) || 0);
            }
            return sum;
          }, 0),
          isArbiter,
        };

        userActivityCache.current[userAddress].data = result;
        userActivityCache.current[userAddress].timestamp = now;
        userActivityCache.current[userAddress].isLoading = false;

        return result;
      } catch (error) {
        if (userActivityCache.current[userAddress]) {
          userActivityCache.current[userAddress].isLoading = false;
        }
        throw error;
      }
    },
    [suiClient, getAllJobs]
  );

  /**
   * Check if current time is past the review deadline (for auto-approve)
   */
  const isReviewDeadlinePassed = (reviewDeadline: number): boolean => {
    return Date.now() > reviewDeadline;
  };

  /**
   * Check if current time is past the work deadline
   */
  const isWorkDeadlinePassed = (workDeadline: number): boolean => {
    return Date.now() > workDeadline;
  };

  /**
   * Format deadline for display
   */
  const formatDeadline = (deadlineMs: number): string => {
    const now = Date.now();
    const diff = deadlineMs - now;
    
    if (diff <= 0) {
      return "Deadline passed";
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    
    return `${minutes}m remaining`;
  };

  return {
    // Arbiter functions
    registerArbiter,

    // Job functions
    postJob,
    cancelJob,

    // Application functions
    applyForJob,
    acceptApplication,
    rejectApplication,

    // Work functions
    startWork,
    submitWork,

    // Review functions
    approveMilestone,
    rejectMilestone,
    autoApproveIfDeadlinePassed,

    // Dispute functions
    raiseDispute,
    arbiterDecide,

    // Query functions
    getJobDetails,
    getAllJobs,
    getJobApplications,
    getUserActivity,

    // Utility functions
    clearCache,
    isReviewDeadlinePassed,
    isWorkDeadlinePassed,
    formatDeadline,

    isLoading,
  };
};
