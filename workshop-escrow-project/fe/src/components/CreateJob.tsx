"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useProgressiveEscrow } from "../hooks/useProgressiveEscrow";
import { DEFAULT_VALUES } from "../config/constants";

const CreateJob = () => {
  const currentAccount = useCurrentAccount();
  const { postJob, isLoading } = useProgressiveEscrow();
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    milestones: "3",
    payment: "",
    deadlinePerMilestoneDays: "7",
    reviewPeriodDays: "3",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAccount) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsPending(true);

    try {
      if (!formData.title.trim()) {
        throw new Error("Job title is required");
      }
      if (!formData.description.trim()) {
        throw new Error("Job description is required");
      }
      if (!formData.payment || parseFloat(formData.payment) <= 0) {
        throw new Error("Valid payment amount is required");
      }

      const jobData = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        milestones: parseInt(formData.milestones),
        payment: parseFloat(formData.payment),
        deadlinePerMilestoneDays: parseInt(formData.deadlinePerMilestoneDays),
        reviewPeriodDays: parseInt(formData.reviewPeriodDays),
      };

      const result = await postJob(jobData);

      alert("🎉 Job posted successfully! Freelancers can now apply.");

      setFormData({
        title: "",
        description: "",
        requirements: "",
        milestones: "3",
        payment: "",
        deadlinePerMilestoneDays: "7",
        reviewPeriodDays: "3",
      });
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = (error as any).message;
      }

      alert(`Failed to post job: ${errorMessage}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Post a New Job
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Create an open job that freelancers can browse and apply to. 
          Review applications and select the best candidate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Job Title */}
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-gray-900 font-semibold text-lg"
          >
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            className="input"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="e.g., Full Stack Web Developer for E-commerce Platform"
            required
          />
          <p className="text-sm text-gray-600">
            Write a clear, descriptive title for your project
          </p>
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <label
            htmlFor="requirements"
            className="block text-gray-900 font-semibold text-lg"
          >
            Technical Requirements
          </label>
          <textarea
            id="requirements"
            className="input h-24 resize-none"
            value={formData.requirements}
            onChange={(e) =>
              setFormData({ ...formData, requirements: e.target.value })
            }
            placeholder="e.g., React, Node.js, MongoDB, 3+ years experience, TypeScript"
          />
          <p className="text-sm text-gray-600">
            Specify technical requirements and expected deliverables
          </p>
        </div>

        {/* Grid Layout for Payment and Milestones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="milestones"
              className="block text-gray-900 font-semibold text-lg"
            >
              Total Milestones <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="milestones"
              className="input"
              value={formData.milestones}
              onChange={(e) =>
                setFormData({ ...formData, milestones: e.target.value })
              }
              min="1"
              max="20"
              required
            />
            <p className="text-sm text-gray-600">
              Number of payment milestones for the project
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="payment"
              className="block text-gray-900 font-semibold text-lg"
            >
              Total Budget (SUI) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="payment"
              className="input"
              step="0.1"
              value={formData.payment}
              onChange={(e) =>
                setFormData({ ...formData, payment: e.target.value })
              }
              min="0.1"
              required
            />
            <p className="text-sm text-gray-600">
              Payment per milestone:{" "}
              {(
                parseFloat(formData.payment) / parseInt(formData.milestones) ||
                0
              ).toFixed(2)}{" "}
              SUI
            </p>
          </div>
        </div>

        {/* Deadline Settings */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <h4 className="text-blue-900 font-semibold text-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Deadline Settings
          </h4>
          <p className="text-blue-700 text-sm">
            Configure deadlines to protect both parties. Freelancers must deliver within the work deadline, 
            and you must review within the review period or the milestone will be auto-approved.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="deadlinePerMilestoneDays"
                className="block text-blue-900 font-medium"
              >
                Work Deadline (days per milestone)
              </label>
              <input
                type="number"
                id="deadlinePerMilestoneDays"
                className="input"
                value={formData.deadlinePerMilestoneDays}
                onChange={(e) =>
                  setFormData({ ...formData, deadlinePerMilestoneDays: e.target.value })
                }
                min="1"
                max="90"
              />
              <p className="text-xs text-blue-600">
                Days the freelancer has to complete each milestone
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reviewPeriodDays"
                className="block text-blue-900 font-medium"
              >
                Review Period (days)
              </label>
              <input
                type="number"
                id="reviewPeriodDays"
                className="input"
                value={formData.reviewPeriodDays}
                onChange={(e) =>
                  setFormData({ ...formData, reviewPeriodDays: e.target.value })
                }
                min="1"
                max="14"
              />
              <p className="text-xs text-blue-600">
                Days you have to review submitted work (auto-approves if missed)
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-gray-900 font-semibold text-lg"
          >
            Project Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            className="input h-32 resize-none"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe the project requirements, deliverables, and expectations for each milestone..."
            required
          />
          <p className="text-sm text-gray-600">
            Clear description of work to be completed
          </p>
        </div>

        {/* Arbiter Info - Updated for V2 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-purple-900 font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            Fair Dispute Resolution
          </h4>
          <p className="text-purple-700 text-sm">
            If there's a dispute, a <strong>random arbiter</strong> will be selected from our registry 
            to make an impartial decision. This prevents collusion between arbiter and either party.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-full py-4 text-lg font-semibold"
          disabled={isPending}
        >
          {isPending ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Job...
            </div>
          ) : (
            "🚀 Post Open Job"
          )}
        </button>
      </form>

      {/* Info Card - Updated for V2 */}
      <div className="card bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
        <h4 className="text-lg font-bold text-gray-900 mb-3">How It Works</h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">1.</span>
            <span>You post a job with budget and deadline settings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">2.</span>
            <span>Your payment is locked in smart contract escrow</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span><strong>Freelancers apply</strong> with their proposals</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>You <strong>review applications</strong> and select the best candidate</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">5.</span>
            <span>Freelancer works on milestones with <strong>deadline tracking</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">6.</span>
            <span>You approve → payment released. Reject → freelancer revises or disputes</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CreateJob;
