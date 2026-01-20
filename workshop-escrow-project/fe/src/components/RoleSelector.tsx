"use client";

import { useRole, UserRole } from '../hooks/useRole';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

const roleOptions: RoleOption[] = [
  {
    id: 'client',
    title: 'Client',
    description: 'Post jobs and hire freelancers for your projects',
    icon: '💼',
    color: 'from-blue-500 to-blue-600',
    features: [
      'Create and post job listings',
      'Review freelancer applications',
      'Approve or reject milestones',
      'Manage escrow payments'
    ]
  },
  {
    id: 'freelancer',
    title: 'Freelancer',
    description: 'Find work and get paid securely through escrow',
    icon: '👨‍💻',
    color: 'from-green-500 to-green-600',
    features: [
      'Browse available jobs',
      'Apply to open positions',
      'Submit milestone work',
      'Receive secure payments'
    ]
  },
  {
    id: 'arbiter',
    title: 'Arbiter',
    description: 'Resolve disputes between clients and freelancers',
    icon: '⚖️',
    color: 'from-purple-500 to-purple-600',
    features: [
      'Review disputed milestones',
      'Make fair decisions',
      'Protect both parties',
      'Earn arbitration fees'
    ]
  }
];

const RoleSelector = () => {
  const { setRole } = useRole();

  const handleSelectRole = (role: UserRole) => {
    setRole(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h1 className="text-4xl font-bold text-white">SUI Escrow</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Decentralized freelance marketplace with progressive escrow system.
            <br />
            <span className="text-gray-500">Choose how you want to participate:</span>
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roleOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelectRole(option.id)}
              className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 text-left transition-all duration-300 hover:border-gray-500 hover:bg-gray-800/80 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Gradient Overlay on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className="text-5xl mb-4">{option.icon}</div>
              
              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-2">{option.title}</h3>
              
              {/* Description */}
              <p className="text-gray-400 mb-4">{option.description}</p>
              
              {/* Features */}
              <ul className="space-y-2">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Select Button */}
              <div className={`mt-6 py-3 px-4 bg-gradient-to-r ${option.color} rounded-lg text-white font-semibold text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                Continue as {option.title} →
              </div>
            </button>
          ))}
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-600 text-sm mt-8">
          You can change your role at any time from the settings menu
        </p>
      </div>
    </div>
  );
};

export default RoleSelector;
