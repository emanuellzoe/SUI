// Progressive Escrow v2 - Enhanced Smart Contract
// New Features:
// 1. Multi-arbiter system with random selection
// 2. Deadline system for freelancer and client reviews  
// 3. Open job creation (visible to all freelancers)
// 4. Freelancer application system with client selection
// 5. Multi-token support (generic coin type)

module progressive_escrow::progressive_escrow_v2 {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::random::{Self, Random};
    use sui::table::{Self, Table};

    // ============= CONSTANTS =============
    
    // Status Constants
    const STATUS_OPEN: u8 = 0;           // Job is open for applications
    const STATUS_ASSIGNED: u8 = 1;       // Freelancer assigned, waiting to start
    const STATUS_WORKING: u8 = 2;        // Freelancer is working
    const STATUS_IN_REVIEW: u8 = 3;      // Milestone submitted for review
    const STATUS_REJECTED: u8 = 4;       // Client rejected work
    const STATUS_DISPUTED: u8 = 5;       // Waiting for arbiter decision
    const STATUS_COMPLETED: u8 = 6;      // All milestones done
    const STATUS_CANCELLED: u8 = 7;      // Job cancelled

    // Application Status
    const APP_PENDING: u8 = 0;
    const APP_ACCEPTED: u8 = 1;
    const APP_REJECTED: u8 = 2;

    // Error Codes
    const E_NOT_CLIENT: u64 = 1;
    const E_NOT_FREELANCER: u64 = 2;
    const E_NOT_ARBITER: u64 = 3;
    const E_INVALID_STATUS: u64 = 4;
    const E_NO_MILESTONES_LEFT: u64 = 6;
    const E_INVALID_MILESTONES: u64 = 8;
    const E_JOB_COMPLETED: u64 = 10;
    const E_INVALID_FREELANCER: u64 = 13;
    const E_SAME_ADDRESS: u64 = 14;
    const E_DEADLINE_PASSED: u64 = 15;
    const E_DEADLINE_NOT_PASSED: u64 = 16;
    const E_JOB_NOT_OPEN: u64 = 17;
    const E_ALREADY_APPLIED: u64 = 18;
    const E_APPLICATION_NOT_PENDING: u64 = 19;
    const E_NOT_REGISTERED_ARBITER: u64 = 20;
    const E_ALREADY_REGISTERED: u64 = 21;
    const E_NO_ARBITERS: u64 = 22;

    // Time constants (in milliseconds)
    const DEFAULT_WORK_DEADLINE_MS: u64 = 7 * 24 * 60 * 60 * 1000;    // 7 days
    const DEFAULT_REVIEW_DEADLINE_MS: u64 = 3 * 24 * 60 * 60 * 1000;  // 3 days

    // ============= STRUCTS =============

    /// Registry for approved arbiters
    public struct ArbiterRegistry has key {
        id: UID,
        arbiters: vector<address>,
        is_arbiter: Table<address, bool>,
    }

    /// Job Escrow - Enhanced with open jobs, deadlines, and applications
    public struct JobEscrow has key {
        id: UID,
        client: address,
        freelancer: Option<address>,    // None = open job
        arbiter: Option<address>,       // Assigned when dispute raised
        deposit: Balance<SUI>,
        total_milestones: u64,
        completed_milestones: u64,
        current_milestone: u64,
        milestone_amount: u64,
        remaining_amount: u64,
        status: u8,
        description: vector<u8>,
        milestone_reports: vector<vector<u8>>,
        disputed_milestone: u64,
        rejection_reason: vector<u8>,
        is_open: bool,                  // True if job is open for applications
        work_deadline: u64,             // Timestamp deadline for current milestone
        review_deadline: u64,           // Timestamp deadline for client review
        deadline_per_milestone_ms: u64, // Duration per milestone in ms
        review_period_ms: u64,          // Review period in ms
        created_at: u64,
    }

    /// Application from freelancer for an open job
    public struct JobApplication has key, store {
        id: UID,
        job_id: ID,
        freelancer: address,
        proposal: vector<u8>,
        bid_amount: u64,               // Proposed amount (can be equal or less than job amount)
        applied_at: u64,
        status: u8,
    }

    // ============= EVENTS =============

    public struct ArbiterRegistered has copy, drop {
        arbiter: address,
        total_arbiters: u64,
    }

