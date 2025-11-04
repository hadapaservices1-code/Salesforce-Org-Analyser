'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { 
  LockClosedIcon, 
  DevicePhoneMobileIcon, 
  KeyIcon, 
  ClockIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/Card';
import { formatNumber, formatDate } from '@/lib/utils';

interface ScanOutput {
  orgInfo: {
    edition: string;
    userCount: number;
    instanceName: string;
  };
  objects: Array<{
    name: string;
    label: string;
    recordCount: number;
  }>;
  flows: any[];
  triggers: any[];
  validationRules: any[];
  profiles: any[];
  blockers: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  scannedAt: string;
  scanDuration: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState<ScanOutput | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    orgName?: string;
    instanceUrl?: string;
    message?: string;
  } | null>(null);

  const { data: scansData, mutate } = useSWR('/api/scans', fetcher);
  const { data: statusData } = useSWR('/api/auth/status', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (statusData) {
      setConnectionStatus(statusData);
    }
  }, [statusData]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanProgress('Initializing scan...');
    
    try {
      const response = await fetch('/api/scan', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Scan failed');
      }
      
      if (data.scan) {
        setScanProgress('Scan completed! Loading results...');
        setCurrentScan(data.scan);
        // Refresh scans list and other data
        mutate();
        // Also refresh connection status to show updated org info
        setTimeout(() => {
          setScanProgress('');
          setIsScanning(false);
        }, 1000);
      } else {
        throw new Error(data.message || 'Scan completed but no data returned');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setScanError(
        error instanceof Error 
          ? error.message 
          : 'Failed to scan org. Please check your connection and try again.'
      );
      setScanProgress('');
      setIsScanning(false);
    }
  };

  const handleDownload = (scanId: string, format: 'json' | 'md') => {
    window.open(`/api/report?scanId=${scanId}&format=${format}`, '_blank');
  };

  const latestScan = currentScan || scansData?.scans?.[0]?.rawJson;
  const userName = 'Salesforce Org';

  const quickActions = [
    { name: 'My Password', icon: LockClosedIcon, href: '#' },
    { name: 'Devices', icon: DevicePhoneMobileIcon, href: '#' },
    { name: 'Password Manager', icon: KeyIcon, href: '#' },
    { name: 'My Activity', icon: ClockIcon, href: '#' },
    { name: 'Email', icon: EnvelopeIcon, href: '#' },
  ];

  return (
    <div className="p-8">
      {/* Connection Status Banner */}
      {connectionStatus && (
        <div className={`max-w-4xl mx-auto mb-6 p-4 rounded-lg border-2 ${
          connectionStatus.connected 
            ? 'bg-green-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <div className={`font-medium ${
                  connectionStatus.connected ? 'text-green-800' : 'text-red-800'
                }`}>
                  {connectionStatus.connected ? '✅ Connected to Salesforce' : '❌ Not Connected'}
                </div>
                {connectionStatus.connected && connectionStatus.orgName && (
                  <div className="text-sm text-green-700 mt-1">
                    {connectionStatus.orgName} • {connectionStatus.instanceUrl}
                  </div>
                )}
                {!connectionStatus.connected && (
                  <div className="text-sm text-red-700 mt-1">
                    {connectionStatus.message || 'Please connect to Salesforce to start scanning'}
                  </div>
                )}
              </div>
            </div>
            {!connectionStatus.connected && (
              <button
                onClick={() => router.push('/connect')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Connect Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-3xl font-semibold">
            {connectionStatus?.orgName?.charAt(0).toUpperCase() || 'S'}
          </span>
        </div>
        <h1 className="text-3xl font-normal text-gray-900 mb-2">
          Welcome, {connectionStatus?.orgName || userName}
        </h1>
        <p className="text-base text-gray-600 mb-1">
          Manage your org info, security, and migration planning to make Salesforce work better for you.
        </p>
        <a href="#" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center">
          Learn more
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </a>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Org Analyzer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="google-input pl-12"
          />
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="max-w-2xl mx-auto mb-8 flex flex-wrap gap-2 justify-center">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.name}
              className="google-button flex items-center"
            >
              <Icon className="h-4 w-4 mr-2 text-gray-600" />
              {action.name}
            </button>
          );
        })}
      </div>

      {/* Main Content Cards */}
      {!latestScan ? (
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {connectionStatus?.connected 
                ? 'No scan data available. Run your first scan to analyze your Salesforce org.' 
                : 'Connect to Salesforce to start scanning your org'}
            </p>
            
            {/* Scan Error Message */}
            {scanError && (
              <div className="max-w-md mx-auto mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{scanError}</p>
              </div>
            )}
            
            {/* Scan Progress */}
            {isScanning && scanProgress && (
              <div className="max-w-md mx-auto mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <p className="text-sm text-blue-800">{scanProgress}</p>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This may take a few minutes depending on your org size...
                </p>
              </div>
            )}
            
            <button
              onClick={handleScan}
              disabled={isScanning || !connectionStatus?.connected}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isScanning 
                ? 'Scanning...' 
                : connectionStatus?.connected 
                  ? 'Start Your First Scan' 
                  : 'Connect to Start Scanning'}
            </button>
            
            {connectionStatus?.connected && !isScanning && (
              <p className="text-xs text-gray-500 mt-4">
                The scan will collect org info, ALL objects and fields, automations, profiles, roles, and more.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card
              title="Privacy & personalization"
              description="See the data in your Salesforce org and choose what activity is saved to personalize your experience"
              icon={
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">G</span>
                  </div>
                </div>
              }
              action={{
                label: 'Manage your data & privacy',
                href: '/dashboard/privacy'
              }}
            />

            <Card
              title={latestScan.blockers.length > 0 ? "You have migration blockers" : "Security status"}
              description={latestScan.blockers.length > 0 
                ? `${latestScan.blockers.length} migration blocker(s) found in the Security Checkup`
                : 'No security issues found in the Security Checkup'
              }
              icon={
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <ShieldCheckIcon className="h-8 w-8 text-white" />
                </div>
              }
              action={{
                label: latestScan.blockers.length > 0 ? 'Review blockers' : 'Review security tips',
                href: '/dashboard/security'
              }}
            />
          </div>

          {/* Stats Cards */}
          <div className="max-w-4xl mx-auto">
            <div className="google-card mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Org Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(latestScan.objects.length)}</div>
                  <div className="text-sm text-gray-600 mt-1">Objects</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(latestScan.flows.length + latestScan.triggers.length + latestScan.validationRules.length)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Automations</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{formatNumber(latestScan.blockers.length)}</div>
                  <div className="text-sm text-gray-600 mt-1">Blockers</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(latestScan.orgInfo.userCount)}</div>
                  <div className="text-sm text-gray-600 mt-1">Users</div>
                </div>
              </div>
            </div>

            {/* Scan Error Message */}
            {scanError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{scanError}</p>
              </div>
            )}
            
            {/* Scan Progress */}
            {isScanning && scanProgress && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <p className="text-sm text-blue-800">{scanProgress}</p>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This may take a few minutes depending on your org size...
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleScan}
                disabled={isScanning || !connectionStatus?.connected}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isScanning ? 'Scanning...' : 'Run New Scan'}
              </button>
              {scansData?.scans?.[0]?.id && (
                <>
                  <button
                    onClick={() => handleDownload(scansData.scans[0].id, 'json')}
                    className="google-button"
                  >
                    Download JSON
                  </button>
                  <button
                    onClick={() => handleDownload(scansData.scans[0].id, 'md')}
                    className="google-button"
                  >
                    Download Markdown
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}