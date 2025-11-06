'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  
  // Initialize state from sessionStorage if available (for immediate UI rendering)
  const getInitialScanState = () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('isScanning') === 'true';
  };
  
  const getInitialScanId = () => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('activeScanId');
  };
  
  const getInitialProgress = () => {
    if (typeof window === 'undefined') return { percent: 0, currentProcess: '', scanProgress: '' };
    const savedProgress = sessionStorage.getItem('scanProgress');
    if (savedProgress) {
      try {
        return JSON.parse(savedProgress);
      } catch (e) {
        return { percent: 0, currentProcess: '', scanProgress: '' };
      }
    }
    return { percent: 0, currentProcess: '', scanProgress: '' };
  };
  
  const initialProgress = getInitialProgress();
  
  const [isScanning, setIsScanning] = useState(getInitialScanState);
  const [currentScan, setCurrentScan] = useState<ScanOutput | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<string>(initialProgress.scanProgress || '');
  const [scanProgressPercent, setScanProgressPercent] = useState(initialProgress.percent || 0);
  const [currentProcess, setCurrentProcess] = useState<string>(initialProgress.currentProcess || '');
  const [currentScanId, setCurrentScanId] = useState<string | null>(getInitialScanId);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    orgName?: string;
    instanceUrl?: string;
    message?: string;
  } | null>(null);

  const { data: scansData, mutate: mutateScans } = useSWR('/api/scans', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { data: latestScanData, mutate: mutateLatestScan } = useSWR('/api/scans/latest', fetcher, {
    refreshInterval: 120000, // Refresh every 2 minutes (optimized from 1 minute)
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { data: statusData } = useSWR('/api/auth/status', fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  useEffect(() => {
    if (statusData) {
      setConnectionStatus(statusData);
    }
  }, [statusData]);

  const reconnectToScan = useCallback((scanId: string) => {
    // Don't close existing connection if it's still open and connected to the same scan
    // This prevents unnecessary disconnections when switching tabs
    setEventSource((prevEs) => {
      if (prevEs && prevEs.readyState === EventSource.OPEN) {
        // Connection is still open, keep it
        return prevEs;
      }
      // Close old connection if it exists and is not open
      if (prevEs) {
        prevEs.close();
      }
      return null;
    });
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Small delay to ensure previous connection is cleaned up
    setTimeout(() => {
      const es = new EventSource(`/api/scan/progress?scanId=${scanId}`);
      setEventSource(es);
      
      const maxReconnectAttempts = 10; // Increased attempts for better reliability
      
      es.onopen = () => {
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        console.log('EventSource connected for scan:', scanId);
      };
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'progress') {
            setScanProgressPercent(data.progress || 0);
            // Use currentProcess if available, otherwise use step name as fallback
            const processText = data.currentProcess || (data.step ? `Scanning ${data.step.toLowerCase()}...` : '');
            setCurrentProcess(processText);
            setScanProgress(`${data.step || ''} - ${Math.round(data.progress || 0)}%`);
            
            // Update sessionStorage with latest progress to ensure persistence
            const savedScanId = sessionStorage.getItem('activeScanId');
            if (savedScanId === scanId) {
              sessionStorage.setItem('scanProgress', JSON.stringify({
                percent: data.progress || 0,
                currentProcess: processText,
                scanProgress: `${data.step || ''} - ${Math.round(data.progress || 0)}%`,
              }));
            }
          } else if (data.type === 'complete') {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            reconnectAttemptsRef.current = 0;
            es.close();
            setEventSource(null);
            setScanProgress('Scan completed successfully!');
            setScanProgressPercent(100);
            setCurrentProcess('Scan completed successfully');
            setIsScanning(false);
            
            if (data.result?.scan) {
              setCurrentScan(data.result.scan);
              // Refresh scans list and latest scan data
              mutateScans();
              mutateLatestScan();
            }
            
            // Clear sessionStorage
            sessionStorage.removeItem('activeScanId');
            sessionStorage.removeItem('isScanning');
            sessionStorage.removeItem('scanProgress');
            setCurrentScanId(null);
            
            // Show success message for 5 seconds
            setTimeout(() => {
              setScanProgress('');
              setScanProgressPercent(0);
              setCurrentProcess('');
            }, 5000);
          } else if (data.type === 'error') {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            reconnectAttemptsRef.current = 0;
            es.close();
            setEventSource(null);
            setScanError(data.message || 'Scan failed');
            setIsScanning(false);
            setCurrentScanId(null);
            sessionStorage.removeItem('activeScanId');
            sessionStorage.removeItem('isScanning');
            sessionStorage.removeItem('scanProgress');
          }
        } catch (error) {
          console.error('Error parsing progress data:', error);
        }
      };
      
      es.onerror = () => {
        const savedScanId = sessionStorage.getItem('activeScanId');
        const savedIsScanning = sessionStorage.getItem('isScanning');
        
        // Handle connection errors more aggressively
        // EventSource can fire onerror in various states, but we should reconnect if closed
        if (es.readyState === EventSource.CLOSED) {
          // Only attempt reconnection if scan is still active
          if (savedScanId && savedIsScanning === 'true' && savedScanId === scanId) {
            reconnectAttemptsRef.current++;
            
            if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
              // Faster reconnection with shorter delays: 500ms, 1s, 1.5s, 2s, etc.
              const delay = Math.min(500 * reconnectAttemptsRef.current, 3000);
              console.log(`Connection lost, reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectToScan(savedScanId);
              }, delay);
            } else {
              // Max reconnect attempts reached - but don't clear the scan state
              // The scan might still be running on the server
              console.warn('Max reconnect attempts reached for scan:', scanId);
              // Don't clear sessionStorage - let the user see the scan is still active
              // They can refresh the page to reconnect
              setScanError('Connection lost. The scan may still be running. Please refresh the page to reconnect.');
              // Keep isScanning true so UI shows the scan
              reconnectAttemptsRef.current = 0;
            }
          } else {
            // Scan is no longer active, clean up silently
            es.close();
            setEventSource(null);
            setIsScanning(false);
            setCurrentScanId(null);
            reconnectAttemptsRef.current = 0;
          }
        }
        // Note: CONNECTING state is handled by the periodic health check
        // which will detect and reconnect if stuck in CONNECTING state
      };
    }, 50); // Small delay to ensure cleanup
  }, [mutateScans, mutateLatestScan]);

  // Restore scan state from sessionStorage on mount and ensure it stays in sync
  useEffect(() => {
    const restoreScanState = () => {
      const savedScanId = sessionStorage.getItem('activeScanId');
      const savedProgress = sessionStorage.getItem('scanProgress');
      const savedIsScanning = sessionStorage.getItem('isScanning');
      
      if (savedScanId && savedIsScanning === 'true') {
        // Always set state if there's an active scan in sessionStorage
        // This ensures the UI shows the scan progress
        setCurrentScanId(savedScanId);
        setIsScanning(true);
        
        if (savedProgress) {
          try {
            const progress = JSON.parse(savedProgress);
            setScanProgressPercent(progress.percent || 0);
            setCurrentProcess(progress.currentProcess || '');
            setScanProgress(progress.scanProgress || '');
          } catch (e) {
            console.error('Error parsing saved progress:', e);
          }
        }
        
        // Reconnect to progress stream if not already connected or if connection is closed
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          reconnectToScan(savedScanId);
        }
      }
    };
    
    // Only restore on mount if we haven't already restored
    if (!hasRestoredRef.current) {
      restoreScanState();
      hasRestoredRef.current = true;
    }
    
    // Also restore on focus/visibility to catch any missed updates when switching tabs
    const handleRestore = () => {
      if (document.visibilityState === 'visible') {
        // Use a small delay to avoid race conditions
        setTimeout(() => {
          restoreScanState();
        }, 100);
      }
    };
    
    window.addEventListener('focus', handleRestore);
    document.addEventListener('visibilitychange', handleRestore);
    
    return () => {
      window.removeEventListener('focus', handleRestore);
      document.removeEventListener('visibilitychange', handleRestore);
    };
  }, [reconnectToScan, eventSource]);

  // Reconnect when tab becomes visible again or window regains focus
  useEffect(() => {
    const checkAndReconnect = () => {
      const savedScanId = sessionStorage.getItem('activeScanId');
      const savedIsScanning = sessionStorage.getItem('isScanning');
      
      // Always check sessionStorage directly, don't rely on state
      // This ensures we reconnect even if component remounted and state was lost
      if (savedScanId && savedIsScanning === 'true') {
        // Always restore state from sessionStorage when tab becomes visible
        // This ensures UI is always in sync
        setCurrentScanId(savedScanId);
        setIsScanning(true);
        const savedProgress = sessionStorage.getItem('scanProgress');
        if (savedProgress) {
          try {
            const progress = JSON.parse(savedProgress);
            setScanProgressPercent(progress.percent || 0);
            setCurrentProcess(progress.currentProcess || '');
            setScanProgress(progress.scanProgress || '');
          } catch (e) {
            console.error('Error parsing saved progress:', e);
          }
        }
        
        // Always check connection and reconnect if needed
        // Reset reconnect attempts when tab becomes visible
        reconnectAttemptsRef.current = 0;
        
        // Reconnect if no event source or if connection is not open
        const needsReconnect = !eventSource || 
          eventSource.readyState === EventSource.CLOSED ||
          eventSource.readyState === EventSource.CONNECTING;
        
        if (needsReconnect) {
          console.log('Tab visible - reconnecting to scan:', savedScanId, 'State:', eventSource?.readyState);
          reconnectToScan(savedScanId);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure browser has time to restore connections
        setTimeout(checkAndReconnect, 100);
      }
    };

    const handleFocus = () => {
      // Reconnect when window regains focus
      setTimeout(checkAndReconnect, 100);
    };

    // Add multiple event listeners for better coverage
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Also check connection health periodically when visible
    // Check sessionStorage directly instead of relying on state
    const healthCheckInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const savedScanId = sessionStorage.getItem('activeScanId');
        const savedIsScanning = sessionStorage.getItem('isScanning');
        
        if (savedScanId && savedIsScanning === 'true') {
          // Ensure state is always in sync with sessionStorage
          if (!isScanning || currentScanId !== savedScanId) {
            setCurrentScanId(savedScanId);
            setIsScanning(true);
          }
          
          // Check if connection is still alive
          if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
            console.log('Connection health check: reconnecting (CLOSED state)');
            reconnectAttemptsRef.current = 0; // Reset attempts on health check
            reconnectToScan(savedScanId);
          } else if (eventSource.readyState === EventSource.CONNECTING) {
            // If stuck in CONNECTING state for too long, force reconnect
            // This can happen when switching windows/tabs
            console.log('Connection health check: stuck in CONNECTING state, forcing reconnect');
            eventSource.close();
            reconnectAttemptsRef.current = 0; // Reset attempts
            reconnectToScan(savedScanId);
          }
        }
      }
    }, 2000); // Check every 2 seconds for faster recovery
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(healthCheckInterval);
    };
  }, [eventSource, isScanning, currentScanId, reconnectToScan]);

  // Save scan state to sessionStorage whenever it changes
  useEffect(() => {
    if (currentScanId && isScanning) {
      sessionStorage.setItem('activeScanId', currentScanId);
      sessionStorage.setItem('isScanning', 'true');
      sessionStorage.setItem('scanProgress', JSON.stringify({
        percent: scanProgressPercent,
        currentProcess,
        scanProgress,
      }));
    } else {
      sessionStorage.removeItem('activeScanId');
      sessionStorage.removeItem('isScanning');
      sessionStorage.removeItem('scanProgress');
    }
  }, [currentScanId, isScanning, scanProgressPercent, currentProcess, scanProgress]);

  // Cleanup EventSource and timeouts on unmount
  useEffect(() => {
    return () => {
      // Clean up reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Reset reconnect attempts
      reconnectAttemptsRef.current = 0;
      // Don't close EventSource on unmount - let it stay alive
      // The reconnect logic will handle it when component remounts
    };
  }, []);

  const handleStopScan = useCallback(async () => {
    if (!currentScanId) return;
    
    try {
      await fetch('/api/scan/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: currentScanId }),
      });
      
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      
      setIsScanning(false);
      setScanProgress('Scan stopped by user');
      setCurrentScanId(null);
      sessionStorage.removeItem('activeScanId');
      sessionStorage.removeItem('isScanning');
      sessionStorage.removeItem('scanProgress');
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  }, [currentScanId, eventSource]);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    setScanProgress('Initializing scan...');
    setScanProgressPercent(0);
    setCurrentProcess('Preparing scan...');
    
    try {
      // Start the scan
      const startResponse = await fetch('/api/scan/progress', { method: 'POST' });
      const startData = await startResponse.json();
      
      if (!startResponse.ok) {
        throw new Error(startData.error || startData.message || 'Failed to start scan');
      }
      
      const scanId = startData.scanId;
      setCurrentScanId(scanId);
      
      // Connect to progress stream using the reconnect function
      reconnectToScan(scanId);
    } catch (error) {
      console.error('Scan failed:', error);
      setScanError(
        error instanceof Error 
          ? error.message 
          : 'Failed to scan org. Please check your connection and try again.'
      );
      setScanProgress('');
      setIsScanning(false);
      setCurrentScanId(null);
      setScanProgressPercent(0);
      setCurrentProcess('');
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  }, [mutateScans, mutateLatestScan, reconnectToScan]);

  const latestScan = useMemo(() => currentScan || latestScanData?.scan?.rawJson, [currentScan, latestScanData]);
  const userName = 'Salesforce Org';

  const quickActions = useMemo(() => [
    { name: 'My Password', icon: LockClosedIcon, href: '#' },
    { name: 'Devices', icon: DevicePhoneMobileIcon, href: '#' },
    { name: 'Password Manager', icon: KeyIcon, href: '#' },
    { name: 'My Activity', icon: ClockIcon, href: '#' },
    { name: 'Email', icon: EnvelopeIcon, href: '#' },
  ], []);

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
            
            {/* Scan Success Message */}
            {!isScanning && scanProgress === 'Scan completed successfully!' && scanProgressPercent === 100 && (
              <div className="max-w-md mx-auto mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">Scan completed successfully!</p>
                </div>
              </div>
            )}
            
            {/* Scan Progress Bar */}
            {(isScanning || (typeof window !== 'undefined' && sessionStorage.getItem('isScanning') === 'true')) && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Scan Progress</span>
                      <span className="text-sm font-semibold text-blue-600">{Math.round(scanProgressPercent)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${scanProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Current Process */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900">
                      {currentProcess || 'Initializing scan...'}
                    </p>
                  </div>
                  
                  {/* Stop Button */}
                  <button
                    onClick={handleStopScan}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    Stop Scan
                  </button>
                </div>
              </div>
            )}
            
            {!isScanning && (
            <button
              onClick={handleScan}
                disabled={!connectionStatus?.connected}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
                {connectionStatus?.connected 
                  ? 'Start Your First Scan' 
                  : 'Connect to Start Scanning'}
            </button>
            )}
            
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

            {/* Scan Error Message */}
            {scanError && (
            <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{scanError}</p>
              </div>
            )}
            
          {/* Scan Success Message */}
          {!isScanning && scanProgress === 'Scan completed successfully!' && scanProgressPercent === 100 && (
            <div className="max-w-4xl mx-auto mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-green-800">Scan completed successfully!</p>
              </div>
            </div>
          )}
          
          {/* Scan Progress Bar */}
          {(isScanning || (typeof window !== 'undefined' && sessionStorage.getItem('isScanning') === 'true')) && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Scan Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{Math.round(scanProgressPercent)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${scanProgressPercent}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Current Process */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    {currentProcess || 'Initializing scan...'}
                  </p>
                </div>
            
                {/* Stop Button */}
                <button
                  onClick={handleStopScan}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Stop Scan
                </button>
              </div>
            </div>
          )}
          
          {/* Main Scan Button */}
          {!isScanning && (
            <div className="max-w-4xl mx-auto text-center">
              <button
                onClick={handleScan}
                disabled={!connectionStatus?.connected}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {connectionStatus?.connected 
                  ? 'Start Your First Scan' 
                  : 'Connect to Start Scanning'}
              </button>
              
              {connectionStatus?.connected && (
                <p className="text-xs text-gray-500 mt-4">
                  The scan will collect org info, ALL objects and fields, automations, profiles, roles, and more.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}