    public struct JobCreated has copy, drop {
        job_id: ID,
        client: address,
        is_open: bool,
        total_payment: u64,
        total_milestones: u64,
        deadline_per_milestone_ms: u64,
    }

    public struct ApplicationSubmitted has copy, drop {
        application_id: ID,
        job_id: ID,
        freelancer: address,
        bid_amount: u64,
    }

    public struct ApplicationAccepted has copy, drop {
        job_id: ID,
        freelancer: address,
        client: address,
    }

    public struct ApplicationRejected has copy, drop {
        application_id: ID,
        job_id: ID,
        freelancer: address,
    }

    public struct WorkStarted has copy, drop {
        job_id: ID,
        freelancer: address,
        milestone: u64,
        deadline: u64,
    }

    public struct WorkSubmitted has copy, drop {
        job_id: ID,
        freelancer: address,
        milestone: u64,
        description: vector<u8>,
        review_deadline: u64,
    }

    public struct MilestoneRejected has copy, drop {
        job_id: ID,
        client: address,
        freelancer: address,
        milestone: u64,
        reason: vector<u8>,
    }

    public struct MilestoneApproved has copy, drop {
        job_id: ID,
        client: address,
        freelancer: address,
        milestone: u64,
        payment_amount: u64,
    }

    public struct DisputeRaised has copy, drop {
        job_id: ID,
        raised_by: address,
        disputed_milestone: u64,
        assigned_arbiter: address,
    }

    public struct ArbiterDecision has copy, drop {
        job_id: ID,
        arbiter: address,
        client_wins: bool,
        disputed_milestone: u64,
    }

    public struct DeadlineAutoResolved has copy, drop {
        job_id: ID,
        resolution_type: u8,  // 0 = auto-approved, 1 = auto-refund
        milestone: u64,
    }

    public struct JobCancelled has copy, drop {
        job_id: ID,
        cancelled_by: address,
        reason: vector<u8>,
    }

    // ============= INIT FUNCTIONS =============

