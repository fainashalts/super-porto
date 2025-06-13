'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface PermissionSetupProps {
  onComplete: () => void;
}

export default function PermissionSetup({ onComplete }: PermissionSetupProps) {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    {
      title: 'Connect Wallet',
      description: 'Connect your wallet to get started',
      icon: Zap,
      action: 'Connect'
    },
    {
      title: 'Delegate Account (EIP-7702)',
      description: 'One-time delegation to Porto smart contract',
      icon: Shield,
      action: 'Delegate'
    },
    {
      title: 'Authorize Session Key',
      description: 'Set permissions for cross-chain operations',
      icon: Key,
      action: 'Authorize'
    }
  ];

  const handleStepAction = async () => {
    setIsLoading(true);
    
    // Simulate transaction time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="superchain-gradient w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Setup Porto Account
            </h1>
            <p className="text-gray-600">
              One-time setup for seamless multi-chain operations
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    index < step
                      ? 'bg-green-500 text-white'
                      : index === step
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < step ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 transition-all duration-300 ${
                      index < step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Current Step */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                  {React.createElement(steps[step].icon, {
                    className: "w-8 h-8 text-indigo-600"
                  })}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {steps[step].title}
                </h2>
                <p className="text-gray-600">
                  {steps[step].description}
                </p>
              </div>

              {/* Step-specific content */}
              {step === 0 && (
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-800">
                          Make sure you're connected to a supported network
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">
                      What is EIP-7702?
                    </h3>
                    <p className="text-sm text-purple-800">
                      Delegates your EOA to a smart contract, enabling advanced features
                      while keeping your original address.
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>✅ Keeps your existing address</p>
                    <p>✅ Enables smart contract features</p>
                    <p>✅ Reversible delegation</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Session Key Permissions
                    </h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p>🌉 Cross-chain bridging: Enabled</p>
                      <p>🔄 Contract execution: Enabled</p>
                      <p>💰 Spend limit: $50,000</p>
                      <p>⏰ Expires: 30 days</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleStepAction}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  steps[step].action
                )}
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Benefits */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              After setup, you can:
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>🚀 Execute cross-chain operations with one click</p>
              <p>🔄 Rebalance across 4 Superchain networks</p>
              <p>❌ No more wallet approval popups</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 