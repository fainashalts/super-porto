'use client';

import React, { useState } from 'react';
import PermissionSetup from '../components/PermissionSetup';
import PortfolioDashboard from '../components/PortfolioDashboard';
import OperationMonitor from '../components/OperationMonitor';
import ResultsView from '../components/ResultsView';

type DemoStep = 'setup' | 'dashboard' | 'rebalancing' | 'results';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<DemoStep>('setup');

  const handleSetupComplete = () => {
    setCurrentStep('dashboard');
  };

  const handleStartRebalance = () => {
    setCurrentStep('rebalancing');
  };

  const handleRebalanceComplete = () => {
    setCurrentStep('results');
  };

  const handleRestart = () => {
    setCurrentStep('setup');
  };

  return (
    <div className="min-h-screen">
      {currentStep === 'setup' && (
        <PermissionSetup onComplete={handleSetupComplete} />
      )}
      
      {currentStep === 'dashboard' && (
        <PortfolioDashboard onStartRebalance={handleStartRebalance} />
      )}
      
      {currentStep === 'rebalancing' && (
        <OperationMonitor onComplete={handleRebalanceComplete} />
      )}
      
      {currentStep === 'results' && (
        <ResultsView onRestart={handleRestart} />
      )}
    </div>
  );
} 