
module progressive_escrow::progressive_escrow {
    // import modul" SUI yang dibutuhkan
    
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    
    // Hardcoded walelt addressnya juri
    const ARBITER: address = @0xf041a6d2d141a2b6f39591aac151390fe23953e04940d64bf20a583ce9ed2186;
    
    // Status Constants
    const ASSIGNED: u8 = 0;           // Job telah dibuat, freelancer sudah di assign
    const WORKING: u8 = 1;            // Freelancer sedang mengerjakan milestone terkini
    const IN_REVIEW: u8 = 2;          // Kerjaan di milestone tertentu sudah disubmit freelancer dan menunggu reviewnya client 
    const REJECTED: u8 = 3;           // Client menolak hasil kerjaan freelancer di milestone tertentu, freelancer bisa langsung revisi atau ajukan banding
    const DISPUTED: u8 = 4;           // Banding (dispute) diajukan, menunggu keputusannya juri
    const COMPLETED: u8 = 5;          // Semua milestone telah terpenuhi
    const CANCELLED: u8 = 6;          // Job di cancel
    
    // Error Code
    const E_NOT_CLIENT: u64 = 1;
    const E_NOT_FREELANCER: u64 = 2;
    const E_NOT_ARBITER: u64 = 3;
    const E_INVALID_STATUS: u64 = 4;
    const E_NO_MILESTONES_LEFT: u64 = 6;
    const E_INVALID_MILESTONES: u64 = 8;
    const E_JOB_COMPLETED: u64 = 10;
    const E_INVALID_FREELANCER: u64 = 13;
    const E_SAME_ADDRESS: u64 = 14;
    const E_DISPUTE_ALREADY_RESOLVED: u64 = 15; // Arbiter already decided for this milestone

    // Structs
    public struct JobCreated has copy, drop {
        job_id: ID,
        client: address,
        freelancer: address,
        total_payment: u64,
        total_milestones: u64,
    }
    
    public struct WorkStarted has copy, drop {
        job_id: ID,
        freelancer: address,
        milestone: u64,
    }
    
    public struct WorkSubmitted has copy, drop {
        job_id: ID,
        freelancer: address,
        milestone: u64,
        description: vector<u8>,
    }
    
    public struct MilestoneApproved has copy, drop {
        job_id: ID,
        client: address,
        freelancer: address,
        milestone: u64,
        payment_amount: u64,
    }
    
    public struct MilestoneRejected has copy, drop {
        job_id: ID,
        client: address,
        freelancer: address,
        milestone: u64,
        reason: vector<u8>,
    }
    
    public struct DisputeRaised has copy, drop {
        job_id: ID,
        raised_by: address,
        disputed_milestone: u64,
    }
    
    public struct ArbiterDecision has copy, drop {
        job_id: ID,
        arbiter: address,
        client_wins: bool,
        disputed_milestone: u64,
    }
    
    public struct JobCancelled has copy, drop {
        job_id: ID,
        cancelled_by: address,
        reason: vector<u8>,
    }

    public struct JobEscrow has key {
        id: UID,
        client: address,
        freelancer: address,              // Assigned at creation time
        arbiter: address,                 // Hardcoded arbiter for disputes
        deposit: Balance<SUI>,            // Money vault
        total_milestones: u64,            // Total number of milestones
        completed_milestones: u64,        // Number of completed milestones
        current_milestone: u64,           // Current milestone being worked on (1-based)
        milestone_amount: u64,            // Amount per milestone
        remaining_amount: u64,            // Remaining amount for final milestone
        status: u8,                       // Current job status
        description: vector<u8>,          // Job description
        milestone_reports: vector<vector<u8>>, // Descriptions submitted by freelancer for each milestone
        disputed_milestone: u64,          // Which milestone is being disputed (0 = none)
        rejection_reason: vector<u8>,     // Reason for last rejection
        dispute_resolved: bool,           // True if arbiter decided for client on current milestone (cannot dispute again)
    }

    // Client membuat job baru dan langsung assign wallet addressnya freelancer
    public fun post_job(
        freelancer: address,
        total_milestones: u64,
        description: vector<u8>,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let client = tx_context::sender(ctx);
        
        assert!(total_milestones > 0, E_INVALID_MILESTONES);
        assert!(freelancer != @0x0, E_INVALID_FREELANCER);
        assert!(freelancer != client, E_SAME_ADDRESS); 
        
        let payment_amount = coin::value(&payment);
        let deposit = coin::into_balance(payment);
        
        let milestone_amount = payment_amount / total_milestones;
        let remaining_amount = payment_amount - (milestone_amount * (total_milestones - 1));
        
        let job = JobEscrow {
            id: object::new(ctx),
            client,
            freelancer,
            arbiter: ARBITER,  
            deposit,
            total_milestones,
            completed_milestones: 0,
            current_milestone: 1,
            milestone_amount,
            remaining_amount,
            status: ASSIGNED,  
            description,
            milestone_reports: vector::empty(),
            disputed_milestone: 0,
            rejection_reason: vector::empty(),
            dispute_resolved: false,
        };
        
        event::emit(JobCreated {
            job_id: object::id(&job),
            client,
            freelancer,
            total_payment: payment_amount,
            total_milestones,
        });
        
        transfer::share_object(job);
    }

