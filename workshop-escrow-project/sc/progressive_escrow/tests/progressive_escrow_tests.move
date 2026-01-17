#[test_only]
module progressive_escrow::progressive_escrow_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use progressive_escrow::progressive_escrow::{Self, JobEscrow};

    const CLIENT: address = @0xCAFE;
    const FREELANCER: address = @0xFACE;
    const ARBITER: address = @0xf041a6d2d141a2b6f39591aac151390fe23953e04940d64bf20a583ce9ed2186;
    const RANDOM_USER: address = @0xBABE;

    const TOTAL_PAYMENT: u64 = 3000;
    const TOTAL_MILESTONES: u64 = 3;
    const MILESTONE_AMOUNT: u64 = 1000;

    fun create_test_coin(scenario: &mut Scenario, amount: u64): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ts::ctx(scenario))
    }

    #[test]
    fun test_post_job_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let job = ts::take_shared<JobEscrow>(&scenario);
            let (client, freelancer, total_milestones, completed, current, balance, status, _desc) =
                progressive_escrow::get_job_info(&job);

            assert!(client == CLIENT, 0);
            assert!(freelancer == FREELANCER, 1);
            assert!(total_milestones == TOTAL_MILESTONES, 2);
            assert!(completed == 0, 3);
            assert!(current == 1, 4);
            assert!(balance == TOTAL_PAYMENT, 5);
            assert!(status == 0, 6);

            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = progressive_escrow::E_SAME_ADDRESS)]
    fun test_post_job_same_address_fails() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                CLIENT,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = progressive_escrow::E_INVALID_MILESTONES)]
    fun test_post_job_zero_milestones_fails() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                0,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::end(scenario);
    }

    #[test]
    fun test_start_work_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            let (_c, _f, _tm, _cm, _cur, _bal, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(status == 1, 0);
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = progressive_escrow::E_NOT_FREELANCER)]
    fun test_start_work_not_freelancer_fails() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, RANDOM_USER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_submit_work_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            progressive_escrow::submit_work(&mut job, b"Milestone 1 completed", ts::ctx(&mut scenario));
            let (_c, _f, _tm, _cm, _cur, _bal, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(status == 2, 0);
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_approve_milestone_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            progressive_escrow::submit_work(&mut job, b"Milestone 1 done", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::approve_milestone(&mut job, ts::ctx(&mut scenario));
            let (_c, _f, _tm, completed, current, balance, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(completed == 1, 0);
            assert!(current == 2, 1);
            assert!(balance == TOTAL_PAYMENT - MILESTONE_AMOUNT, 2);
            assert!(status == 1, 3);
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT, 0);
            test_utils::destroy(coin);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_reject_milestone_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            progressive_escrow::submit_work(&mut job, b"Milestone 1", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::reject_milestone(&mut job, b"Not good enough", ts::ctx(&mut scenario));
            let (_c, _f, _tm, _cm, _cur, _bal, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(status == 3, 0);
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_raise_dispute_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            progressive_escrow::submit_work(&mut job, b"Milestone 1", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::reject_milestone(&mut job, b"Rejected", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::raise_dispute(&mut job, ts::ctx(&mut scenario));
            let (_c, _f, _tm, _cm, _cur, _bal, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(status == 4, 0);
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_arbiter_decide_freelancer_wins() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            progressive_escrow::submit_work(&mut job, b"Milestone 1", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::reject_milestone(&mut job, b"Rejected", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::raise_dispute(&mut job, ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, ARBITER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::arbiter_decide(&mut job, false, ts::ctx(&mut scenario));
            let (_c, _f, _tm, completed, current, _bal, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(completed == 1, 0);
            assert!(current == 2, 1);
            assert!(status == 1, 2);
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT, 0);
            test_utils::destroy(coin);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_arbiter_decide_client_wins() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
            progressive_escrow::submit_work(&mut job, b"Milestone 1", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::reject_milestone(&mut job, b"Rejected", ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, FREELANCER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::raise_dispute(&mut job, ts::ctx(&mut scenario));
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, ARBITER);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::arbiter_decide(&mut job, true, ts::ctx(&mut scenario));
            let (_c, _f, _tm, completed, current, _bal, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(completed == 0, 0);
            assert!(current == 1, 1);
            assert!(status == 3, 2);
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_cancel_job_success() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut job = ts::take_shared<JobEscrow>(&scenario);
            progressive_escrow::cancel_job(&mut job, b"Changed mind", ts::ctx(&mut scenario));
            let (_c, _f, _tm, _cm, _cur, balance, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(balance == 0, 0);
            assert!(status == 6, 1);
            ts::return_shared(job);
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let refund = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&refund) == TOTAL_PAYMENT, 0);
            test_utils::destroy(refund);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_complete_all_milestones() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };

        let mut i = 0;
        while (i < TOTAL_MILESTONES) {
            ts::next_tx(&mut scenario, FREELANCER);
            {
                let mut job = ts::take_shared<JobEscrow>(&scenario);
                if (i == 0) {
                    progressive_escrow::start_work(&mut job, ts::ctx(&mut scenario));
                };
                progressive_escrow::submit_work(&mut job, b"Milestone done", ts::ctx(&mut scenario));
                ts::return_shared(job);
            };
            ts::next_tx(&mut scenario, CLIENT);
            {
                let mut job = ts::take_shared<JobEscrow>(&scenario);
                progressive_escrow::approve_milestone(&mut job, ts::ctx(&mut scenario));
                ts::return_shared(job);
            };
            i = i + 1;
        };

        ts::next_tx(&mut scenario, CLIENT);
        {
            let job = ts::take_shared<JobEscrow>(&scenario);
            let (_c, _f, _tm, completed, _cur, balance, status, _desc) = progressive_escrow::get_job_info(&job);
            assert!(completed == TOTAL_MILESTONES, 0);
            assert!(balance == 0, 1);
            assert!(status == 5, 2);
            assert!(progressive_escrow::is_job_completed(&job), 3);
            ts::return_shared(job);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_view_functions() {
        let mut scenario = ts::begin(CLIENT);
        {
            let payment = create_test_coin(&mut scenario, TOTAL_PAYMENT);
            progressive_escrow::post_job(
                FREELANCER,
                TOTAL_MILESTONES,
                b"Build a website",
                payment,
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, CLIENT);
        {
            let job = ts::take_shared<JobEscrow>(&scenario);

            assert!(progressive_escrow::get_progress_percentage(&job) == 0, 0);
            assert!(progressive_escrow::get_milestone_payment_estimate(&job) == MILESTONE_AMOUNT, 1);
            assert!(progressive_escrow::get_remaining_payment(&job) == TOTAL_PAYMENT, 2);
            assert!(!progressive_escrow::can_raise_dispute(&job), 3);
            assert!(progressive_escrow::can_cancel_job(&job), 4);
            assert!(progressive_escrow::get_arbiter(&job) == ARBITER, 5);
            assert!(progressive_escrow::is_arbiter(&job, ARBITER), 6);
            assert!(!progressive_escrow::is_arbiter(&job, CLIENT), 7);

            ts::return_shared(job);
        };
        ts::end(scenario);
    }
}
