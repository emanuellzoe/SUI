// fitur fitur :
// 1. post job (client)
// 2. accept job / start work (freelancer)
// 2a decline job untuk freelancer (blom aku buat, tapi bisa jadi salah satu inovasi pengembangan setelah workshop)
// 2b decline job / cancel job - > untuk si clientnya gajadi nge create job
// 4. submit milestone / submit work (freelancer)
// 5. tolak hasil milestone (client)
// 6. terima hasil milestone (client)
// 7. ajuin banding (freelancer)
// 8. nentuin hasil banding (juri)

// 9. deploy smart contract
// 10. ngeintegrasiin fe ke function yang ada disini
// 11. ngedeploy project fe (biar bisa diakses sama semua orang)

module progressive_escrow::progressive_escrow {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::event;

    // CONSTANT VARIABLE (Hardcoded Arbiter)
    const ARBITER: address = @0x90cb8d57bd13f74ea9337dca1e270e51c6ce64f7fb78d571b73f2386ac91e534;
    
    // Status Constants Variable
    const ASSIGNED : u8 = 0; 
    const WORKING : u8 = 1;
    const IN_REVIEW : u8 = 2;
    const REJECTED : u8 = 3;
    const APPROVED : u8 = 4;
    const DISPUTED : u8 = 5;
    const CANCELLED : u8 = 6;

    // Error Codes
    const E_NOT_CLIENT: u64 = 1;
    const E_NOT_FREELANCER: u64 = 2;
    const E_NOT_ARBITER: u64 = 3;
    const E_INVALID_STATUS: u64 = 4;
    const E_NO_MILESTONES_LEFT: u64 = 6;
    const E_INVALID_MILESTONES : u64 = 8;
    const E_JOB_COMPLETED : u64 = 10;
    const E_INVALID_FREELANCER : u64 = 13;
    const E_SAME_ADDRESS: u64 = 14;
    const E_DISPUTE_ALREADY_RESOLVED: u64 = 15;
    const COMPLETED : u8 = 7;



    // inisialisasi struct untuk event emit
    public struct JobCreated has copy, drop {
        job_id : ID,
        client : address,
        freelancer : address,
        total_payment : u64,
        total_milestones: u64
    }

    public struct WorkStarted has copy, drop {
        job_id : ID,
        freelancer : address,
        milestone : u64
    }
    
    public struct WorkSubmitted has copy, drop {
        job_id : ID,
        freelancer : address,
        milestone : u64,
        description : vector<u8>
    }

    public struct MilestoneRejected has copy, drop {
        job_id : ID,
        client : address,
        freelancer : address,
        milestone : u64,
        reason : vector<u8>
    }

    public struct MilestoneApproved has copy, drop {
        job_id : ID,
        client : address,
        freelancer : address,
        milestone : u64,
        payment_amount : u64
    }

    public struct DisputeRaised has copy, drop {
        job_id : ID,
        raised_by : address,
        disputed_milestone : u64
    }
    public struct ArbiterDecision has copy, drop {
        job_id : ID,
        arbiter : address,
        client_wins : bool,
        disputed_milestone : u64,
    }

    public struct JobCancelled has copy, drop {
        job_id : ID,
        cancelled_by : address,
        reason : vector<u8>
    }

    // inisialisasi struct data yang bakal digunain untuk data jobescrow
    public struct JobEscrow has key {
        id : UID,
        client : address,
        freelancer : address,
        arbiter : address, //hakim
        deposit : Balance<SUI>,
        total_milestones : u64,
        completed_milestones: u64, //udah berapa banyak milestone yang selesai
        current_milestone : u64, //di milestone ke berapa saat ini si freelancer sedang bekerja
        milestone_amount : u64, // uang yg didapatkan oleh si client untuk setiap milestone
        remaining_amount : u64, // uang yang masih ada di escrow
        status : u8, //
        description : vector<u8>, // deskripsi job yang dimasukkan oleh client
        milestone_reports : vector<vector<u8>>, // laporan yang di inputkan oleh freelancer setiap submit milestone
        disputed_milestone : u64, //milestone yang diajukan banding oleh si freelancer
        rejection_reason : vector<u8>, // alasan kenapa si client menolak hasil kerjaannya si freelancer
        dispute_resolved : bool // status apakah banding sudah selesai atau belum
    }


    