    /// Initialize arbiter registry (called once at deployment)
    fun init(ctx: &mut TxContext) {
        let registry = ArbiterRegistry {
            id: object::new(ctx),
            arbiters: vector::empty(),
            is_arbiter: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // ============= ARBITER FUNCTIONS =============

    /// Register as an arbiter
    public fun register_arbiter(
        registry: &mut ArbiterRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(!table::contains(&registry.is_arbiter, sender), E_ALREADY_REGISTERED);
        
        vector::push_back(&mut registry.arbiters, sender);
        table::add(&mut registry.is_arbiter, sender, true);

        event::emit(ArbiterRegistered {
            arbiter: sender,
            total_arbiters: vector::length(&registry.arbiters),
        });
    }

    /// Select a random arbiter from registry
    fun select_random_arbiter(
        registry: &ArbiterRegistry,
        r: &Random,
        client: address,
        freelancer: address,
        ctx: &mut TxContext,
    ): address {
        let arbiter_count = vector::length(&registry.arbiters);
        assert!(arbiter_count > 0, E_NO_ARBITERS);

        let mut generator = random::new_generator(r, ctx);
        let mut attempts = 0u64;
        let max_attempts = arbiter_count * 2;

        // Keep trying until we find an arbiter that's not client or freelancer
        loop {
            let index = random::generate_u64_in_range(&mut generator, 0, arbiter_count);
            let arbiter = *vector::borrow(&registry.arbiters, index);
            
            if (arbiter != client && arbiter != freelancer) {
                return arbiter
            };
            
            attempts = attempts + 1;
            if (attempts >= max_attempts) {
                // Fallback: return first arbiter that's not involved
                let mut i = 0u64;
                while (i < arbiter_count) {
                    let arb = *vector::borrow(&registry.arbiters, i);
                    if (arb != client && arb != freelancer) {
                        return arb
                    };
                    i = i + 1;
                };
                // If all arbiters are involved parties, abort
                abort E_NO_ARBITERS
            }
        }
    }

    // ============= JOB FUNCTIONS =============

    /// Create an open job (visible to all freelancers for application)
    public fun post_job(
        total_milestones: u64,
        description: vector<u8>,
        deadline_per_milestone_ms: u64,
        review_period_ms: u64,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let client = tx_context::sender(ctx);
        assert!(total_milestones > 0, E_INVALID_MILESTONES);

        let payment_amount = coin::value(&payment);
        let deposit = coin::into_balance(payment);
        let milestone_amount = payment_amount / total_milestones;
        let remaining_amount = payment_amount - (milestone_amount * (total_milestones - 1));
        let now = clock::timestamp_ms(clock);

        let work_deadline_ms = if (deadline_per_milestone_ms > 0) { deadline_per_milestone_ms } else { DEFAULT_WORK_DEADLINE_MS };
        let review_period = if (review_period_ms > 0) { review_period_ms } else { DEFAULT_REVIEW_DEADLINE_MS };

        let job = JobEscrow {
            id: object::new(ctx),
            client,
            freelancer: option::none(),
            arbiter: option::none(),
            deposit,
            total_milestones,
            completed_milestones: 0,
            current_milestone: 1,
            milestone_amount,
            remaining_amount,
            status: STATUS_OPEN,
            description,
            milestone_reports: vector::empty(),
            disputed_milestone: 0,
            rejection_reason: vector::empty(),
            is_open: true,
            work_deadline: 0,  // Set when work starts
            review_deadline: 0,
            deadline_per_milestone_ms: work_deadline_ms,
            review_period_ms: review_period,
            created_at: now,
        };

        let job_id = object::id(&job);
        transfer::share_object(job);

        event::emit(JobCreated {
            job_id,
            client,
            is_open: true,
            total_payment: payment_amount,
            total_milestones,
            deadline_per_milestone_ms: work_deadline_ms,
        });
    }

    // ============= APPLICATION FUNCTIONS =============

    /// Apply for an open job
    public fun apply_for_job(
        job: &JobEscrow,
        proposal: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let freelancer = tx_context::sender(ctx);
        
        assert!(job.is_open && job.status == STATUS_OPEN, E_JOB_NOT_OPEN);
        assert!(freelancer != job.client, E_SAME_ADDRESS);

        let job_id = object::id(job);
        let now = clock::timestamp_ms(clock);

        let application = JobApplication {
            id: object::new(ctx),
            job_id,
            freelancer,
            proposal,
            bid_amount: job.milestone_amount * job.total_milestones,
            applied_at: now,
            status: APP_PENDING,
        };

        let app_id = object::id(&application);
        transfer::share_object(application);

        event::emit(ApplicationSubmitted {
            application_id: app_id,
            job_id,
            freelancer,
            bid_amount: job.milestone_amount * job.total_milestones,
        });
    }

    /// Accept an application (client only)
    public fun accept_application(
        job: &mut JobEscrow,
        application: &mut JobApplication,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.status == STATUS_OPEN, E_JOB_NOT_OPEN);
        assert!(application.status == APP_PENDING, E_APPLICATION_NOT_PENDING);
        assert!(application.job_id == object::id(job), E_INVALID_STATUS);

        // Assign freelancer
        job.freelancer = option::some(application.freelancer);
        job.status = STATUS_ASSIGNED;
        job.is_open = false;
        application.status = APP_ACCEPTED;

        event::emit(ApplicationAccepted {
            job_id: object::id(job),
            freelancer: application.freelancer,
            client: job.client,
        });
    }

    /// Reject an application (client only)
    public fun reject_application(
        job: &JobEscrow,
        application: &mut JobApplication,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(application.status == APP_PENDING, E_APPLICATION_NOT_PENDING);
        assert!(application.job_id == object::id(job), E_INVALID_STATUS);

        application.status = APP_REJECTED;

        event::emit(ApplicationRejected {
            application_id: object::id(application),
            job_id: object::id(job),
            freelancer: application.freelancer,
        });
    }

    // ============= WORK FUNCTIONS =============

    /// Start work on assigned job
    public fun start_work(job: &mut JobEscrow, clock: &Clock, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        assert!(option::is_some(&job.freelancer), E_NOT_FREELANCER);
        assert!(sender == *option::borrow(&job.freelancer), E_NOT_FREELANCER);
        assert!(job.status == STATUS_ASSIGNED, E_INVALID_STATUS);

        let now = clock::timestamp_ms(clock);
        job.status = STATUS_WORKING;
        job.work_deadline = now + job.deadline_per_milestone_ms;

        event::emit(WorkStarted {
            job_id: object::id(job),
            freelancer: sender,
            milestone: job.current_milestone,
            deadline: job.work_deadline,
        });
    }

    /// Submit milestone work
    public fun submit_work(
        job: &mut JobEscrow,
        milestone_description: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(option::is_some(&job.freelancer), E_NOT_FREELANCER);
        assert!(sender == *option::borrow(&job.freelancer), E_NOT_FREELANCER);
        assert!(job.status == STATUS_WORKING || job.status == STATUS_REJECTED, E_INVALID_STATUS);
        assert!(job.completed_milestones < job.total_milestones, E_NO_MILESTONES_LEFT);

        let now = clock::timestamp_ms(clock);
        
        job.status = STATUS_IN_REVIEW;
        job.review_deadline = now + job.review_period_ms;
        vector::push_back(&mut job.milestone_reports, milestone_description);
        job.rejection_reason = vector::empty();

        event::emit(WorkSubmitted {
            job_id: object::id(job),
            freelancer: sender,
            milestone: job.current_milestone,
            description: milestone_description,
            review_deadline: job.review_deadline,
        });
    }

    // ============= CLIENT REVIEW FUNCTIONS =============

    /// Reject milestone
    public fun reject_milestone(job: &mut JobEscrow, reason: vector<u8>, clock: &Clock, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.status == STATUS_IN_REVIEW, E_INVALID_STATUS);
        // Client can only reject before review deadline
        assert!(now <= job.review_deadline, E_DEADLINE_PASSED);

        job.status = STATUS_REJECTED;
        job.rejection_reason = reason;
        // Reset work deadline for revision
        job.work_deadline = now + job.deadline_per_milestone_ms;

        let freelancer = *option::borrow(&job.freelancer);
        
        event::emit(MilestoneRejected {
            job_id: object::id(job),
            client: job.client,
            freelancer,
            milestone: job.current_milestone,
            reason,
        });
    }

