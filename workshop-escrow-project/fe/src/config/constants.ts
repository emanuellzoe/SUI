export const NETWORK_CONFIG = {
  MAINNET: "https://fullnode.mainnet.sui.io:443",
  TESTNET: "https://fullnode.testnet.sui.io:443",
  DEVNET: "https://fullnode.devnet.sui.io:443",
  LOCALNET: "http://127.0.0.1:9000",
} as const;

export const CONTRACT_CONFIG = {
  PACKAGE_ID:
    "0x47f0a281abb82cd2684113b06d037d7b873f318e91fefc1e5dc4d006f57b2c56",

  MODULE_NAME: "progressive_escrow",

  FUNCTIONS: {
    POST_JOB: "post_job",
    START_WORK: "start_work",
    SUBMIT_WORK: "submit_work",
    APPROVE_MILESTONE: "approve_milestone",
    REJECT_MILESTONE: "reject_milestone",
    RAISE_DISPUTE: "raise_dispute",
    ARBITER_DECIDE: "arbiter_decide",
    CANCEL_JOB: "cancel_job",
  },
} as const;

export const ARBITER_ADDRESS =
  "0x90cb8d57bd13f74ea9337dca1e270e51c6ce64f7fb78d571b73f2386ac91e534";

export const JOB_CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "Blockchain Development",
  "Data Science",
  "Digital Marketing",
  "Content Writing",
  "Video Editing",
  "Graphic Design",
  "Smart Contract Development",
  "Other",
] as const;

export const JOB_STATUS = {
  ASSIGNED: 0, // Job created with freelancer assigned
  WORKING: 1, // Freelancer is working
  IN_REVIEW: 2, // Milestone submitted for review
  REJECTED: 3, // Client rejected work
  DISPUTED: 4, // Waiting for arbiter decision
  COMPLETED: 5, // All milestones done
  CANCELLED: 6, // Job cancelled
} as const;

export const JOB_STATUS_LABELS = {
  [JOB_STATUS.ASSIGNED]: "Assigned - Waiting to Start",
  [JOB_STATUS.WORKING]: "In Progress",
  [JOB_STATUS.IN_REVIEW]: "Milestone Submitted",
  [JOB_STATUS.REJECTED]: "Revision Needed",
  [JOB_STATUS.DISPUTED]: "Dispute - Awaiting Arbiter",
  [JOB_STATUS.COMPLETED]: "Completed",
  [JOB_STATUS.CANCELLED]: "Cancelled",
} as const;

export const UI_CONFIG = {
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },

  ITEMS_PER_PAGE: 10,

  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [".pdf", ".doc", ".docx", ".txt", ".jpg", ".png", ".gif"],

  MIN_BID_AMOUNT: 1, // 1 SUI minimum
  MAX_BID_AMOUNT: 10000, // 10,000 SUI maximum
  MIN_DESCRIPTION_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;

export const ACCENT_COLORS = {
  BLUE: "#3B82F6",
  PURPLE: "#8B5CF6",
  PINK: "#EC4899",
  GREEN: "#10B981",
  YELLOW: "#F59E0B",
  RED: "#EF4444",
  ORANGE: "#F97316",
  CYAN: "#06B6D4",
} as const;

export const CURRENCY_CONFIG = {
  SYMBOL: "SUI",
  DECIMALS: 9, // SUI has 9 decimal places

  MIST_TO_SUI: 1_000_000_000,

  DISPLAY_DECIMALS: 4,
  MIN_DISPLAY_AMOUNT: 0.0001,
} as const;

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  TIMEOUT: 30000, // 30 seconds

  ENDPOINTS: {
    JOBS: "/jobs",
    PROPOSALS: "/proposals",
    USERS: "/users",
    TRANSACTIONS: "/transactions",
  },
} as const;

export const STORAGE_KEYS = {
  USER_PREFERENCES: "marketplace_user_preferences",
  WALLET_CONNECTION: "marketplace_wallet_connection",
  RECENT_JOBS: "marketplace_recent_jobs",
  DRAFT_PROPOSALS: "marketplace_draft_proposals",
} as const;

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet to continue",
  INSUFFICIENT_BALANCE: "Insufficient balance for this transaction",
  NETWORK_ERROR: "Network error. Please try again.",
  TRANSACTION_FAILED: "Transaction failed. Please try again.",
  INVALID_INPUT: "Please check your input and try again",
  UNAUTHORIZED: "You are not authorized to perform this action",
  JOB_NOT_FOUND: "Job not found",
  INVALID_FREELANCER_ADDRESS: "Invalid freelancer wallet address",
} as const;

export const SUCCESS_MESSAGES = {
  JOB_POSTED: "Job posted successfully!",
  WORK_STARTED: "Work started! Good luck with the project!",
  MILESTONE_SUBMITTED: "Milestone submitted for review!",
  MILESTONE_APPROVED: "Milestone approved! Payment released.",
  MILESTONE_REJECTED: "Milestone rejected. Freelancer will revise.",
  DISPUTE_RAISED: "Dispute raised. Awaiting arbiter decision.",
  ARBITER_DECIDED: "Arbiter has made a decision.",
  JOB_CANCELLED: "Job cancelled. Funds returned.",
} as const;

export const DEFAULT_VALUES = {
  JOB_DURATION: 30, // 30 days default
  MILESTONES_COUNT: 3, // Default milestones
  ESCROW_PERCENTAGE: 100, // 100% of job value held in escrow
} as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];
export type JobStatusType = keyof typeof JOB_STATUS_LABELS;
