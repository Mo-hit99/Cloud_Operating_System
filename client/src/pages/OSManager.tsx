import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { Terminal } from '../components/Terminal';
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

const OS_INSTANCES: OSInstance[] = [
  {
    id: 'ubuntu-desktop',
    name: 'Ubuntu Linux',
    description: 'Ubuntu Desktop with LXDE via browser',
    category: 'Linux OS',
    ports: [3002],
    accessUrl: 'http://localhost:3002',
    status: 'stopped',
    containerName: 'ubuntu-desktop'
  },
  {
    id: 'alpine-desktop',
    name: 'Alpine Linux',
    description: 'Lightweight Alpine Linux Desktop',
    category: 'Linux OS',
    ports: [3001],
    accessUrl: 'http://localhost:3001',
    status: 'stopped',
    containerName: 'alpine-desktop'
  },
  {
    id: 'debian-desktop',
    name: 'Debian Linux',
    description: 'Debian Desktop with XFCE',
    category: 'Linux OS',
    ports: [3003],
    accessUrl: 'http://localhost:3003/vnc.html',
    status: 'stopped',
    containerName: 'debian-desktop'
  },
  {
    id: 'tor-service',
    name: 'Tor Service',
    description: 'Anonymous browsing proxy service',
    category: 'Network Service',
    ports: [9050, 9051],
    status: 'stopped',
    containerName: 'tor-service'
  }
];

