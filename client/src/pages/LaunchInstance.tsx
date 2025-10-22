import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OS_TEMPLATES } from '../data/osTemplates';
import { OSTemplate, InstanceCreationRequest } from '../types/instance';
import { api } from '../services/api';
import { ResponsiveContainer } from '../components/ResponsiveContainer';

export function LaunchInstance() {
  const [selectedTemplate, setSelectedTemplate] = useState<OSTemplate | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTemplateSelect = (template: OSTemplate) => {
    setSelectedTemplate(template);
    setInstanceName(`${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`);
    setStep(2);
  };

  const handleLaunch = async () => {
    if (!selectedTemplate || !instanceName.trim()) return;

    setLoading(true);
    try {
      const request: InstanceCreationRequest = {
        templateId: selectedTemplate.id,
        name: instanceName.trim(),
        specs: selectedTemplate.specs,
        environment: selectedTemplate.defaultConfig.environment
      };

      const response = await api.post('/instances', request);
      navigate(`/instances/${response.data.id}`);
    } catch (error) {
      console.error('Failed to launch instance:', error);
      alert('Failed to launch instance. Please try again.');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ResponsiveContainer>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => step === 1 ? navigate('/') : setStep(1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-3"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Launch New Instance
          </h1>
          <p className="text-gray-600 text-sm">Choose an operating system template and configure your container</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Choose Template</span>
            <span>Configure Instance</span>
            <span>Launch</span>
          </div>
        </div>

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Choose an Operating System</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {OS_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                >
                  {/* Template Header */}
                  <div className={`bg-gradient-to-r ${getGradientClass(template.color)} p-4 text-white`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold">{template.name}</h3>
                        <p className="text-white/80 text-sm">{template.category}</p>
                      </div>
                    </div>
                  </div>

                  {/* Template Body */}
                  <div className="p-4">
                    <p className="text-gray-700 mb-3 text-sm">{template.description}</p>

                    {/* Specs */}
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-900 mb-2">Specifications:</h4>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">CPU:</span>
                          <span className="font-medium">{template.specs.cpu}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">Memory:</span>
                          <span className="font-medium">{template.specs.memory}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">Storage:</span>
                          <span className="font-medium">{template.specs.storage}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">Network:</span>
                          <span className="font-medium">{template.specs.network}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-2">Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 2).map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {feature}
                          </span>
                        ))}
                        {template.features.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            +{template.features.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>

                    <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm">
                      Select Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && selectedTemplate && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Configure Your Instance</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Instance Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Instance Name
                      </label>
                      <input
                        type="text"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Enter instance name"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Choose a unique name for your instance
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Resource Allocation
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-xs text-gray-500">CPU</div>
                          <div className="font-semibold text-sm">{selectedTemplate.specs.cpu}</div>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-xs text-gray-500">Memory</div>
                          <div className="font-semibold text-sm">{selectedTemplate.specs.memory}</div>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-xs text-gray-500">Storage</div>
                          <div className="font-semibold text-sm">{selectedTemplate.specs.storage}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Network Configuration
                      </label>
                      <div className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-500">Ports:</span>
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                            {selectedTemplate.ports.join(', ')}
                          </span>
                        </div>
                        {selectedTemplate.accessUrl && (
                          <div className="flex items-center space-x-2 text-xs mt-2">
                            <span className="text-gray-500">Access URL:</span>
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                              {selectedTemplate.accessUrl}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!instanceName.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>

              {/* Template Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sticky top-8">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Selected Template</h3>
                  
                  <div className={`bg-gradient-to-r ${getGradientClass(selectedTemplate.color)} p-3 rounded-lg text-white mb-3`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{selectedTemplate.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm">{selectedTemplate.name}</h4>
                        <p className="text-white/80 text-xs">{selectedTemplate.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-semibold text-gray-900 text-xs">Features:</h5>
                    <ul className="space-y-1">
                      {selectedTemplate.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-xs">
                          <span className="text-green-500">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review and Launch */}
        {step === 3 && selectedTemplate && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review and Launch</h2>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Instance Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Instance Details</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{instanceName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Template:</span>
                      <span className="font-medium">{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium">{selectedTemplate.category}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Resource Allocation</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">CPU:</span>
                      <span className="font-medium">{selectedTemplate.specs.cpu}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Memory:</span>
                      <span className="font-medium">{selectedTemplate.specs.memory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Storage:</span>
                      <span className="font-medium">{selectedTemplate.specs.storage}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Launching...
                      </span>
                    ) : (
                      '🚀 Launch Instance'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}