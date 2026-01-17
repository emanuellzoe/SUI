"use client";

import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG, ARBITER_ADDRESS } from "../config/constants";
import { useState, useRef, useCallback, useEffect } from "react";

import { CONTRACT_CONFIG } from "../config/constants";

export interface JobData {
  title: string;
  description: string;
  requirements: string;
  deadline: string;
  freelancerAddress: string;
  milestones: number;
  payment: number;
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

  const userActivityCache = useRef<{
    [key: string]: { data: any; timestamp: number; isLoading: boolean };
  }>({});

  const CACHE_DURATION = 30 * 1000; // Reduced to 30 seconds for more responsive updates

  const clearCache = useCallback(() => {
    jobsCache.current.data = null;
    jobsCache.current.timestamp = 0;
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

  const postJob = async (jobData: JobData) => {
    try {
      setIsLoading(true);

      if (!jobData.title || !jobData.description || !jobData.payment) {
        throw new Error("Title, description, and payment are required");
      }

      if (!jobData.freelancerAddress) {
        throw new Error("Freelancer address is required");
      }

      if (
        !jobData.freelancerAddress.startsWith("0x") ||
        jobData.freelancerAddress.length !== 66
      ) {
        throw new Error(
          "Invalid freelancer address format. Must be 66 characters starting with 0x"
        );
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

      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [paymentInMist]);

      const jobMetadata = {
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        deadline: jobData.deadline,
      };

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.POST_JOB}`,
        arguments: [
          tx.pure.address(jobData.freelancerAddress),
          tx.pure.u64(jobData.milestones),
          tx.pure.string(JSON.stringify(jobMetadata)),
          paymentCoin,
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

  const startWork = async (jobId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.START_WORK}`,
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

  const submitWork = async (jobId: string, milestoneDescription: string) => {
    try {
      setIsLoading(true);

      if (!milestoneDescription || milestoneDescription.trim() === "") {
        throw new Error("Milestone description is required");
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.SUBMIT_WORK}`,
        arguments: [tx.object(jobId), tx.pure.string(milestoneDescription)],
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

  const rejectMilestone = async (jobId: string, reason: string) => {
    try {
      setIsLoading(true);

      if (!reason || reason.trim() === "") {
        throw new Error("Rejection reason is required");
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.REJECT_MILESTONE}`,
        arguments: [tx.object(jobId), tx.pure.string(reason)],
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

  const raiseDispute = async (jobId: string) => {
    try {
      setIsLoading(true);

      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.FUNCTIONS.RAISE_DISPUTE}`,
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

        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::JobCreated`,
          },
          order: "descending",
          limit: 50,
        });

        const creationEvent = events.data.find((event) => {
          const eventData = event.parsedJson as any;
          return eventData.job_id === jobId;
        });

        return {
          objectData: result.data,
          fields: {
            ...fields,
            title: jobMetadata.title || "Untitled Job",
            description: jobMetadata.description || "No description available",
            requirements: jobMetadata.requirements || "",
            deadline: jobMetadata.deadline || "",
            rejection_reason: decodedRejectionReason,
            milestone_reports: milestoneReports,
          },
          creationEvent: creationEvent?.parsedJson,
          createdAt: creationEvent?.timestampMs,
        };
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  };

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
              freelancer: eventData.freelancer,
              totalPayment: eventData.total_payment,
              totalMilestones: eventData.total_milestones,
              createdAt: event.timestampMs,
              txDigest: event.id.txDigest,
            };

            if (jobObject && jobObject.content) {
              const fields = (jobObject.content as any).fields;

              const jobMetadata = parseJobMetadata(fields.description);

              const milestoneReports = (fields.milestone_reports || []).map(
                (report: any) => vectorU8ToString(report)
              );

              jobData = {
                ...jobData,
                title: jobMetadata.title || "Untitled Job",
                description:
                  jobMetadata.description || "No description available",
                requirements: jobMetadata.requirements || "",
                deadline: jobMetadata.deadline || "",
                status: fields.status,
                completedMilestones: fields.completed_milestones,
                currentMilestone: fields.current_milestone,
                milestoneAmount: fields.milestone_amount,
                arbiter: fields.arbiter,
                freelancer: fields.freelancer || jobData.freelancer,
                client: fields.client || jobData.client,
                remainingAmount: fields.remaining_amount,
                disputedMilestone: fields.disputed_milestone,
                rejectionReason: vectorU8ToString(fields.rejection_reason),
                milestoneReports: milestoneReports,
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
          isArbiter: userAddress === ARBITER_ADDRESS,
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

  return {
    postJob,
    cancelJob,

    startWork,
    submitWork,
    raiseDispute,

    approveMilestone,
    rejectMilestone,

    arbiterDecide,

    getJobDetails,
    getAllJobs,
    getUserActivity,

    clearCache,

    isLoading,
  };
};
