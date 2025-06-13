'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { CheckCircle, TrendingUp, Zap, RotateCcw, ArrowRight } from 'lucide-react';
import { superchainConfigs, getSuperchainConfig } from '../lib/chains';
import { 
  mockPortfolio, 
  optimizedPortfolio, 
  calculateTotalValue, 
  calculateWeightedAPY 
} from '../lib/mockData';

interface ResultsViewProps {
  onRestart: () => void;
}

export default function ResultsView({ onRestart }: ResultsViewProps) {
  const oldValue = calculateTotalValue(mockPortfolio);
  const newValue = calculateTotalValue(optimizedPortfolio);
  const oldAPY = calculateWeightedAPY(mockPortfolio);
  const newAPY = calculateWeightedAPY(optimizedPortfolio);
  const apyGain = newAPY - oldAPY;
  const annualGain = oldValue * apyGain / 100;

  const chartData = optimizedPortfolio.map(chain => {
    const config = getSuperchainConfig(chain.chainId);
    return {
      name: config?.shortName || 'Unknown',
      value: chain.totalValue,
      percentage: chain.percentage,
      color: config?.color || '#gray'
    };
  });

  const beforeAfterData = [
    { name: 'Before', apy: oldAPY, value: oldValue },
    { name: 'After', apy: newAPY, value: newValue }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎉 Portfolio Optimized!
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Successfully rebalanced across the Superchain ecosystem
          </p>
          <div className="bg-white rounded-full px-8 py-3 inline-flex items-center space-x-4 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">APY Improvement</p>
              <p className="text-2xl font-bold text-green-600">+{apyGain.toFixed(1)}%</p>
            </div>
            <div className="w-px h-8 bg-gray-300" />
            <div className="text-center">
              <p className="text-sm text-gray-600">Annual Gain</p>
              <p className="text-2xl font-bold text-green-600">+${annualGain.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Before & After Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Before */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="w-3 h-3 bg-red-400 rounded-full mr-3" />
              Before Optimization
            </h2>
            <div className="space-y-4">
              {mockPortfolio.map((chain) => {
                const config = getSuperchainConfig(chain.chainId);
                return (
                  <div key={chain.chainId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{config?.emoji}</span>
                      <div>
                        <p className="font-medium text-gray-900">{config?.shortName}</p>
                        <p className="text-sm text-gray-600">{chain.percentage}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${chain.totalValue.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total APY:</span>
                  <span className="font-bold text-gray-900">{oldAPY.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-3" />
              After Optimization
            </h2>
            <div className="space-y-4">
              {optimizedPortfolio.map((chain) => {
                const config = getSuperchainConfig(chain.chainId);
                return (
                  <div key={chain.chainId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{config?.emoji}</span>
                      <div>
                        <p className="font-medium text-gray-900">{config?.shortName}</p>
                        <p className="text-sm text-gray-600">{chain.percentage}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${chain.totalValue.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 border-t border-green-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total APY:</span>
                  <span className="font-bold text-green-600">{newAPY.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Performance Improvement
          </h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={beforeAfterData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'apy' ? `${value.toFixed(1)}%` : `$${value.toLocaleString()}`,
                    name === 'apy' ? 'APY' : 'Portfolio Value'
                  ]}
                />
                <Bar dataKey="apy" fill="#10b981" name="APY" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            🌟 Optimization Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Higher Yields</h3>
                <p className="text-sm text-gray-600">
                  Moved to protocols with better APY rates across all chains
                </p>
                <p className="text-green-600 font-semibold">+{apyGain.toFixed(1)}% APY</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Balanced Risk</h3>
                <p className="text-sm text-gray-600">
                  Equal distribution across 4 L2s reduces concentration risk
                </p>
                <p className="text-blue-600 font-semibold">25% each chain</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">One Transaction</h3>
                <p className="text-sm text-gray-600">
                  All 6 operations executed with single session key approval
                </p>
                <p className="text-purple-600 font-semibold">No popups!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">
            🚀 Ready for Production?
          </h2>
          <p className="text-indigo-100 mb-6">
            This demo shows the power of Porto + Superchain. Deploy this pattern in your application.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onRestart}
              className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Try Again</span>
            </button>
            <a
              href="https://github.com/your-repo/porto-superchain"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-800 transition-colors duration-200 flex items-center space-x-2"
            >
              <span>View Code</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 