    // mulai buat function post_job (untuk si client)
    public fun post_job(
        freelancer : address, 
        total_milestones:u64, 
        description : vector<u8>, 
        payment: Coin <SUI>,
        ctx : &mut TxContext)
    {
        let client = tx_context::sender(ctx);
        assert!(total_milestones > 0, E_INVALID_MILESTONES);
        assert!(freelancer != client, E_SAME_ADDRESS);
        assert!(freelancer != @0x0, E_INVALID_FREELANCER);

        let payment_amount = coin::value(&payment);
        let deposit = coin::into_balance(payment);
        let milestone_amount = payment_amount / total_milestones;
        let remaining_amount = payment_amount - (milestone_amount * (total_milestones - 1));

        let job = JobEscrow{
            id : object::new(ctx),
            client,
            freelancer,
            arbiter : ARBITER,
            deposit,
            total_milestones,
            completed_milestones : 0,
            current_milestone : 1, 
            milestone_amount,
            remaining_amount,
            status : ASSIGNED,
            description,
            milestone_reports :  vector::empty(), //bentuknya sebuah array / vektor
            disputed_milestone : 0,
            rejection_reason : vector::empty(), //rejeciton bentuknya sebuah array karena bisa jadi freelancer mereject berkali"
            dispute_resolved : false
        };
        let job_id = object::id(&job);
        // bisa dilihat oleh berbagai wallet address (tidak hanya terbatas ke wallet address sendernya)
        transfer::share_object(job);

        event::emit(JobCreated {
            job_id,
            client,
            freelancer,
            total_payment : payment_amount,
            total_milestones
        });
    }

    // Mengubah status ASSIGNED -> WORKING di blockchain SUI
    public fun start_work(job : &mut JobEscrow, ctx: &mut TxContext){
        let sender = tx_context::sender(ctx);
        
        assert!(sender == job.freelancer, E_NOT_FREELANCER);
        assert!(job.status == ASSIGNED, E_INVALID_STATUS);

        // sender : freelancer
        job.status = WORKING;

        event::emit(WorkStarted {
            job_id : object::id(job),
            freelancer : sender,
            milestone : job.current_milestone
        });

    }

    // mengubah status WORKING -> IN_REVIEW
    public fun submit_work(job : &mut JobEscrow, milestone_description : vector<u8>, ctx: &mut TxContext)
    {
        let sender = tx_context::sender(ctx);
        assert!(sender == job.freelancer, E_NOT_FREELANCER);
        
        assert!(job.status == WORKING || job.status == REJECTED, E_INVALID_STATUS);

        assert!(job.completed_milestones < job.total_milestones, E_NO_MILESTONES_LEFT);

        job.status = IN_REVIEW;
        // menambahkan milestone_description ke array / vektor yang ada di job.milestone_reports
        vector::push_back(&mut job.milestone_reports, milestone_description);
        job.rejection_reason = vector::empty();

        event::emit(WorkSubmitted {
            job_id : object::id(job),
            freelancer : job.freelancer,
            milestone : job.current_milestone,
            description : milestone_description
        });
    }

    // mengubah status IN_REVIEW -> REJECTED
    public fun reject_milestone(job : &mut JobEscrow, reason: vector<u8>, ctx : &mut TxContext)
    {   
        let sender = tx_context::sender(ctx);
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.status == IN_REVIEW, E_INVALID_STATUS);

        job.status = REJECTED;
        job.rejection_reason = reason;

