"use client";

import { useState } from "react";

interface MilestoneSubmitFormProps {
  jobId: string;
  currentMilestone: number;
  totalMilestones: number;
  onSubmit: (description: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const MilestoneSubmitForm = ({
  jobId,
  currentMilestone,
  totalMilestones,
  onSubmit,
  onCancel,
  isLoading = false,
}: MilestoneSubmitFormProps) => {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Please provide a description of your work for this milestone");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters long");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(description);
      setDescription("");
    } catch (err) {
            setError(
        err instanceof Error ? err.message : "Failed to submit milestone"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Submit Milestone {currentMilestone} of {totalMilestones}
        </h3>
        <p className="text-gray-600">
          Describe what you've accomplished for this milestone. Be specific
          about deliverables and any notes for the client.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description Field */}
        <div className="space-y-2">
          <label
            htmlFor="milestoneDescription"
            className="block text-gray-900 font-semibold"
          >
            Milestone Report <span className="text-red-500">*</span>
          </label>
          <textarea
            id="milestoneDescription"
            className="input h-40 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example:&#10;&#10;Completed the following for Milestone 1:&#10;- Designed database schema&#10;- Implemented user authentication&#10;- Created API endpoints for user management&#10;&#10;All tests passing. Ready for review."
            disabled={isSubmitting || isLoading}
          />
          <p className="text-sm text-gray-600">
            {description.length} characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-blue-600 font-medium mb-2">
            Tips for a good milestone report:
          </h4>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• List specific deliverables completed</li>
            <li>• Mention any challenges faced and how you solved them</li>
            <li>
              • Include links to demos, repositories, or documentation if
              applicable
            </li>
            <li>• Note any clarifications needed for the next milestone</li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </div>
            ) : (
              "Submit Milestone"
            )}
          </button>
          <button
            type="button"
            className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MilestoneSubmitForm;