export function OSManager() {
  const [instances, setInstances] = useState<OSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTerminals, setActiveTerminals] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { socket } = useSocket();

  const fetchInstances = useCallback(async () => {
    try {
      const response = await api.get('/services');
      setInstances(response.data);
    } catch (error) {
      console.error('Failed to fetch OS instances:', error);
      setInstances(OS_INSTANCES.map(os => ({ ...os, status: 'stopped' })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
    // Increased interval since we have real-time socket updates
    const interval = setInterval(fetchInstances, 30000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  useEffect(() => {
    if (socket) {
      socket.on('service-status-changed', fetchInstances);
      return () => {
        socket.off('service-status-changed', fetchInstances);
      };
    }
  }, [socket, fetchInstances]);

  const handleAction = async (instanceId: string, action: 'start' | 'stop') => {
    setActionLoading(instanceId);
    try {
      await api.post(`/services/${instanceId}/${action}`);
      // Socket events will handle the update, no need for setTimeout
    } catch (error) {
      console.error(`Failed to ${action} instance:`, error);
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

  const openTerminal = (instanceId: string) => {
    setActiveTerminals(prev => {
      const newSet = new Set(prev);
      newSet.add(instanceId);
      return newSet;
    });
  };

  const closeTerminal = (instanceId: string) => {
    setActiveTerminals(prev => {
      const newSet = new Set(prev);
      newSet.delete(instanceId);
      return newSet;
    });
  };

  const getOSDescription = (id: string) => {
    switch (id) {
      case 'ubuntu-desktop': 
        return {
          description: 'Full Ubuntu Desktop with LXDE environment accessible via web browser',
          features: ['Web-based VNC access', 'Full desktop environment', 'Package management with apt'],
          color: 'orange'
        };
      case 'alpine-desktop':
        return {
          description: 'Lightweight Alpine Linux with minimal desktop environment',
          features: ['Ultra-lightweight', 'Security-focused', 'Package management with apk'],
          color: 'blue'
        };
      case 'debian-desktop':
        return {
          description: 'Stable Debian system with XFCE desktop environment',
          features: ['Rock-solid stability', 'XFCE desktop', 'Package management with apt'],
          color: 'red'
        };
      case 'tor-service':
        return {
          description: 'Anonymous browsing proxy service for privacy protection',
          features: ['SOCKS5 proxy', 'Anonymous browsing', 'Privacy protection'],
          color: 'purple'
        };
      default:
        return {
          description: 'Container service',
          features: [],
          color: 'gray'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ResponsiveContainer>
        {/* Header Section */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Operating Systems
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-4">
            Launch and manage Linux desktop environments with integrated terminal access
          </p>
          
          {/* View Toggle */}
          <div className="flex justify-center items-center space-x-4 mb-4">
            <div className="flex bg-white rounded-lg p-1 shadow-md border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">⊞</span>
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">☰</span>
                List View
              </button>
            </div>
          </div>
        </div>

        {/* Instances Grid/List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'}>
        {instances.map(instance => {
          const osInfo = getOSDescription(instance.id);
          const isTerminalOpen = activeTerminals.has(instance.id);
          
          return (
            <div key={instance.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${
                osInfo.color === 'orange' ? 'from-orange-500 to-red-500' :
                osInfo.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                osInfo.color === 'red' ? 'from-red-500 to-pink-500' :
                osInfo.color === 'purple' ? 'from-purple-500 to-indigo-500' :
                'from-gray-500 to-gray-600'
              } p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getOSIcon(instance.id)}</span>
                    <div>
                      <h3 className="text-lg font-bold">{instance.name}</h3>
                      <p className="text-white/80 text-sm">{instance.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      instance.status === 'running' 
                        ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                        : 'bg-red-500/20 text-red-100 border border-red-400/30'
                    }`}>
                      {instance.status === 'running' ? '● Running' : '○ Stopped'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-gray-700 mb-3 text-sm">{osInfo.description}</p>

                {/* Features */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {osInfo.features.slice(0, 2).map((feature, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                    {osInfo.features.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        +{osInfo.features.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Port Information */}
                <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <span className="font-medium">📡 Ports:</span>
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-xs">
                      {instance.ports.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Access Information */}
                {instance.status === 'running' && (
                  <div className="mb-4 space-y-2">
                    {instance.accessUrl && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700 font-medium text-xs">🌐 Web Access Ready</span>
                          <a
                            href={instance.accessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            Open Browser
                            <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    )}

                    {instance.id !== 'tor-service' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-green-700 font-medium text-xs">💻 Terminal Access</span>
                          <button
                            onClick={() => openTerminal(instance.id)}
                            disabled={isTerminalOpen}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isTerminalOpen ? 'Terminal Open' : 'Open Terminal'}
                            <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {instance.id === 'tor-service' && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-xs text-purple-700 space-y-1">
                          <p><strong>SOCKS5 Proxy:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-xs">localhost:9050</code></p>
                          <p><strong>Control Port:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-xs">localhost:9051</code></p>
                          <p className="text-xs text-purple-600">Configure your browser to use this proxy for anonymous browsing</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {instance.status === 'running' ? (
                    <button
                      onClick={() => handleAction(instance.id, 'stop')}
                      disabled={actionLoading === instance.id}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-all duration-200 text-sm"
                    >
                      {actionLoading === instance.id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Stopping...
                        </span>
                      ) : (
                        '⏹️ Stop Container'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(instance.id, 'start')}
                      disabled={actionLoading === instance.id}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-all duration-200 text-sm"
                    >
                      {actionLoading === instance.id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Starting...
                        </span>
                      ) : (
                        '▶️ Start Container'
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Terminal Section */}
              {isTerminalOpen && instance.status === 'running' && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <Terminal
                    containerId={instance.containerId || instance.containerName}
                    containerName={instance.name}
                    onClose={() => closeTerminal(instance.id)}
                  />
                </div>
              )}
            </div>
          );
          })}
        </div>

        {/* Enhanced Quick Start Guide */}
        <div className="mt-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-4 text-center">
              🚀 Quick Start Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-200">
                <div className="text-2xl mb-2">🐧</div>
                <h4 className="font-bold mb-1 text-sm">Linux Desktop Systems</h4>
                <ul className="text-white/80 text-xs space-y-1">
                  <li>• Click "Start Container" to launch</li>
                  <li>• Use "Open Browser" for GUI access</li>
                  <li>• Use "Open Terminal" for CLI access</li>
                  <li>• Full desktop environment available</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-200">
                <div className="text-2xl mb-2">💻</div>
                <h4 className="font-bold mb-1 text-sm">Terminal Access</h4>
                <ul className="text-white/80 text-xs space-y-1">
                  <li>• Interactive bash terminal</li>
                  <li>• Full command-line access</li>
                  <li>• Install packages and tools</li>
                  <li>• Real-time command execution</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-200">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="font-bold mb-1 text-sm">Tor Service</h4>
                <ul className="text-white/80 text-xs space-y-1">
                  <li>• SOCKS5 proxy on port 9050</li>
                  <li>• Configure browser proxy settings</li>
                  <li>• Anonymous web browsing</li>
                  <li>• Privacy protection enabled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}