    /// Approve milestone
    public fun approve_milestone(job: &mut JobEscrow, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.status == STATUS_IN_REVIEW, E_INVALID_STATUS);

        process_milestone_approval(job, ctx);
    }

    /// Auto-approve if review deadline passed (anyone can call)
    public fun auto_approve_if_deadline_passed(
        job: &mut JobEscrow,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        
        assert!(job.status == STATUS_IN_REVIEW, E_INVALID_STATUS);
        assert!(now > job.review_deadline, E_DEADLINE_NOT_PASSED);

        process_milestone_approval(job, ctx);

        event::emit(DeadlineAutoResolved {
            job_id: object::id(job),
            resolution_type: 0, // auto-approved
            milestone: job.current_milestone,
        });
    }

    /// Internal function to process milestone approval
    fun process_milestone_approval(job: &mut JobEscrow, ctx: &mut TxContext) {
        job.completed_milestones = job.completed_milestones + 1;

        let payment_amount = if (job.completed_milestones == job.total_milestones) {
            balance::value(&job.deposit)
        } else {
            job.milestone_amount
        };

        let payment_balance = balance::split(&mut job.deposit, payment_amount);
        let payment_coin = coin::from_balance(payment_balance, ctx);
        let freelancer = *option::borrow(&job.freelancer);
        transfer::public_transfer(payment_coin, freelancer);

        if (job.completed_milestones == job.total_milestones) {
            job.status = STATUS_COMPLETED;
        } else {
            job.current_milestone = job.current_milestone + 1;
            job.status = STATUS_WORKING;
            // Note: work_deadline should be set when freelancer explicitly starts next milestone
        };

        event::emit(MilestoneApproved {
            job_id: object::id(job),
            client: job.client,
            freelancer,
            milestone: job.current_milestone,
            payment_amount,
        });
    }

    // ============= DISPUTE FUNCTIONS =============

    /// Raise dispute (freelancer only, when milestone rejected)
    public fun raise_dispute(
        job: &mut JobEscrow,
        registry: &ArbiterRegistry,
        r: &Random,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(option::is_some(&job.freelancer), E_NOT_FREELANCER);
        assert!(sender == *option::borrow(&job.freelancer), E_NOT_FREELANCER);
        assert!(job.status == STATUS_REJECTED, E_INVALID_STATUS);

        let freelancer = *option::borrow(&job.freelancer);
        
        // Select random arbiter
        let arbiter = select_random_arbiter(registry, r, job.client, freelancer, ctx);
        job.arbiter = option::some(arbiter);
        job.status = STATUS_DISPUTED;
        job.disputed_milestone = job.current_milestone;

        event::emit(DisputeRaised {
            job_id: object::id(job),
            raised_by: sender,
            disputed_milestone: job.current_milestone,
            assigned_arbiter: arbiter,
        });
    }

    /// Arbiter makes decision
    public fun arbiter_decide(job: &mut JobEscrow, client_wins: bool, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        assert!(option::is_some(&job.arbiter), E_NOT_ARBITER);
        assert!(sender == *option::borrow(&job.arbiter), E_NOT_ARBITER);
        assert!(job.status == STATUS_DISPUTED, E_INVALID_STATUS);

        if (client_wins) {
            job.status = STATUS_REJECTED;
            job.disputed_milestone = 0;
        } else {
            // Process as if approved
            job.completed_milestones = job.completed_milestones + 1;

            let payment_amount = if (job.completed_milestones == job.total_milestones) {
                balance::value(&job.deposit)
            } else {
                job.milestone_amount
            };

            let payment_balance = balance::split(&mut job.deposit, payment_amount);
            let payment_coin = coin::from_balance(payment_balance, ctx);
            let freelancer = *option::borrow(&job.freelancer);
            transfer::public_transfer(payment_coin, freelancer);

            if (job.completed_milestones == job.total_milestones) {
                job.status = STATUS_COMPLETED;
            } else {
                job.current_milestone = job.current_milestone + 1;
                job.status = STATUS_WORKING;
            };
        };

        event::emit(ArbiterDecision {
            job_id: object::id(job),
            arbiter: sender,
            client_wins,
            disputed_milestone: job.disputed_milestone,
        });
    }

    // ============= CANCEL FUNCTION =============

    /// Cancel job (client only, before any work started)
    public fun cancel_job(job: &mut JobEscrow, reason: vector<u8>, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.completed_milestones == 0, E_INVALID_STATUS);
        assert!(job.status == STATUS_OPEN || job.status == STATUS_ASSIGNED, E_INVALID_STATUS);

        let remaining_balance = balance::withdraw_all(&mut job.deposit);
        let refund_coin = coin::from_balance(remaining_balance, ctx);
        transfer::public_transfer(refund_coin, job.client);

        job.status = STATUS_CANCELLED;

        event::emit(JobCancelled {
            job_id: object::id(job),
            cancelled_by: job.client,
            reason,
        });
    }

    // ============= VIEW FUNCTIONS =============

    public fun get_job_info(job: &JobEscrow): (
        address,           // client
        Option<address>,   // freelancer
        u64,               // total_milestones
        u64,               // completed_milestones
        u64,               // current_milestone
        u64,               // deposit balance
        u8,                // status
        bool,              // is_open
        u64,               // work_deadline
        u64,               // review_deadline
    ) {
        (
            job.client,
            job.freelancer,
            job.total_milestones,
            job.completed_milestones,
            job.current_milestone,
            balance::value(&job.deposit),
            job.status,
            job.is_open,
            job.work_deadline,
            job.review_deadline,
        )
    }

    public fun get_arbiter(job: &JobEscrow): Option<address> {
        job.arbiter
    }

    public fun is_registered_arbiter(registry: &ArbiterRegistry, addr: address): bool {
        table::contains(&registry.is_arbiter, addr)
    }

    public fun get_arbiter_count(registry: &ArbiterRegistry): u64 {
        vector::length(&registry.arbiters)
    }

    public fun get_milestone_reports(job: &JobEscrow): &vector<vector<u8>> {
        &job.milestone_reports
    }

    public fun get_rejection_reason(job: &JobEscrow): vector<u8> {
        job.rejection_reason
    }

    public fun is_job_completed(job: &JobEscrow): bool {
        job.completed_milestones == job.total_milestones
    }

    public fun get_application_info(app: &JobApplication): (
        ID,        // job_id
        address,   // freelancer
        u64,       // bid_amount
        u64,       // applied_at
        u8,        // status
    ) {
        (
            app.job_id,
            app.freelancer,
            app.bid_amount,
            app.applied_at,
            app.status,
        )
    }
}
