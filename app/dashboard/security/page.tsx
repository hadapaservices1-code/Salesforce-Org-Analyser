'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/Card';
import { formatNumber } from '@/lib/utils';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  UsersIcon,
  QueueListIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SecurityData {
  profiles: Array<{
    id: string;
    name: string;
    userLicense: string;
    objectPermissions: Record<string, {
      read: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }>;
  }>;
  roles: Array<{
    id: string;
    name: string;
    parentRole?: string;
    userCount: number;
  }>;
  queues: Array<{
    id: string;
    name: string;
    objectType: string;
    memberCount: number;
  }>;
  sharingRules: Array<{
    name: string;
    object: string;
    type: string;
    criteria?: string;
  }>;
  permissionSets: Array<{
    id: string;
    name: string;
    label: string;
    description?: string;
    userCount: number;
    license?: string;
  }>;
  blockers: Array<{
    type: string;
    severity: string;
    message: string;
    recommendation: string;
  }>;
  stats: {
    totalProfiles: number;
    totalRoles: number;
    totalQueues: number;
    totalSharingRules: number;
    totalPermissionSets: number;
    totalUsers: number;
    securityBlockers: number;
  };
  scannedAt: string;
}

type TabType = 'overview' | 'profiles' | 'roles' | 'queues' | 'sharing' | 'permissions' | 'blockers';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { data, error, isLoading, mutate } = useSWR<{ security: SecurityData | null; message?: string }>('/api/security', fetcher, {
    refreshInterval: 60000,
  });

  const securityData = data?.security;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="google-card">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

  if (error || !securityData) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="google-card">
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {data?.message || 'Failed to Load Security Information'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {error?.error || data?.message || 'Unable to fetch security data. Please run a scan first.'}
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

  const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: ShieldCheckIcon },
    { id: 'profiles', label: 'Profiles', icon: UserGroupIcon },
    { id: 'roles', label: 'Roles', icon: UsersIcon },
    { id: 'queues', label: 'Queues', icon: QueueListIcon },
    { id: 'sharing', label: 'Sharing Rules', icon: ShareIcon },
    { id: 'permissions', label: 'Permission Sets', icon: KeyIcon },
    { id: 'blockers', label: 'Security Issues', icon: ExclamationTriangleIcon },
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-normal text-gray-900 mb-2">Security & Access</h1>
          <p className="text-base text-gray-600">
            Manage and review security settings, profiles, roles, and access controls
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`mr-2 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Security Status Card */}
            <Card className="mb-6">
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Security Status</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Total Profiles</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatNumber(securityData.stats.totalProfiles)}
                  </div>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Total Roles</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatNumber(securityData.stats.totalRoles)}
                  </div>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Active Users</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatNumber(securityData.stats.totalUsers)}
                  </div>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Queues</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatNumber(securityData.stats.totalQueues)}
                  </div>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Sharing Rules</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatNumber(securityData.stats.totalSharingRules)}
                  </div>
                </div>
                <div className="border-l-4 border-indigo-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Permission Sets</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatNumber(securityData.stats.totalPermissionSets)}
                  </div>
                </div>
                <div className={`border-l-4 pl-4 ${
                  securityData.stats.securityBlockers > 0 ? 'border-red-500' : 'border-green-500'
                }`}>
                  <div className="text-sm text-gray-600 mb-1">Security Issues</div>
                  <div className={`text-2xl font-semibold ${
                    securityData.stats.securityBlockers > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatNumber(securityData.stats.securityBlockers)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Recommendations</h3>
              {securityData.blockers.length > 0 ? (
                <div className="space-y-3">
                  {securityData.blockers.slice(0, 3).map((blocker, idx) => (
                    <div key={idx} className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{blocker.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{blocker.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <p className="text-sm text-gray-900">No security issues detected</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'profiles' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Profiles</h2>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(securityData.profiles.length)} total
              </span>
            </div>
            {securityData.profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profile Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User License
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Object Permissions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityData.profiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{profile.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {profile.userLicense === 'Unknown' ? (
                              <span className="text-gray-400">Unknown</span>
                            ) : (
                              <span className="font-mono text-xs">{profile.userLicense.substring(0, 8)}...</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {Object.keys(profile.objectPermissions || {}).length > 0 ? (
                              <span>{Object.keys(profile.objectPermissions).length} objects</span>
                            ) : (
                              <span className="text-gray-400">Not available</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No profile data available. Run a scan to collect profile information.</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'roles' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UsersIcon className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Roles</h2>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(securityData.roles.length)} total
              </span>
            </div>
            {securityData.roles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parent Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityData.roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {role.parentRole ? (
                              <span className="font-mono text-xs">{role.parentRole.substring(0, 8)}...</span>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {formatNumber(role.userCount)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No role data available. Run a scan to collect role information.</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'queues' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <QueueListIcon className="h-6 w-6 text-orange-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Queues</h2>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(securityData.queues.length)} total
              </span>
            </div>
            {securityData.queues.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Queue Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Object Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityData.queues.map((queue) => (
                      <tr key={queue.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{queue.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{queue.objectType}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {formatNumber(queue.memberCount)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No queue data available. Run a scan to collect queue information.</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'sharing' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ShareIcon className="h-6 w-6 text-yellow-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Sharing Rules</h2>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(securityData.sharingRules.length)} total
              </span>
            </div>
            {securityData.sharingRules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rule Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Object
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criteria
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityData.sharingRules.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{rule.object}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{rule.type}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">
                            {rule.criteria || <span className="text-gray-400">Not available</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No sharing rules data available. Sharing rules require Metadata API access.</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'permissions' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <KeyIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Permission Sets</h2>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(securityData.permissionSets.length)} total
              </span>
            </div>
            {securityData.permissionSets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permission Set Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Label
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Users
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityData.permissionSets.map((ps) => (
                      <tr key={ps.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{ps.name}</div>
                          {ps.description && (
                            <div className="text-xs text-gray-500 mt-1">{ps.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{ps.label}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {formatNumber(ps.userCount)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {ps.license ? (
                              <span className="font-mono text-xs">{ps.license.substring(0, 8)}...</span>
                            ) : (
                              <span className="text-gray-400">Standard</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No permission sets found. Custom permission sets will appear here after a scan.</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'blockers' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                <h2 className="text-xl font-medium text-gray-900">Security Issues</h2>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(securityData.blockers.length)} issues found
              </span>
            </div>
            {securityData.blockers.length > 0 ? (
              <div className="space-y-4">
                {securityData.blockers.map((blocker, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border-l-4 rounded-r-lg ${
                      blocker.severity === 'high'
                        ? 'bg-red-50 border-red-500'
                        : blocker.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start">
                      <ExclamationTriangleIcon
                        className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                          blocker.severity === 'high'
                            ? 'text-red-600'
                            : blocker.severity === 'medium'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              blocker.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : blocker.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {blocker.severity.toUpperCase()}
                          </span>
                          {blocker.object && (
                            <span className="ml-2 text-sm text-gray-600">Object: {blocker.object}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{blocker.message}</p>
                        <p className="text-xs text-gray-600">{blocker.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-sm text-gray-900 font-medium mb-1">No security issues detected</p>
                <p className="text-xs text-gray-600">Your org security configuration looks good.</p>
              </div>
            )}
          </Card>
        )}

        {/* Last Scanned Info */}
        {securityData.scannedAt && (
          <div className="mt-6 text-center text-xs text-gray-500">
            Last scanned: {new Date(securityData.scannedAt).toLocaleString()}
            <button
              onClick={() => mutate()}
              className="ml-2 text-blue-600 hover:text-blue-700 underline"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

