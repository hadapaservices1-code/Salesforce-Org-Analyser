'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/Card';
import { formatNumber } from '@/lib/utils';
import {
  UsersIcon,
  ChartBarIcon,
  KeyIcon,
  ShieldCheckIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OrgInfo {
  id: string;
  organizationType: string;
  edition: string;
  instanceName: string;
  userCount: number;
  limits: Record<string, { Max: number; Remaining: number }>;
  licenses: Record<string, { Total: number; Used: number }>;
}

export default function OrgInfoPage() {
  const { data, error, isLoading, mutate } = useSWR<{ orgInfo: OrgInfo }>('/api/org', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  });

  const orgInfo = data?.orgInfo;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="google-card">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orgInfo) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="google-card">
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <ShieldCheckIcon className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Failed to Load Org Information
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {error?.error || 'Unable to fetch organization information'}
              </p>
              <button
                onClick={() => mutate()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const licenseEntries = Object.entries(orgInfo.licenses || {});
  const limitEntries = Object.entries(orgInfo.limits || {}).slice(0, 10); // Show top 10 limits

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-normal text-gray-900 mb-2">Org Information</h1>
          <p className="text-base text-gray-600">
            View details about your Salesforce organization
          </p>
        </div>

        {/* Basic Info Card */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <HomeIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-medium text-gray-900">Organization Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Organization ID</label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-base text-gray-900 font-mono">{orgInfo.id || 'Not available'}</p>
                {orgInfo.id && orgInfo.id !== 'Unknown' && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(orgInfo.id);
                      // You could add a toast notification here
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Instance Name</label>
              <p className="text-base text-gray-900 mt-1">{orgInfo.instanceName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Organization Type</label>
              <p className="text-base text-gray-900 mt-1">{orgInfo.organizationType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Edition</label>
              <p className="text-base text-gray-900 mt-1">{orgInfo.edition}</p>
            </div>
          </div>
        </Card>

        {/* User Count Card */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <UsersIcon className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-medium text-gray-900">Users</h2>
          </div>
          <div className="text-center py-8">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {formatNumber(orgInfo.userCount)}
            </div>
            <p className="text-sm text-gray-600">Active Users</p>
          </div>
        </Card>

        {/* Licenses Card */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-medium text-gray-900">Licenses</h2>
          </div>
          {licenseEntries.length > 0 ? (
            <div className="space-y-4">
              {licenseEntries.map(([licenseName, license]) => {
                const percentage = license.Total > 0 
                  ? Math.round((license.Used / license.Total) * 100) 
                  : 0;
                return (
                  <div key={licenseName} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">{licenseName}</span>
                      <span className="text-sm text-gray-600">
                        {formatNumber(license.Used)} / {formatNumber(license.Total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage >= 90 ? 'bg-red-600' : 
                          percentage >= 70 ? 'bg-yellow-600' : 
                          'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage}% used</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No license information available
            </div>
          )}
        </Card>

        {/* Limits Card */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-medium text-gray-900">Organization Limits</h2>
          </div>
          {limitEntries.length > 0 ? (
            <div className="space-y-4">
              {limitEntries.map(([limitName, limit]) => {
                const max = limit.Max || 0;
                const remaining = limit.Remaining || 0;
                const used = max > 0 ? max - remaining : 0;
                const percentage = max > 0 ? Math.round((used / max) * 100) : 0;
                
                // Format limit name nicely
                const formattedName = limitName
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();
                
                return (
                  <div key={limitName} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formattedName}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatNumber(used)} / {formatNumber(max)}
                      </span>
                    </div>
                    {max > 0 ? (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              percentage >= 90 ? 'bg-red-600' : 
                              percentage >= 70 ? 'bg-yellow-600' : 
                              'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatNumber(remaining)} remaining ({percentage}% used)
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">
                        Unlimited
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No limit information available
            </div>
          )}
        </Card>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
