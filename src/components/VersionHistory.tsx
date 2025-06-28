import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  GitBranch, 
  Star,
  MessageSquare,
  BarChart3,
  Trash2,
  Copy,
  Edit3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../contexts/AppContext';
import { mockVersions } from '../utils/mockData';
import { PromptVersion } from '../types';

const VersionHistory: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (state.versions.length === 0) {
      mockVersions.forEach(version => {
        dispatch({ type: 'ADD_VERSION', payload: version });
      });
    }
  }, [state.versions.length, dispatch]);

  const handleVersionSelect = (version: PromptVersion) => {
    dispatch({ type: 'SET_CURRENT_VERSION', payload: version });
    setSelectedVersion(version.id);
  };

  const handleDeleteVersion = (versionId: string) => {
    dispatch({ type: 'DELETE_VERSION', payload: versionId });
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 8.5) return 'text-green-600 dark:text-green-400';
    if (quality >= 7.0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityIcon = (quality: number) => {
    if (quality >= 8.5) return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />;
    if (quality >= 7.0) return <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />;
    return <AlertCircle size={16} className="text-red-600 dark:text-red-400" />;
  };

  return (
    <div className="h-full flex">
      {/* Version List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Version History</h2>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showComparison 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Compare
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-full">
          {state.versions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleVersionSelect(version)}
              className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                selectedVersion === version.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-sm">{version.name}</h3>
                  {version.parentId && (
                    <GitBranch size={12} className="text-gray-400" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {version.metrics && getQualityIcon(version.metrics.quality)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVersion(version.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-2 flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Clock size={10} />
                  <span>{format(version.timestamp, 'MMM d, HH:mm')}</span>
                </span>
                <span>{version.model}</span>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {version.content}
              </p>
              
              {version.metrics && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className={`flex items-center space-x-1 ${getQualityColor(version.metrics.quality)}`}>
                    <BarChart3 size={10} />
                    <span>{version.metrics.quality.toFixed(1)}</span>
                  </span>
                  {version.responseTime && (
                    <span className="text-gray-500">
                      {version.responseTime}ms
                    </span>
                  )}
                </div>
              )}
              
              {version.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {version.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Version Details */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-800">
        {selectedVersion ? (
          <VersionDetails 
            version={state.versions.find(v => v.id === selectedVersion)!}
            onEdit={(version) => dispatch({ type: 'UPDATE_VERSION', payload: version })}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a version to view details
          </div>
        )}
      </div>
    </div>
  );
};

const VersionDetails: React.FC<{
  version: PromptVersion;
  onEdit: (version: PromptVersion) => void;
}> = ({ version, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedVersion, setEditedVersion] = useState(version);

  const handleSave = () => {
    onEdit(editedVersion);
    setIsEditing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            {isEditing ? (
              <input
                value={editedVersion.name}
                onChange={(e) => setEditedVersion({ ...editedVersion, name: e.target.value })}
                className="text-lg font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <h2 className="text-lg font-semibold">{version.name}</h2>
            )}
            <p className="text-sm text-gray-500">
              {format(version.timestamp, 'MMMM d, yyyy at HH:mm')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Edit3 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Metrics */}
        {version.metrics && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {version.metrics.quality.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {version.metrics.coherence.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Coherence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {version.metrics.relevance.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Relevance</div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3">Configuration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Model:</span>
              <span className="ml-2 font-mono">{version.model}</span>
            </div>
            <div>
              <span className="text-gray-500">Temperature:</span>
              <span className="ml-2 font-mono">{version.temperature}</span>
            </div>
            <div>
              <span className="text-gray-500">Max Tokens:</span>
              <span className="ml-2 font-mono">{version.maxTokens}</span>
            </div>
            {version.responseTime && (
              <div>
                <span className="text-gray-500">Response Time:</span>
                <span className="ml-2 font-mono">{version.responseTime}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Content */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3">Prompt Content</h3>
          {isEditing ? (
            <textarea
              value={editedVersion.content}
              onChange={(e) => setEditedVersion({ ...editedVersion, content: e.target.value })}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded border">
              {version.content}
            </pre>
          )}
        </div>

        {/* Response */}
        {version.response && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-3">Response</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border">
              {version.response}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3">Notes</h3>
          {isEditing ? (
            <textarea
              value={editedVersion.notes}
              onChange={(e) => setEditedVersion({ ...editedVersion, notes: e.target.value })}
              placeholder="Add notes about this version..."
              className="w-full h-20 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {version.notes || 'No notes added'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;