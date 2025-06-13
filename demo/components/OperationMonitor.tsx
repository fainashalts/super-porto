'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, ArrowRight, Zap, AlertCircle, ExternalLink } from 'lucide-react';
import { getSuperchainConfig } from '../lib/chains';
import { CrossChainOperation, mockRebalanceOperations } from '../lib/mockData';

interface OperationMonitorProps {
  onComplete: () => void;
}

export default function OperationMonitor({ onComplete }: OperationMonitorProps) {
  const [operations, setOperations] = useState<CrossChainOperation[]>(mockRebalanceOperations);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setOperations(prevOps => {
        const newOps = prevOps.map(op => {
          if (op.status === 'completed' || op.status === 'failed') {
            return op;
          }

          const elapsed = Date.now() - op.startTime;
          const progress = Math.min((elapsed / (op.estimatedTime * 1000)) * 100, 100);

          let newStatus = op.status;
          if (progress >= 100) {
            newStatus = 'completed';
          } else if (progress >= 75 && op.status === 'confirming') {
            newStatus = 'relaying';
          } else if (progress >= 25 && op.status === 'pending') {
            newStatus = 'confirming';
          }

          return {
            ...op,
            progress: Math.round(progress),
            status: newStatus
          };
        });

        // Check if all operations are complete
        const allComplete = newOps.every(op => op.status === 'completed');
        if (allComplete && !isComplete) {
          setIsComplete(true);
          setTimeout(() => onComplete(), 2000);
        }

        return newOps;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete, onComplete]);

  const getStatusIcon = (status: CrossChainOperation['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'relaying':
        return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: CrossChainOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      case 'relaying':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getOperationLabel = (op: CrossChainOperation) => {
    const sourceConfig = getSuperchainConfig(op.sourceChain);
    const destConfig = op.destinationChain ? getSuperchainConfig(op.destinationChain) : null;

    switch (op.type) {
      case 'bridge':
        return `${sourceConfig?.emoji} → ${destConfig?.emoji} Bridge ${op.asset}`;
      case 'withdraw':
        return `${sourceConfig?.emoji} Withdraw ${op.asset}`;
      case 'swap':
        return `${sourceConfig?.emoji} Swap ${op.asset}`;
      case 'stake':
        return `${sourceConfig?.emoji} Stake ${op.asset}`;
      default:
        return `${sourceConfig?.emoji} ${op.type} ${op.asset}`;
    }
  };

  const completedOps = operations.filter(op => op.status === 'completed').length;
  const totalOps = operations.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🌐 Superchain Rebalancing in Progress
          </h1>
          <p className="text-gray-600">
            Executing {totalOps} operations across 4 L2s with L2ToL2 messaging
          </p>
          <div className="mt-4">
            <div className="bg-white rounded-full px-6 py-2 inline-flex items-center space-x-2 shadow-lg">
              <span className="text-sm font-medium text-gray-700">
                Progress: {completedOps}/{totalOps}
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(completedOps / totalOps) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operations List */}
        <div className="space-y-4 mb-8">
          {operations.map((op) => (
            <div
              key={op.id}
              className={`bg-white rounded-xl p-6 shadow-lg border-l-4 transition-all duration-300 ${getStatusColor(op.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(op.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {getOperationLabel(op)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Amount: ${op.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {op.status}
                    </p>
                    <p className="text-xs text-gray-500">
                      {op.progress}% complete
                    </p>
                  </div>
                  {op.txHash && (
                    <button className="text-indigo-600 hover:text-indigo-800 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      op.status === 'completed' 
                        ? 'bg-green-500' 
                        : op.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${op.progress}%` }}
                  />
                </div>
              </div>

              {/* Additional Info */}
              {op.messageHash && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    L2→L2 Message: {op.messageHash}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* L2-to-L2 Benefits */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ⚡ Superchain L2→L2 Advantages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fast Messaging</h3>
                <p className="text-sm text-gray-600">
                  Direct L2→L2 communication without mainnet delays
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Low Costs</h3>
                <p className="text-sm text-gray-600">
                  Optimized gas costs across all Superchain L2s
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Unified Experience</h3>
                <p className="text-sm text-gray-600">
                  Single gas token (ETH) across all chains
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Real-time Tracking</h3>
                <p className="text-sm text-gray-600">
                  Monitor cross-chain messages in real-time
                </p>
              </div>
            </div>
          </div>
        </div>

        {isComplete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 text-center max-w-md">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Rebalancing Complete!
              </h2>
              <p className="text-gray-600 mb-4">
                Your portfolio has been successfully optimized across the Superchain
              </p>
              <div className="text-sm text-gray-500">
                Redirecting to results...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 