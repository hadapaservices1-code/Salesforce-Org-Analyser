'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/Card';
import { formatNumber, formatDate } from '@/lib/utils';
import {
  TableCellsIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Scan {
  id: string;
  createdAt: string;
  rawJson?: any;
}

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<{ scans: Scan[] }>('/api/scans', fetcher, {
    refreshInterval: 60000,
  });

  const scans = data?.scans || [];

  const handleDownload = async (scanId: string, format: 'json' | 'md' | 'xlsx') => {
    setDownloading(`${scanId}-${format}`);
    try {
      const url = `/api/report?scanId=${scanId}&format=${format}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const extension = format === 'xlsx' ? 'xlsx' : format === 'md' ? 'md' : 'json';
      a.download = `scan-${scanId}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async (format: 'xlsx') => {
    if (scans.length === 0) {
      alert('No scans available to download');
      return;
    }

    setDownloading('all-xlsx');
    try {
      const url = `/api/report?all=true&format=${format}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `all-scans-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download all reports. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="google-card">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scans || scans.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="google-card">
            <div className="text-center py-12">
              <ExclamationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Scans Available
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {error?.error || 'Run a scan first to generate reports'}
              </p>
              <button
                onClick={() => mutate()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal text-gray-900 mb-2">Reports & Exports</h1>
            <p className="text-base text-gray-600">
              Download comprehensive reports of your Salesforce org scans
            </p>
          </div>
          {scans.length > 0 && (
            <button
              onClick={() => handleDownloadAll('xlsx')}
              disabled={downloading === 'all-xlsx'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {downloading === 'all-xlsx' ? 'Downloading...' : 'Download All as Excel'}
            </button>
          )}
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatNumber(scans.length)}
              </div>
              <div className="text-sm text-gray-600">Total Scans</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(scans.filter(s => s.rawJson).length)}
              </div>
              <div className="text-sm text-gray-600">Completed Scans</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {scans.length > 0 ? formatDate(scans[0].createdAt) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Latest Scan</div>
            </div>
          </div>
        </Card>

        {/* Scans List */}
        <div className="space-y-4">
          {scans.map((scan) => {
            const scanData = scan.rawJson;
            const hasData = !!scanData;
            
            return (
              <Card key={scan.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        Scan {scan.id.substring(0, 8)}...
                      </h3>
                      {hasData ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                          Complete
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          <ClockIcon className="h-3 w-3 inline mr-1" />
                          Processing
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {formatDate(scan.createdAt)}
                      </div>
                      {scanData && (
                        <>
                          <div className="flex items-center gap-1">
                            <TableCellsIcon className="h-4 w-4" />
                            {formatNumber(scanData.objects?.length || 0)} Objects
                          </div>
                          <div className="flex items-center gap-1">
                            <ExclamationCircleIcon className="h-4 w-4" />
                            {formatNumber(scanData.blockers?.length || 0)} Blockers
                          </div>
                        </>
                      )}
                    </div>

                    {scanData && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Objects</div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(scanData.objects?.length || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Automations</div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(
                              (scanData.flows?.length || 0) +
                              (scanData.triggers?.length || 0) +
                              (scanData.validationRules?.length || 0)
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Profiles</div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(scanData.profiles?.length || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Users</div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(scanData.orgInfo?.userCount || 0)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex flex-col gap-2">
                    {hasData ? (
                      <>
                        <button
                          onClick={() => handleDownload(scan.id, 'xlsx')}
                          disabled={downloading === `${scan.id}-xlsx`}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                          {downloading === `${scan.id}-xlsx` ? 'Downloading...' : 'Excel'}
                        </button>
                        <button
                          onClick={() => handleDownload(scan.id, 'json')}
                          disabled={downloading === `${scan.id}-json`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          {downloading === `${scan.id}-json` ? 'Downloading...' : 'JSON'}
                        </button>
                        <button
                          onClick={() => handleDownload(scan.id, 'md')}
                          disabled={downloading === `${scan.id}-md`}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          {downloading === `${scan.id}-md` ? 'Downloading...' : 'Markdown'}
                        </button>
                      </>
                    ) : (
                      <span className="px-4 py-2 text-sm text-gray-500 text-center">
                        No data yet
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Formats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DocumentArrowDownIcon className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Excel (.xlsx)</span>
              </div>
              <p className="text-sm text-gray-600">
                Comprehensive multi-sheet workbook with all org data including objects, fields, automations, security, and more.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">JSON</span>
              </div>
              <p className="text-sm text-gray-600">
                Raw scan data in JSON format for programmatic access and integration with other tools.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Markdown</span>
              </div>
              <p className="text-sm text-gray-600">
                Human-readable runbook with key metrics, blockers, and recommendations formatted for easy reading.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

