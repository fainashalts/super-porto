'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Target, Zap, TrendingUp, Clock, Shield } from 'lucide-react';
import { superchainConfigs, getSuperchainConfig } from '../lib/chains';
import { 
  mockPortfolio, 
  optimizedPortfolio, 
  calculateTotalValue, 
  calculateWeightedAPY,
  ChainBalance 
} from '../lib/mockData';

interface PortfolioDashboardProps {
  onStartRebalance: () => void;
}

export default function PortfolioDashboard({ onStartRebalance }: PortfolioDashboardProps) {
  const [currentPortfolio, setCurrentPortfolio] = useState(mockPortfolio);
  const [showOptimized, setShowOptimized] = useState(false);

  const totalValue = calculateTotalValue(currentPortfolio);
  const currentAPY = calculateWeightedAPY(currentPortfolio);
  const optimizedAPY = calculateWeightedAPY(optimizedPortfolio);
  const potentialGain = optimizedAPY - currentAPY;

  const chartData = currentPortfolio.map(chain => {
    const config = getSuperchainConfig(chain.chainId);
    return {
      name: config?.shortName || 'Unknown',
      value: chain.totalValue,
      percentage: chain.percentage,
      color: config?.color || '#gray'
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Porto Superchain Portfolio
              </h1>
              <p className="text-gray-600">
                Manage your assets across the entire Superchain ecosystem
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Session Active</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Portfolio</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Current APY</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentAPY.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Potential APY</p>
                <p className="text-2xl font-bold text-green-600">
                  {optimizedAPY.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Annual Gain</p>
                <p className="text-2xl font-bold text-green-600">
                  +${(totalValue * potentialGain / 100).toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Portfolio Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Current Distribution
            </h2>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chain Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Chain Breakdown
            </h2>
            <div className="space-y-4">
              {currentPortfolio.map((chain) => {
                const config = getSuperchainConfig(chain.chainId);
                return (
                  <div key={chain.chainId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: config?.color }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {config?.emoji} {config?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {chain.positions.length} position{chain.positions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${chain.totalValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {chain.percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Optimization Opportunity */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Optimization Opportunity
              </h2>
              <p className="text-indigo-100 mb-4">
                Rebalance your portfolio across Superchain L2s for +{potentialGain.toFixed(1)}% APY
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="text-indigo-200">Current:</span>
                  <span className="font-semibold ml-2">{currentAPY.toFixed(1)}% APY</span>
                </div>
                <div>
                  <span className="text-indigo-200">Optimized:</span>
                  <span className="font-semibold ml-2">{optimizedAPY.toFixed(1)}% APY</span>
                </div>
                <div>
                  <span className="text-indigo-200">Annual Gain:</span>
                  <span className="font-semibold ml-2">+${(totalValue * potentialGain / 100).toFixed(0)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onStartRebalance}
              className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <Zap className="w-5 h-5" />
              <span>Auto-Rebalance</span>
            </button>
          </div>
        </div>

        {/* Superchain Benefits */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Superchain Ecosystem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {superchainConfigs.map((config) => (
              <div key={config.chain.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">{config.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <p className="text-sm text-gray-600">Chain {config.chain.id}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                <div className="space-y-1">
                  {config.protocols.slice(0, 3).map((protocol) => (
                    <span 
                      key={protocol}
                      className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mr-1"
                    >
                      {protocol}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 