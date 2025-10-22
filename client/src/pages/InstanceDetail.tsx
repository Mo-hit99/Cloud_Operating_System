import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Instance } from '../types/instance';
import { OS_TEMPLATES } from '../data/osTemplates';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { Terminal } from '../components/Terminal';

export function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTerminal, setActiveTerminal] = useState(false);
  const { socket } = useSocket();

  const fetchInstance = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/instances/${id}`);
      setInstance(response.data);
    } catch (error) {
      console.error('Failed to fetch instance:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  useEffect(() => {
    if (socket) {
      socket.on('instance-status-changed', fetchInstance);
      return () => {
        socket.off('instance-status-changed', fetchInstance);
      };
    }
  }, [socket, fetchInstance]);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'terminate') => {
    if (!instance) return;

    setActionLoading(action);
    try {
      await api.post(`/instances/${instance.id}/${action}`);
      // Socket events will handle the update, no need for setTimeout
    } catch (error) {
      console.error(`Failed to ${action} instance:`, error);
      alert(`Failed to ${action} instance. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const getTemplate = () => {
    return OS_TEMPLATES.find(t => t.id === instance?.templateId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100 border-green-200';
      case 'stopped': return 'text-red-600 bg-red-100 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'terminated': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
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

  const getGradientClass = (color: string) => {
    switch (color) {
      case 'orange': return 'from-orange-500 to-red-500';
      case 'blue': return 'from-blue-500 to-cyan-500';
      case 'red': return 'from-red-500 to-pink-500';
      case 'purple': return 'from-purple-500 to-indigo-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Instance not found</h1>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const template = getTemplate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{instance.name}</h1>
              <p className="text-gray-600 mt-2">
                Created {new Date(instance.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(instance.status)}`}>
              {getStatusIcon(instance.status)} {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Instance Overview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {template && (
                <div className={`bg-gradient-to-r ${getGradientClass(template.color)} p-6 text-white`}>
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">{template.icon}</span>
                    <div>
                      <h3 className="text-2xl font-bold">{template.name}</h3>
                      <p className="text-white/80">{template.category}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{instance.specs.cpu}</div>
                    <div className="text-sm text-gray-500">CPU</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{instance.specs.memory}</div>
                    <div className="text-sm text-gray-500">Memory</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{instance.specs.storage}</div>
                    <div className="text-sm text-gray-500">Storage</div>
                  </div>
                </div>

                {/* Network Information */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Network Configuration</h4>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-500">Ports:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded border">
                        {instance.ports.join(', ')}
                      </span>
                    </div>
                    {instance.accessUrl && (
                      <div className="flex items-center space-x-2 text-sm mt-2">
                        <span className="text-gray-500">Access URL:</span>
                        <span className="font-mono bg-white px-2 py-1 rounded border">
                          {instance.accessUrl}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Access Methods */}
                {instance.status === 'running' && (
                  <div className="space-y-3">
                    {instance.accessUrl && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700 font-medium">🌐 Web Access Ready</span>
                          <a
                            href={instance.accessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Open Browser
                            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    )}

                    {template?.id !== 'tor-service' && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-green-700 font-medium">💻 Terminal Access</span>
                          <button
                            onClick={() => setActiveTerminal(!activeTerminal)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            {activeTerminal ? 'Close Terminal' : 'Open Terminal'}
                            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Terminal */}
            {activeTerminal && instance.status === 'running' && instance.containerName && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <Terminal
                  containerId={instance.containerId || instance.containerName}
                  containerName={instance.name}
                  onClose={() => setActiveTerminal(false)}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {instance.status === 'stopped' && (
                  <button
                    onClick={() => handleAction('start')}
                    disabled={actionLoading === 'start'}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {actionLoading === 'start' ? 'Starting...' : '▶️ Start Instance'}
                  </button>
                )}

                {instance.status === 'running' && (
                  <>
                    <button
                      onClick={() => handleAction('restart')}
                      disabled={actionLoading === 'restart'}
                      className="w-full bg-yellow-600 text-white py-3 px-4 rounded-xl hover:bg-yellow-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      {actionLoading === 'restart' ? 'Restarting...' : '🔄 Restart Instance'}
                    </button>
                    
                    <button
                      onClick={() => handleAction('stop')}
                      disabled={actionLoading === 'stop'}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      {actionLoading === 'stop' ? 'Stopping...' : '⏹️ Stop Instance'}
                    </button>
                  </>
                )}

                {instance.status !== 'terminated' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to terminate this instance? This action cannot be undone.')) {
                        handleAction('terminate');
                      }
                    }}
                    disabled={actionLoading === 'terminate'}
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-xl hover:bg-gray-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {actionLoading === 'terminate' ? 'Terminating...' : '🗑️ Terminate Instance'}
                  </button>
                )}
              </div>
            </div>

            {/* Instance Details */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Instance Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Instance ID:</span>
                  <span className="font-mono text-xs">{instance.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Template:</span>
                  <span className="font-medium">{template?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium">{instance.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">{new Date(instance.createdAt).toLocaleDateString()}</span>
                </div>
                {instance.lastStarted && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Started:</span>
                    <span className="font-medium">{new Date(instance.lastStarted).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Features */}
            {template && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Features</h3>
                
                <ul className="space-y-2">
                  {template.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm">
                      <span className="text-green-500">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}