export const NETWORK_CONFIG = {
  MAINNET: "https://fullnode.mainnet.sui.io:443",
  TESTNET: "https://fullnode.testnet.sui.io:443",
  DEVNET: "https://fullnode.devnet.sui.io:443",
  LOCALNET: "http://127.0.0.1:9000",
} as const;

export const CONTRACT_CONFIG = {
  PACKAGE_ID:
    "0x54eb8e00613bb1c63f9581df45f9a9d8d9cf0bbf9089058ca378c5fffe62d742",

  MODULE_NAME: "progressive_escrow_v2",

  // Shared object IDs (created at deployment)
  ARBITER_REGISTRY_ID:
    "0xc8743783d6e8082765f9876e608470749d4c2d30e7622787c8e71eb3c4f900e4",

  FUNCTIONS: {
    // Job Functions
    POST_JOB: "post_job",
    CANCEL_JOB: "cancel_job",
    
    // Application Functions
    APPLY_FOR_JOB: "apply_for_job",
    ACCEPT_APPLICATION: "accept_application",
    REJECT_APPLICATION: "reject_application",
    
    // Work Functions
    START_WORK: "start_work",
    SUBMIT_WORK: "submit_work",
    
    // Review Functions
    APPROVE_MILESTONE: "approve_milestone",
    REJECT_MILESTONE: "reject_milestone",
    AUTO_APPROVE_IF_DEADLINE_PASSED: "auto_approve_if_deadline_passed",
    
    // Dispute Functions
    RAISE_DISPUTE: "raise_dispute",
    ARBITER_DECIDE: "arbiter_decide",
    
    // Arbiter Functions
    REGISTER_ARBITER: "register_arbiter",
  },
} as const;

// New Job Status for v2 (includes OPEN status)
export const JOB_STATUS = {
  OPEN: 0,       // Job is open for applications
  ASSIGNED: 1,   // Freelancer assigned, waiting to start
  WORKING: 2,    // Freelancer is working
  IN_REVIEW: 3,  // Milestone submitted for review
  REJECTED: 4,   // Client rejected work
  DISPUTED: 5,   // Waiting for arbiter decision
  COMPLETED: 6,  // All milestones done
  CANCELLED: 7,  // Job cancelled
} as const;

export const JOB_STATUS_LABELS = {
  [JOB_STATUS.OPEN]: "Open - Accepting Applications",
  [JOB_STATUS.ASSIGNED]: "Assigned - Waiting to Start",
  [JOB_STATUS.WORKING]: "In Progress",
  [JOB_STATUS.IN_REVIEW]: "Milestone Submitted",
  [JOB_STATUS.REJECTED]: "Revision Needed",
  [JOB_STATUS.DISPUTED]: "Dispute - Awaiting Arbiter",
  [JOB_STATUS.COMPLETED]: "Completed",
  [JOB_STATUS.CANCELLED]: "Cancelled",
} as const;

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
} as const;

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.PENDING]: "Pending Review",
  [APPLICATION_STATUS.ACCEPTED]: "Accepted",
  [APPLICATION_STATUS.REJECTED]: "Rejected",
} as const;

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

// Deadline defaults (in milliseconds)
export const DEADLINE_CONFIG = {
  DEFAULT_WORK_DEADLINE_MS: 7 * 24 * 60 * 60 * 1000,   // 7 days
  DEFAULT_REVIEW_DEADLINE_MS: 3 * 24 * 60 * 60 * 1000, // 3 days
  MIN_WORK_DEADLINE_MS: 1 * 24 * 60 * 60 * 1000,       // 1 day
  MAX_WORK_DEADLINE_MS: 90 * 24 * 60 * 60 * 1000,      // 90 days
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
  JOB_NOT_OPEN: "This job is not open for applications",
  ALREADY_APPLIED: "You have already applied for this job",
  DEADLINE_PASSED: "The deadline has passed",
} as const;

export const SUCCESS_MESSAGES = {
  JOB_POSTED: "Job posted successfully! Waiting for freelancer applications.",
  WORK_STARTED: "Work started! Good luck with the project!",
  MILESTONE_SUBMITTED: "Milestone submitted for review!",
  MILESTONE_APPROVED: "Milestone approved! Payment released.",
  MILESTONE_REJECTED: "Milestone rejected. Freelancer will revise.",
  DISPUTE_RAISED: "Dispute raised. A random arbiter has been assigned.",
  ARBITER_DECIDED: "Arbiter has made a decision.",
  JOB_CANCELLED: "Job cancelled. Funds returned.",
  APPLICATION_SUBMITTED: "Application submitted successfully!",
  APPLICATION_ACCEPTED: "Application accepted! Freelancer assigned.",
  APPLICATION_REJECTED: "Application rejected.",
  ARBITER_REGISTERED: "You are now registered as an arbiter!",
} as const;

export const DEFAULT_VALUES = {
  JOB_DURATION: 30, // 30 days default
  MILESTONES_COUNT: 3, // Default milestones
  ESCROW_PERCENTAGE: 100, // 100% of job value held in escrow
  DEADLINE_PER_MILESTONE_DAYS: 7, // 7 days per milestone
  REVIEW_PERIOD_DAYS: 3, // 3 days for client review
} as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];
export type JobStatusType = keyof typeof JOB_STATUS_LABELS;
export type ApplicationStatusType = keyof typeof APPLICATION_STATUS_LABELS;
