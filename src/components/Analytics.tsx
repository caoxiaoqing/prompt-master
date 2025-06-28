import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  Target,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';

const Analytics: React.FC = () => {
  const { state } = useApp();

  const analyticsData = useMemo(() => {
    const versionData = state.versions
      .filter(v => v.metrics)
      .map((version, index) => ({
        name: version.name,
        quality: version.metrics?.quality || 0,
        coherence: version.metrics?.coherence || 0,
        relevance: version.metrics?.relevance || 0,
        responseTime: version.responseTime || 0,
        tokens: version.tokenUsage?.total || 0,
        date: format(version.timestamp, 'MMM d'),
        version: index + 1
      }));

    const modelPerformance = state.versions.reduce((acc, version) => {
      if (!version.metrics) return acc;
      
      if (!acc[version.model]) {
        acc[version.model] = {
          model: version.model,
          avgQuality: 0,
          avgResponseTime: 0,
          count: 0,
          totalQuality: 0,
          totalResponseTime: 0
        };
      }
      
      acc[version.model].count++;
      acc[version.model].totalQuality += version.metrics.quality;
      acc[version.model].totalResponseTime += version.responseTime || 0;
      acc[version.model].avgQuality = acc[version.model].totalQuality / acc[version.model].count;
      acc[version.model].avgResponseTime = acc[version.model].totalResponseTime / acc[version.model].count;
      
      return acc;
    }, {} as any);

    return {
      versionData,
      modelPerformance: Object.values(modelPerformance)
    };
  }, [state.versions]);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Track prompt performance and optimization progress</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Calendar size={16} />
              <span>Last 30 days</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Filter size={16} />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Average Quality',
              value: state.versions.filter(v => v.metrics).length > 0 
                ? (state.versions.filter(v => v.metrics).reduce((sum, v) => sum + (v.metrics?.quality || 0), 0) / state.versions.filter(v => v.metrics).length).toFixed(1)
                : '0.0',
              change: '+12.5%',
              trend: 'up',
              icon: Target,
              color: 'text-green-600 dark:text-green-400'
            },
            {
              title: 'Avg Response Time',
              value: state.versions.filter(v => v.responseTime).length > 0
                ? Math.round(state.versions.filter(v => v.responseTime).reduce((sum, v) => sum + (v.responseTime || 0), 0) / state.versions.filter(v => v.responseTime).length) + 'ms'
                : '0ms',
              change: '-8.3%',
              trend: 'down',
              icon: Clock,
              color: 'text-blue-600 dark:text-blue-400'
            },
            {
              title: 'Total Versions',
              value: state.versions.length.toString(),
              change: '+' + state.versions.length,
              trend: 'up',
              icon: Zap,
              color: 'text-purple-600 dark:text-purple-400'
            },
            {
              title: 'Success Rate',
              value: '94.2%',
              change: '+2.1%',
              trend: 'up',
              icon: TrendingUp,
              color: 'text-orange-600 dark:text-orange-400'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-700 ${metric.color}`}>
                  <metric.icon size={20} />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className={`text-sm font-medium ${
                  metric.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {metric.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs last period</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quality Trend */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quality Improvement Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.versionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="quality" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="coherence" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="relevance" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Response Time Distribution */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Response Time by Version</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.versionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="responseTime" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Model Performance Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Model Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={analyticsData.modelPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="avgResponseTime" name="Avg Response Time" unit="ms" />
                <YAxis dataKey="avgQuality" name="Avg Quality" domain={[0, 10]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toFixed(2) : value,
                    name === 'avgQuality' ? 'Quality' : 'Response Time (ms)'
                  ]}
                />
                <Scatter dataKey="avgQuality" fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Model Distribution */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Model Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.modelPerformance}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  nameKey="model"
                >
                  {analyticsData.modelPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: '1px solid rgb(75 85 99)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</h3>
          <div className="space-y-4">
            {state.versions.slice(-5).reverse().map((version, index) => (
              <div key={version.id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Created version "{version.name}"
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(version.timestamp, 'MMM d, yyyy at HH:mm')} • {version.model}
                  </p>
                </div>
                {version.metrics && (
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    {version.metrics.quality.toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;