        event::emit(MilestoneRejected {
            job_id : object::id(job),
            client : job.client,
            freelancer : job.freelancer,
            milestone : job.current_milestone,
            reason
        });
    }

    // mengubah status IN_REVIEW -> APPROVED
    public fun approve_milestone(job : &mut JobEscrow, _reason: vector<u8>, ctx : &mut TxContext)
    {   
        let sender = tx_context::sender(ctx);
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.status == IN_REVIEW, E_INVALID_STATUS);

        job.status = APPROVED;
        job.completed_milestones = job.completed_milestones + 1;

        // satu logic -> akan kepake ketika remaining amountnya itu ada sisa dari pembagian
        // 1 sui dengan 3 milestones -> 0.33 * 3 = 0.99 (0,01 yang hilang) 
        // 0.34 sui -> amount yang harus cair di milestone terakhir
        let payment_amount = if (job.completed_milestones == job.total_milestones)
        {
            // ini untuk yang amount cair di milestone terakhir (0.34)
            balance::value(&job.deposit)
        }
        else{
            // ini untuk yang 0.33
            job.milestone_amount
        };

        let payment_balance = balance::split(&mut job.deposit, payment_amount);
        let payment_coin = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(payment_coin, job.freelancer);

        // ngeupdate status completed milestones
        if(job.completed_milestones == job.total_milestones){
            // freelancer udah selesai nyelesain semua milestones
            job.status = COMPLETED;
        }
        else{
            // freelancer blom menyelesaikan semua milestones
            job.current_milestone = job.current_milestone + 1;
            job.status = WORKING;
        };

        event::emit(MilestoneApproved {
            job_id : object::id(job),
            client : job.client,
            freelancer : job.freelancer,
            milestone : job.current_milestone,
            payment_amount
        });
    }

    // sebagai freelancer, apabila milestonenya di reject, maka freelancer bisa raise dispute (ajuin banding)
    public fun raise_dispute(job : &mut JobEscrow, ctx : &mut TxContext){
        // sender : freelancer
        let sender = tx_context::sender(ctx);
        assert!(sender == job.freelancer, E_NOT_FREELANCER);
        assert!(job.status == REJECTED, E_INVALID_STATUS);

        // status yang berubah dari REJECTED -> DISPUTED
        job.status = DISPUTED;
        job.disputed_milestone = job.current_milestone;

        event::emit(DisputeRaised {
            job_id : object::id(job),
            raised_by : sender,
            disputed_milestone : job.current_milestone
        });
    }

    // nentuin hasil banding sebagai hakim (arbiter)
    public fun arbiter_decide(job : &mut JobEscrow, client_wins : bool, ctx: &mut TxContext ) {
        let sender = tx_context::sender(ctx);

        assert!(sender == job.arbiter, E_NOT_ARBITER);
        assert!(job.status == DISPUTED, E_INVALID_STATUS);
        
        // boolean client_wins : true -> si client
        // boolean client_wins : false -> freelancer

        // sender : arbiter (hakim)
        let sender = tx_context::sender(ctx);

        if(client_wins){
            // freelancer harus ngerjain revisi 
            // 1. statusnya berubah dari DISPUTED -> REJECTED
            job.status = REJECTED;
            // 2. job.disputed_milestone = 0;
            job.disputed_milestone = 0;
            // 3. job.dispute_resolved = true; -> disputenya udah selesai
            job.dispute_resolved = true;
        }
        else{
            // statusnya berubah dari DISPUTED -> WORKING / COMPLETED
            // ngeupdate status completed milestones

            // ngeupdate status completed_milestones dan current_milestone 
            job.completed_milestones = job.completed_milestones + 1;

            if(job.completed_milestones == job.total_milestones){
                // freelancer udah selesai nyelesain semua milestones
                job.status = COMPLETED;
            }
            else{
                // freelancer blom menyelesaikan semua milestones
                job.current_milestone = job.current_milestone + 1;
                job.status = WORKING;
            };
            // uang yang ada di milestone tersebut langsung cair ke walletnya si freelancer
            let payment_amount = if (job.completed_milestones == job.total_milestones)
            {
                // ini untuk yang amount cair di milestone terakhir (0.34)
                balance::value(&job.deposit)
            }
            else{
                // ini untuk yang 0.33
                job.milestone_amount
            };
            let payment_balance = balance::split(&mut job.deposit, payment_amount);
            let payment_coin = coin::from_balance(payment_balance, ctx);
            transfer::public_transfer(payment_coin, job.freelancer);
        };
        
        event::emit(ArbiterDecision {
            job_id : object::id(job),
            arbiter : sender,
            client_wins,
            disputed_milestone : job.disputed_milestone
        });
    }

    public fun cancel_job(job : &mut JobEscrow, reason : vector<u8>, ctx : &mut TxContext)
    {
        let sender = tx_context::sender(ctx);
        // job.completed_milestones == 0 && job.status == ASSIGNED;
        assert!(sender == job.client, E_NOT_CLIENT);
        assert!(job.completed_milestones == 0, E_INVALID_STATUS);
        assert!(job.status == ASSIGNED, E_INVALID_STATUS);

        let remaining_balance = balance::withdraw_all(&mut job.deposit);
        let refund_coin = coin::from_balance(remaining_balance, ctx);
        transfer::public_transfer(refund_coin, job.client);
        
        // ngubah status dari ASSIGNED -> CANCELLED
        job.status = CANCELLED;

        event::emit(JobCancelled 
        {
            job_id : object::id(job),
            cancelled_by : job.client,
            reason
        });
    }

    // View functions : membuat function getter untuk frontend bisa ngambil log dari setiap transaksi yang terjadi 

    public fun get_job_info(job: &JobEscrow): (
        address, // wallet address client
        address, // wallet address freelancer
        u64, //total milestones
        u64, //completed milestones
        u64, //current milestone
        u64, //balance amount
        u8, // status
        vector<u8> // description
    ) 
    {
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

    public fun get_milestone_reports(job: &JobEscrow) : &vector<vector<u8>> {
        &job.milestone_reports
    }

    public fun get_dispute_info(job: &JobEscrow): 
    (
        u64, //disputed_milestone : milestone ke-berapa yang diajukan banding
        address //addressnya si arbiter (hakim)
    )
    {
        (
            job.disputed_milestone,
            job.arbiter
        )
    }
    
    public fun get_rejection_reason(job: &JobEscrow) : vector<u8> {
        job.rejection_reason
    }

    // untuk ngereturn status apakah semua milestone sudah selesai dikerjakan oleh freelancer atau belum
    public fun is_job_completed(job:&JobEscrow) : bool {
        job.completed_milestones == job.total_milestones
    }
    
    // digunain di fe untuk mbuat visualiasi progress bar
    public fun get_progress_percentage(job:&JobEscrow) : u64 {
        job.completed_milestones * 100
    }
    
    // untuk tau berapa bayaran setiap milestone
    public fun get_milestone_payment_estimate(job:&JobEscrow) : u64 {
        job.milestone_amount
    }
    
    // untuk tau masih ada berapa uang di escrow
    public fun get_remaining_payment(job:&JobEscrow) : u64 {
        balance::value(&job.deposit)
    }

    // untuk si freelancernya (status di smart contract sedang rejected)
    public fun can_raise_dispute(job: &JobEscrow) : bool {
        // akan ngereturn true ketika job.status == REJECTED
        job.status == REJECTED
    }

    public fun can_cancel_job(job: &JobEscrow) : bool 
    {
        // job bisa di cancel ketika completed milestonenya masih 0 dan job.statusnya itu masih assigned 
        job.completed_milestones == 0 && job.status == ASSIGNED
    }

    public fun get_arbiter(job: &JobEscrow) : address {
        job.arbiter
    }
    
    public fun is_arbiter(job: &JobEscrow, addr : address) : bool {
        addr == job.arbiter
    }
    
}