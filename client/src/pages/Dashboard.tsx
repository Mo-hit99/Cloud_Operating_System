import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instance } from '../types/instance';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { InboxWidget } from '../components/InboxWidget';
import { DonutChart, BarChart, MetricCard } from '../components/Charts';
import { PageLoader } from '../components/LoadingSpinner';
import { ResponsiveContainer } from '../components/ResponsiveContainer';

interface OSInstance {
  id: string;
  name: string;
  description: string;
  category: string;
  ports: number[];
  accessUrl?: string;
  status: 'running' | 'stopped';
  containerName: string;
  containerId?: string;
}

export function Dashboard() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [osInstances, setOsInstances] = useState<OSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    pending: 0,
    osRunning: 0,
    osTotal: 0
  });
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      // Fetch regular instances
      const instancesResponse = await api.get('/instances');
      const instanceData = instancesResponse.data;
      setInstances(instanceData);
      
      // Fetch OS services
      const servicesResponse = await api.get('/services');
      const osData = servicesResponse.data;
      setOsInstances(osData);
      
      // Calculate stats
      const total = instanceData.length;
      const running = instanceData.filter((i: Instance) => i.status === 'running').length;
      const stopped = instanceData.filter((i: Instance) => i.status === 'stopped').length;
      const pending = instanceData.filter((i: Instance) => i.status === 'pending').length;
      
      const osTotal = osData.length;
      const osRunning = osData.filter((i: OSInstance) => i.status === 'running').length;
      
      setStats({ total, running, stopped, pending, osTotal, osRunning });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setInstances([]);
      setOsInstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Increased interval since we have real-time socket updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (socket) {
      socket.on('instance-status-changed', fetchData);
      socket.on('service-status-changed', fetchData);
      return () => {
        socket.off('instance-status-changed', fetchData);
        socket.off('service-status-changed', fetchData);
      };
    }
  }, [socket, fetchData]);

  const createDefaultInstances = async () => {
    try {
      setLoading(true);
      await api.post('/instances/create-defaults');
      await fetchData();
    } catch (error) {
      console.error('Failed to create default instances:', error);
      alert('Failed to create default instances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOSAction = async (instanceId: string, action: 'start' | 'stop') => {
    setActionLoading(instanceId);
    try {
      await api.post(`/services/${instanceId}/${action}`);
      // Socket events will handle the update, no need for setTimeout
    } catch (error) {
      console.error(`Failed to ${action} OS instance:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const getOSIcon = (id: string) => {
    switch (id) {
      case 'ubuntu-desktop': return '🐧';
      case 'alpine-desktop': return '🏔️';
      case 'debian-desktop': return '🌀';
      case 'tor-service': return '🔒';
      default: return '💻';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'terminated': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '●';
      case 'stopped': return '○';
      case 'pending': return '◐';
      case 'terminated': return '✕';
      default: return '?';
    }
  };

  if (loading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ResponsiveContainer>
        {/* Welcome Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                    Welcome back, {user?.username || 'User'}! 👋
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base">
                    Manage your containers and services from one place
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-4xl">🚀</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Services"
            value={stats.total + stats.osTotal}
            subtitle="Containers + OS"
            icon="📊"
            color="#3B82F6"
            trend={{ value: 12, isPositive: true }}
          />
          
          <MetricCard
            title="Running"
            value={stats.running + stats.osRunning}
            subtitle="Active services"
            icon="▶️"
            color="#10B981"
            trend={{ value: 8, isPositive: true }}
          />
          
          <MetricCard
            title="OS Systems"
            value={stats.osTotal}
            subtitle={`${stats.osRunning} running`}
            icon="🐧"
            color="#8B5CF6"
          />
          
          <MetricCard
            title="Containers"
            value={stats.total}
            subtitle={`${stats.running} active`}
            icon="📦"
            color="#F59E0B"
          />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DonutChart
            title="Service Distribution"
            data={[
              { label: 'Running', value: stats.running + stats.osRunning, color: '#10B981' },
              { label: 'Stopped', value: (stats.total + stats.osTotal) - (stats.running + stats.osRunning), color: '#EF4444' },
              { label: 'Pending', value: stats.pending, color: '#F59E0B' }
            ]}
            centerValue={`${stats.running + stats.osRunning}`}
            centerLabel="Active"
          />
          
          <BarChart
            title="Resource Usage"
            data={[
              { label: 'CPU Usage', value: 65, color: '#3B82F6' },
              { label: 'Memory', value: 78, color: '#8B5CF6' },
              { label: 'Storage', value: 45, color: '#10B981' },
              { label: 'Network', value: 32, color: '#F59E0B' }
            ]}
            maxValue={100}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* OS Systems Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Operating Systems</h2>
                    <p className="text-xs text-gray-600">Linux desktop environments and services</p>
                  </div>
                  <button
                    onClick={() => navigate('/instances')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                  >
                    View All →
                  </button>
                </div>
              </div>

              <div className="p-4">
                {osInstances.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg">🐧</span>
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">No OS systems available</h3>
                    <p className="text-gray-500 mb-3 text-sm">Start with pre-configured Linux systems</p>
                    <button
                      onClick={() => navigate('/instances')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 text-sm"
                    >
                      Browse OS Systems
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {osInstances.slice(0, 4).map((osInstance) => (
                      <div key={osInstance.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getOSIcon(osInstance.id)}</span>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm">{osInstance.name}</h4>
                              <p className="text-xs text-gray-500">{osInstance.category}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            osInstance.status === 'running' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {osInstance.status === 'running' ? '● Running' : '○ Stopped'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{osInstance.description}</p>
                        
                        <div className="flex space-x-1.5">
                          {osInstance.status === 'running' ? (
                            <>
                              {osInstance.accessUrl && (
                                <a
                                  href={osInstance.accessUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 bg-blue-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-blue-700 transition-colors text-center"
                                >
                                  Open
                                </a>
                              )}
                              <button
                                onClick={() => handleOSAction(osInstance.id, 'stop')}
                                disabled={actionLoading === osInstance.id}
                                className="flex-1 bg-red-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === osInstance.id ? 'Stopping...' : 'Stop'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOSAction(osInstance.id, 'start')}
                              disabled={actionLoading === osInstance.id}
                              className="w-full bg-green-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === osInstance.id ? 'Starting...' : 'Start'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Inbox Widget */}
            <InboxWidget />

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/launch')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                >
                  <span>🚀</span>
                  <span>Launch Instance</span>
                </button>
                
                <button
                  onClick={() => navigate('/instances')}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 px-3 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                >
                  <span>🐧</span>
                  <span>OS Manager</span>
                </button>
                
                <button
                  onClick={createDefaultInstances}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-2.5 px-3 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                >
                  <span>⚡</span>
                  <span>{loading ? 'Creating...' : 'Create Defaults'}</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Docker Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    ● Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Network</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    ● Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Storage</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Container Instances */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Container Instances</h2>
                <p className="text-xs text-gray-600">Custom containers and applications</p>
              </div>
              <button
                onClick={() => navigate('/launch')}
                className="text-orange-600 hover:text-orange-700 font-medium text-xs"
              >
                Launch New →
              </button>
            </div>
          </div>

          {instances.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">No container instances</h3>
              <p className="text-gray-500 mb-4 text-sm">Create custom containers for your applications</p>
              <button
                onClick={() => navigate('/launch')}
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 text-sm"
              >
                Launch First Container
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {instances.map((instance) => (
                <div key={instance.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {instance.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{instance.name}</h3>
                        <p className="text-xs text-gray-500">
                          Created {new Date(instance.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-900">{instance.specs.cpu}</p>
                        <p className="text-xs text-gray-500">{instance.specs.memory}</p>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(instance.status)}`}>
                        {getStatusIcon(instance.status)} {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                      </span>

                      <button
                        onClick={() => navigate(`/instances/${instance.id}`)}
                        className="text-orange-600 hover:text-orange-700 font-medium text-xs"
                      >
                        Manage →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-4 text-center">Platform Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-200">
                <div className="text-2xl mb-2">🐧</div>
                <h4 className="font-bold mb-1 text-sm">Linux Desktop</h4>
                <p className="text-white/80 text-xs">Full desktop environments accessible via web browser with VNC</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-200">
                <div className="text-2xl mb-2">💻</div>
                <h4 className="font-bold mb-1 text-sm">Terminal Access</h4>
                <p className="text-white/80 text-xs">Interactive terminal sessions with full command-line access</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-200">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="font-bold mb-1 text-sm">Privacy Tools</h4>
                <p className="text-white/80 text-xs">Tor proxy service for anonymous browsing and privacy protection</p>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}