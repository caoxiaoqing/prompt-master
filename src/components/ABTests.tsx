import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Pause,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ABTest, PromptVersion } from '../types';
import { format } from 'date-fns';

const ABTests: React.FC = () => {
  const { state, dispatch } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);

  // Mock A/B test data
  const mockTests: ABTest[] = [
    {
      id: '1',
      name: 'Concise vs Detailed Instructions',
      versionA: '1',
      versionB: '2',
      results: [],
      createdAt: new Date(Date.now() - 86400000 * 3),
      status: 'active'
    },
    {
      id: '2',
      name: 'Temperature Optimization',
      versionA: '2',
      versionB: '3',
      results: [],
      createdAt: new Date(Date.now() - 86400000 * 1),
      status: 'completed'
    }
  ];

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'completed': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      case 'paused': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    }
  };

  const getStatusIcon = (status: ABTest['status']) => {
    switch (status) {
      case 'active': return <Play size={12} />;
      case 'completed': return <CheckCircle size={12} />;
      case 'paused': return <Pause size={12} />;
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">A/B Tests</h1>
            <p className="text-gray-600 dark:text-gray-400">Compare prompt performance with statistical significance</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>New Test</span>
          </button>
        </div>
      </div>

      <div className="flex h-full">
        {/* Test List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="p-4">
            <h2 className="font-semibold mb-4">Active Tests</h2>
            <div className="space-y-3">
              {mockTests.map((test) => (
                <motion.div
                  key={test.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedTest(test)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTest?.id === test.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">{test.name}</h3>
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(test.status)}`}>
                      {getStatusIcon(test.status)}
                      <span className="capitalize">{test.status}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Created {format(test.createdAt, 'MMM d, yyyy')}</div>
                    <div className="flex items-center space-x-4">
                      <span>0 responses</span>
                      <span>0% confidence</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Details */}
        <div className="flex-1">
          {selectedTest ? (
            <TestDetails test={selectedTest} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a test to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Test Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTestModal
            onClose={() => setShowCreateModal(false)}
            versions={state.versions}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TestDetails: React.FC<{ test: ABTest }> = ({ test }) => {
  const { state } = useApp();
  
  const versionA = state.versions.find(v => v.id === test.versionA);
  const versionB = state.versions.find(v => v.id === test.versionB);

  // Mock statistical data
  const mockStats = {
    versionA: {
      responses: 150,
      avgQuality: 7.8,
      avgResponseTime: 1200,
      conversionRate: 68.5
    },
    versionB: {
      responses: 142,
      avgQuality: 8.3,
      avgResponseTime: 1450,
      conversionRate: 74.2
    },
    confidence: 89.3,
    significance: 0.05,
    winner: 'B'
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Test Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{test.name}</h2>
            <p className="text-sm text-gray-500">
              Running since {format(test.createdAt, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Settings size={16} />
            </button>
            <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Statistical Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4">Statistical Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mockStats.confidence}%
              </div>
              <div className="text-sm text-gray-500">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {mockStats.versionA.responses + mockStats.versionB.responses}
              </div>
              <div className="text-sm text-gray-500">Total Responses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                Version {mockStats.winner}
              </div>
              <div className="text-sm text-gray-500">Winner</div>
            </div>
          </div>
        </div>

        {/* Version Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Version A */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Version A</h3>
              <span className="text-sm text-gray-500">{versionA?.name}</span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-bold">{mockStats.versionA.responses}</div>
                  <div className="text-sm text-gray-500">Responses</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{mockStats.versionA.avgQuality}</div>
                  <div className="text-sm text-gray-500">Avg Quality</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{mockStats.versionA.avgResponseTime}ms</div>
                  <div className="text-sm text-gray-500">Response Time</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{mockStats.versionA.conversionRate}%</div>
                  <div className="text-sm text-gray-500">Success Rate</div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm font-mono">
                {versionA?.content.substring(0, 150)}...
              </div>
            </div>
          </div>

          {/* Version B */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Version B</h3>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Winner</span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-bold">{mockStats.versionB.responses}</div>
                  <div className="text-sm text-gray-500">Responses</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {mockStats.versionB.avgQuality}
                  </div>
                  <div className="text-sm text-gray-500">Avg Quality</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{mockStats.versionB.avgResponseTime}ms</div>
                  <div className="text-sm text-gray-500">Response Time</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {mockStats.versionB.conversionRate}%
                  </div>
                  <div className="text-sm text-gray-500">Success Rate</div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm font-mono">
                {versionB?.content.substring(0, 150)}...
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4">Performance Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-center text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
              <p>Performance chart would be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateTestModal: React.FC<{
  onClose: () => void;
  versions: PromptVersion[];
}> = ({ onClose, versions }) => {
  const [testName, setTestName] = useState('');
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');

  const handleCreate = () => {
    // Handle test creation logic here
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-semibold mb-4">Create A/B Test</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Name</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter test name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Version A</label>
            <select
              value={versionA}
              onChange={(e) => setVersionA(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Select version...</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Version B</label>
            <select
              value={versionB}
              onChange={(e) => setVersionB(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Select version...</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!testName || !versionA || !versionB}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Test
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ABTests;