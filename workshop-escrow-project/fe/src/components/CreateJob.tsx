"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useProgressiveEscrow } from "../hooks/useProgressiveEscrow";
import { ARBITER_ADDRESS } from "../config/constants";

const CreateJob = () => {
  const currentAccount = useCurrentAccount();
  const { postJob, isLoading } = useProgressiveEscrow();
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    deadline: "",
    freelancerAddress: "",
    milestones: "3",
    payment: "",
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
      if (!formData.freelancerAddress.trim()) {
        throw new Error("Freelancer wallet address is required");
      }
      if (!formData.payment || parseFloat(formData.payment) <= 0) {
        throw new Error("Valid payment amount is required");
      }

      const freelancerAddr = formData.freelancerAddress.trim();
      if (!freelancerAddr.startsWith("0x")) {
        throw new Error("Freelancer address must start with 0x");
      }
      if (freelancerAddr.length !== 66) {
        throw new Error(
          `Freelancer address must be 66 characters. Current: ${freelancerAddr.length}`
        );
      }

      if (freelancerAddr === currentAccount.address) {
        throw new Error("You cannot assign yourself as the freelancer");
      }

      const jobData = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        deadline: formData.deadline,
        freelancerAddress: freelancerAddr,
        milestones: parseInt(formData.milestones),
        payment: parseFloat(formData.payment),
      };

      const result = await postJob(jobData);

      alert("🎉 Job posted successfully! The freelancer has been assigned.");

      setFormData({
        title: "",
        description: "",
        requirements: "",
        deadline: "",
        freelancerAddress: "",
        milestones: "3",
        payment: "",
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

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Create Job for Freelancer
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Assign a specific freelancer to work on your project with
          milestone-based payments
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

        {/* Freelancer Address - NEW */}
        <div className="space-y-2">
          <label
            htmlFor="freelancerAddress"
            className="block text-gray-900 font-semibold text-lg"
          >
            Freelancer Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="freelancerAddress"
            className="input font-mono"
            value={formData.freelancerAddress}
            onChange={(e) =>
              setFormData({ ...formData, freelancerAddress: e.target.value })
            }
            placeholder="0x..."
            required
          />
          <div className="text-sm space-y-2">
            <p className="text-gray-600">
              Enter the SUI wallet address of the freelancer who will work on
              this job
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-600 font-medium mb-2">
                How to get freelancer address:
              </p>
              <ul className="text-gray-700 text-xs space-y-1">
                <li>• Ask the freelancer for their SUI wallet address</li>
                <li>• The address should be 66 characters long</li>
                <li>• Must start with 0x followed by 64 hex characters</li>
              </ul>
            </div>
          </div>
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

        {/* Deadline */}
        <div className="space-y-2">
          <label
            htmlFor="deadline"
            className="block text-gray-900 font-semibold text-lg"
          >
            Project Deadline
          </label>
          <input
            type="text"
            id="deadline"
            className="input"
            value={formData.deadline}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
            placeholder="e.g., 30 days, 2 months, December 2025"
          />
          <p className="text-sm text-gray-600">
            When do you need this project completed?
          </p>
        </div>

        {/* Grid Layout for Numbers */}
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

        {/* Arbiter Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-gray-900 font-semibold mb-2">
            Dispute Resolution
          </h4>
          <p className="text-gray-600 text-sm mb-2">
            If there's a dispute, the following arbiter will make the final
            decision:
          </p>
          <code className="text-xs text-gray-700 font-mono bg-white px-2 py-1 rounded border border-gray-200">
            {formatAddress(ARBITER_ADDRESS)}
          </code>
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
            "Create Job & Assign Freelancer"
          )}
        </button>
      </form>

      {/* Info Card */}
      <div className="card bg-gray-50 border border-gray-200">
        <h4 className="text-lg font-bold text-gray-900 mb-3">How It Works</h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">1.</span>
            You create a job and specify the freelancer's wallet address
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">2.</span>
            Your payment is locked in smart contract escrow
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">3.</span>
            Freelancer works on milestones and submits progress reports
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">4.</span>
            You approve each milestone → payment released automatically
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">5.</span>
            If rejected, freelancer can revise or raise dispute for arbiter
            decision
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CreateJob;
