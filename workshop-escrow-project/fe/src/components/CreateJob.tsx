"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useProgressiveEscrow } from "../hooks/useProgressiveEscrow";
import { CONTRACT_CONFIG } from "../config/constants";

const CreateJob = () => {
  const currentAccount = useCurrentAccount();
  const { postJob, isLoading } = useProgressiveEscrow();
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
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

      // Validate freelancer address
      const freelancerAddr = formData.freelancerAddress.trim();
      if (!freelancerAddr.startsWith("0x")) {
        throw new Error("Freelancer address must start with 0x");
      }
      if (freelancerAddr.length !== 66) {
        throw new Error(`Freelancer address must be 66 characters. Current: ${freelancerAddr.length}`);
      }
      if (freelancerAddr === currentAccount.address) {
        throw new Error("You cannot assign yourself as the freelancer");
      }

      const jobData = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        milestones: parseInt(formData.milestones),
        payment: parseFloat(formData.payment),
        freelancerAddress: freelancerAddr,
      };

      await postJob(jobData);

      alert("🎉 Job posted successfully! The freelancer has been assigned.");

      setFormData({
        title: "",
        description: "",
        requirements: "",
        freelancerAddress: "",
        milestones: "3",
        payment: "",
      });
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
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
          Create Job & Assign Freelancer
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Specify a freelancer's wallet address to create a job and assign it directly to them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Job Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-gray-900 font-semibold text-lg">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Full Stack Web Developer for E-commerce Platform"
            required
          />
        </div>

        {/* Freelancer Address */}
        <div className="space-y-2">
          <label htmlFor="freelancerAddress" className="block text-gray-900 font-semibold text-lg">
            Freelancer Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="freelancerAddress"
            className="input font-mono"
            value={formData.freelancerAddress}
            onChange={(e) => setFormData({ ...formData, freelancerAddress: e.target.value })}
            placeholder="0x..."
            required
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-700 font-medium mb-1">📝 Get the freelancer's SUI wallet address</p>
            <ul className="text-gray-600 text-xs space-y-1">
              <li>• Must be 66 characters (0x + 64 hex chars)</li>
              <li>• Cannot be your own wallet address</li>
            </ul>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <label htmlFor="requirements" className="block text-gray-900 font-semibold text-lg">
            Technical Requirements
          </label>
          <textarea
            id="requirements"
            className="input h-24 resize-none"
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            placeholder="e.g., React, Node.js, MongoDB, 3+ years experience"
          />
        </div>

        {/* Grid: Milestones & Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="milestones" className="block text-gray-900 font-semibold text-lg">
              Total Milestones <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="milestones"
              className="input"
              value={formData.milestones}
              onChange={(e) => setFormData({ ...formData, milestones: e.target.value })}
              min="1"
              max="20"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="payment" className="block text-gray-900 font-semibold text-lg">
              Total Budget (SUI) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="payment"
              className="input"
              step="0.1"
              value={formData.payment}
              onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
              min="0.1"
              required
            />
            <p className="text-sm text-gray-600">
              Per milestone: {(parseFloat(formData.payment) / parseInt(formData.milestones) || 0).toFixed(2)} SUI
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-gray-900 font-semibold text-lg">
            Project Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            className="input h-32 resize-none"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the project requirements, deliverables, and expectations..."
            required
          />
        </div>

        {/* Arbiter Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-purple-900 font-semibold mb-2">⚖️ Dispute Resolution</h4>
          <p className="text-purple-700 text-sm">
            If disputes arise, the arbiter will make the final decision:
          </p>
          <code className="text-xs text-gray-700 font-mono bg-white px-2 py-1 rounded border border-gray-200 mt-2 inline-block">
            {formatAddress(CONTRACT_CONFIG.ARBITER_ADDRESS || "")}
          </code>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-full py-4 text-lg font-semibold"
          disabled={isPending}
        >
          {isPending ? (
            <div className="flex items-center gap-3 justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Job...
            </div>
          ) : (
            "🚀 Create Job & Assign Freelancer"
          )}
        </button>
      </form>

      {/* Info Card */}
      <div className="card bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
        <h4 className="text-lg font-bold text-gray-900 mb-3">How V1 Escrow Works</h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">1.</span>
            <span>You create a job and specify the freelancer's wallet</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">2.</span>
            <span>Payment is locked in smart contract escrow</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span><strong>Freelancer clicks "Start Work"</strong> to begin</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Freelancer submits milestones with deliverable links</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">5.</span>
            <span>You approve → payment released. Reject → freelancer revises or disputes</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CreateJob;