    // Freelancer nge start kerjaannya (ASSIGNED-> WORKING)
    public fun start_work(job: &mut JobEscrow, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(sender == job.freelancer, E_NOT_FREELANCER);
        assert!(job.status == ASSIGNED, E_INVALID_STATUS);
        
        job.status = WORKING;
        
        event::emit(WorkStarted {
            job_id: object::id(job),
            freelancer: sender,
            milestone: job.current_milestone,
        });
    }
    
    // Freelancer nge submit kerjaannya (sesuai dengan milestone terkininya) (WORKING -> IN_REVIEW)
    public fun submit_work(
        job: &mut JobEscrow, 
        milestone_description: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == job.freelancer, E_NOT_FREELANCER);
        assert!(job.status == WORKING || job.status == REJECTED, E_INVALID_STATUS);
        assert!(job.completed_milestones < job.total_milestones, E_NO_MILESTONES_LEFT);
        assert!(job.status != COMPLETED, E_JOB_COMPLETED);
        
        job.status = IN_REVIEW;
        
        vector::push_back(&mut job.milestone_reports, milestone_description);
        
        job.rejection_reason = vector::empty();
        
        event::emit(WorkSubmitted {
            job_id: object::id(job),
            freelancer: job.freelancer,
            milestone: job.current_milestone,
            description: milestone_description,
        });
    }

    // Client nge-approve pekerjaan yang di submit oleh freelancer di milestone tertentu (IN_REVIEW -> WORKING / COMPLETED)
    public fun approve_milestone(job: &mut JobEscrow, ctx: &mut TxContext) {
        assert!(tx_context::sender(ctx) == job.client, E_NOT_CLIENT);
        assert!(job.status == IN_REVIEW, E_INVALID_STATUS);
        
        job.completed_milestones = job.completed_milestones + 1;
        
        let payment_amount = if (job.completed_milestones == job.total_milestones) {
            balance::value(&job.deposit)
        } else {
            job.milestone_amount
        };
        
        let payment_balance = balance::split(&mut job.deposit, payment_amount);
        let payment_coin = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(payment_coin, job.freelancer);
        
        event::emit(MilestoneApproved {
            job_id: object::id(job),
            client: job.client,
            freelancer: job.freelancer,
            milestone: job.completed_milestones,
            payment_amount,
        });
        
        if (job.completed_milestones == job.total_milestones) {
            job.status = COMPLETED;
        } else {
            job.current_milestone = job.current_milestone + 1;
            job.status = WORKING;
        };
    }
    
    // Client men-decline pekerjaan yang di submit oleh freelancer di milestone tertentu (IN_REVIEW -> REJECTED)
    public fun reject_milestone(job: &mut JobEscrow, reason: vector<u8>, ctx: &mut TxContext) {
        assert!(tx_context::sender(ctx) == job.client, E_NOT_CLIENT);
        assert!(job.status == IN_REVIEW, E_INVALID_STATUS);
        
        job.rejection_reason = reason;
        job.status = REJECTED;
        
        event::emit(MilestoneRejected {
            job_id: object::id(job),
            client: job.client,
            freelancer: job.freelancer,
            milestone: job.current_milestone,
            reason,
        });
    }

    // Freelancer mengajukan banding(dispute) (REJECTED -> DISPUTED)
    public fun raise_dispute(job: &mut JobEscrow, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(sender == job.freelancer, E_NOT_FREELANCER);
        assert!(job.status == REJECTED, E_INVALID_STATUS); // Can only dispute when rejected
        assert!(!job.dispute_resolved, E_DISPUTE_ALREADY_RESOLVED); // Cannot dispute again after arbiter decided
        
        job.status = DISPUTED;
        job.disputed_milestone = job.current_milestone;
        
        event::emit(DisputeRaised {
            job_id: object::id(job),
            raised_by: sender,
            disputed_milestone: job.current_milestone,
        });
    }
    
    // Juri menentukan siapa yang menang dalam banding tersebut 
    // 1. Apabila yang menang adalah client, maka statusnya (DISPUTED -> REJECTED) 
    // 2. Apabila yang menang adalah freelancer, maka statusnya (DISPTUED -> WORKING / COMPLETED) 
    public fun arbiter_decide(
        job: &mut JobEscrow, 
        client_wins: bool, 
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(job.status == DISPUTED, E_INVALID_STATUS);
        assert!(sender == job.arbiter, E_NOT_ARBITER);
        
        event::emit(ArbiterDecision {
            job_id: object::id(job),
            arbiter: sender,
            client_wins,
            disputed_milestone: job.disputed_milestone,
        });
        
        if (client_wins) {
            job.status = REJECTED;
            job.disputed_milestone = 0;
            job.dispute_resolved = true; 
        } else {
            job.completed_milestones = job.completed_milestones + 1;
            
            let payment_amount = if (job.completed_milestones == job.total_milestones) {
                balance::value(&job.deposit)
            } else {
                job.milestone_amount
            };
            
            let payment_balance = balance::split(&mut job.deposit, payment_amount);
            let payment_coin = coin::from_balance(payment_balance, ctx);
            transfer::public_transfer(payment_coin, job.freelancer);
            
            event::emit(MilestoneApproved {
                job_id: object::id(job),
                client: job.client,
                freelancer: job.freelancer,
                milestone: job.completed_milestones,
                payment_amount,
            });
            
            if (job.completed_milestones == job.total_milestones) {
                job.status = COMPLETED;
            } else {
                job.current_milestone = job.current_milestone + 1;
                job.status = WORKING;
            };
            
            job.disputed_milestone = 0;
        };
    }

    // Client nge cancel job yang telah di create (dapat dilakukkan apabila statusnya ASSIGNED/WORKING dan belum ada milestone yang terpenuhi)
    public fun cancel_job(job: &mut JobEscrow, reason: vector<u8>, ctx: &mut TxContext) {
        assert!(tx_context::sender(ctx) == job.client, E_NOT_CLIENT);
        
        assert!(job.completed_milestones == 0, E_INVALID_STATUS);
        assert!(job.status == ASSIGNED || job.status == WORKING, E_INVALID_STATUS);
        
        let remaining_balance = balance::withdraw_all(&mut job.deposit);
        let refund_coin = coin::from_balance(remaining_balance, ctx);
        transfer::public_transfer(refund_coin, job.client);
        
        job.status = CANCELLED;
        
        event::emit(JobCancelled {
            job_id: object::id(job),
            cancelled_by: job.client,
            reason,
        });
    }

    // Fungsi View (untuk memudahkan integrasi fungsi-fungsi di SC ke FE)
    public fun get_job_info(job: &JobEscrow): (
        address,    // wallet address client
        address,    // wallet address freelancer
        u64,        // total_milestones
        u64,        // completed_milestones
        u64,        // current_milestone
        u64,        // balance_amount
        u8,         // status
        vector<u8>  // description
    ) {
        (
            job.client,
            job.freelancer,
            job.total_milestones,
            job.completed_milestones,
            job.current_milestone,
            balance::value(&job.deposit),
            job.status,
            job.description
        )
    }
    
    public fun get_dispute_info(job: &JobEscrow): (
        u64,      // disputed_milestone
        address   // juri
    ) {
        (
            job.disputed_milestone,
            job.arbiter
        )
    }
    
    public fun get_milestone_reports(job: &JobEscrow): vector<vector<u8>> {
        job.milestone_reports
    }
    
    public fun get_rejection_reason(job: &JobEscrow): vector<u8> {
        job.rejection_reason
    }
    
    public fun is_job_completed(job: &JobEscrow): bool {
        job.completed_milestones >= job.total_milestones
    }
    
    public fun get_progress_percentage(job: &JobEscrow): u64 {
        if (job.total_milestones == 0) {
            0
        } else {
            (job.completed_milestones * 100) / job.total_milestones
        }
    }
    
    public fun get_milestone_payment_estimate(job: &JobEscrow): u64 {
        job.milestone_amount
    }
    
    public fun get_remaining_payment(job: &JobEscrow): u64 {
        balance::value(&job.deposit)
    }
    
    public fun can_raise_dispute(job: &JobEscrow): bool {
        job.status == REJECTED
    }
    
    public fun can_cancel_job(job: &JobEscrow): bool {
        job.completed_milestones == 0 && (
            job.status == ASSIGNED || 
            job.status == WORKING
        )
    }
    
    public fun get_arbiter(job: &JobEscrow): address {
        job.arbiter
    }
    
    public fun is_arbiter(job: &JobEscrow, addr: address): bool {
        addr == job.arbiter
    }
}