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
  const [links, setLinks] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLink = () => {
    if (links.length < 5) {
      setLinks([...links, ""]);
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

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

    // Build final submission with links
    const validLinks = links.filter(link => link.trim() !== "");
    let finalDescription = description;
    
    if (validLinks.length > 0) {
      finalDescription += "\n\n📎 Deliverables & Links:\n" + validLinks.map((link, i) => `${i + 1}. ${link}`).join("\n");
    }

    setIsSubmitting(true);

    try {
      await onSubmit(finalDescription);
      setDescription("");
      setLinks([""]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit milestone"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xl">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Submit Milestone {currentMilestone} of {totalMilestones}
        </h3>
        <p className="text-gray-600">
          Describe what you've accomplished and include links to deliverables for review.
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
            className="input h-32 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you've completed for this milestone:&#10;&#10;- Task 1: Completed...&#10;- Task 2: Implemented...&#10;- Testing: All tests passing..."
            disabled={isSubmitting || isLoading}
          />
          <p className="text-sm text-gray-500">
            {description.length} characters
          </p>
        </div>

        {/* Links Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-gray-900 font-semibold">
              📎 Links & Deliverables
            </label>
            {links.length < 5 && (
              <button
                type="button"
                onClick={addLink}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Link
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Add links to GitHub repos, demo sites, design files, or documents.
          </p>
          
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  className="input flex-1"
                  value={link}
                  onChange={(e) => updateLink(index, e.target.value)}
                  placeholder="https://github.com/... or https://drive.google.com/..."
                  disabled={isSubmitting || isLoading}
                />
                {links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={isSubmitting || isLoading}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Common Link Types */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-gray-500">Common links:</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">GitHub Repository</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">Live Demo URL</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">Figma Design</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">Google Drive</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">Loom Video</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-blue-700 font-medium mb-2">
            📋 Tips for approval:
          </h4>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Be specific about what was completed</li>
            <li>• Include working links to all deliverables</li>
            <li>• Mention any known issues or limitations</li>
            <li>• Client has limited time to review - make it easy for them</li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-1 py-3"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </div>
            ) : (
              "🚀 Submit for Review"
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
