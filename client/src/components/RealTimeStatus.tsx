import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface ContainerStatus {
  id: string;
  name: string;
  status: string;
  state: string;
  ports: any[];
  created: string;
}

interface ServiceStatus {
  serviceId: string;
  status: 'running' | 'stopped';
  timestamp: string;
}

export function RealTimeStatus() {
  const [containers, setContainers] = useState<ContainerStatus[]>([]);
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [connected, setConnected] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('connection-established', (data) => {
        console.log('Real-time connection established:', data.message);
        setConnected(true);
      });

      socket.on('container-status-update', (containerStatuses: ContainerStatus[]) => {
        setContainers(containerStatuses);
      });

      socket.on('service-status-changed', (serviceStatus: ServiceStatus) => {
        setServices(prev => ({
          ...prev,
          [serviceStatus.serviceId]: serviceStatus
        }));
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      return () => {
        socket.off('connection-established');
        socket.off('container-status-update');
        socket.off('service-status-changed');
        socket.off('disconnect');
      };
    }
  }, [socket]);

  const getStatusColor = (status: string) => {
    if (status.includes('Up') || status === 'running') {
      return 'text-green-600 bg-green-100';
    } else if (status.includes('Exited') || status === 'stopped') {
      return 'text-red-600 bg-red-100';
    } else {
      return 'text-yellow-600 bg-yellow-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Real-Time Status</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Service Status */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Services</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(services).map(([serviceId, service]) => (
            <div key={serviceId} className="p-3 border rounded-lg">
              <div className="text-sm font-medium text-gray-900 capitalize">
                {serviceId.replace('-', ' ')}
              </div>
              <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getStatusColor(service.status)}`}>
                {service.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Container Status */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          All Containers ({containers.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {containers.length === 0 ? (
            <p className="text-gray-500 text-sm">No containers found</p>
          ) : (
            containers.map((container) => (
              <div key={container.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">
                    {container.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {container.id.substring(0, 12)}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {container.ports.length > 0 && (
                    <div className="text-xs text-blue-600">
                      Ports: {container.ports.map(p => p.PublicPort || p.PrivatePort).filter(Boolean).join(', ')}
                    </div>
                  )}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(container.status)}`}>
                    {container.state}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!connected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Real-time updates are not available. Please check your connection.
          </p>
        </div>
      )}
    </div>
  );
}