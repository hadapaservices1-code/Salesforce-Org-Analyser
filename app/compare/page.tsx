'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { formatNumber } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ComparePage() {
  const router = useRouter();
  const [scanId1, setScanId1] = useState<string>('');
  const [scanId2, setScanId2] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);

  const { data: scansData } = useSWR('/api/scans', fetcher);

  const handleCompare = async () => {
    if (!scanId1 || !scanId2) {
      alert('Please select both scans to compare');
      return;
    }

    try {
      const response = await fetch(`/api/compare?scanId1=${scanId1}&scanId2=${scanId2}`);
      const data = await response.json();
      setComparison(data);
    } catch (error) {
      console.error('Compare failed:', error);
    }
  };

  const scans = scansData?.scans || [];

  return (
    <div className="p-8">
      <h2 className="text-2xl font-normal text-gray-900 mb-6">Compare Scans</h2>

      <div className="google-card mb-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scan 1
            </label>
            <select
              value={scanId1}
              onChange={(e) => setScanId1(e.target.value)}
              className="google-input"
            >
              <option value="">Select a scan...</option>
              {scans.map((scan: any) => (
                <option key={scan.id} value={scan.id}>
                  {new Date(scan.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scan 2
            </label>
            <select
              value={scanId2}
              onChange={(e) => setScanId2(e.target.value)}
              className="google-input"
            >
              <option value="">Select a scan...</option>
              {scans.map((scan: any) => (
                <option key={scan.id} value={scan.id}>
                  {new Date(scan.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleCompare}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium"
        >
          Compare
        </button>
      </div>

      {comparison && (
        <div className="space-y-6">
          {/* Key Metrics Comparison */}
          <div className="google-card max-w-4xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Metrics Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="text-sm text-gray-600">Objects</div>
                <div className="text-2xl font-normal text-gray-900 mt-1">
                  {comparison.objects.scan1} → {comparison.objects.scan2}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {comparison.objects.delta > 0 ? '+' : ''}
                  {comparison.objects.delta}
                </div>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <div className="text-sm text-gray-600">Flows</div>
                <div className="text-2xl font-normal text-gray-900 mt-1">
                  {comparison.flows.scan1} → {comparison.flows.scan2}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {comparison.flows.delta > 0 ? '+' : ''}
                  {comparison.flows.delta}
                </div>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <div className="text-sm text-gray-600">Blockers</div>
                <div className="text-2xl font-normal text-gray-900 mt-1">
                  {comparison.blockers.scan1} → {comparison.blockers.scan2}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {comparison.blockers.delta > 0 ? '+' : ''}
                  {comparison.blockers.delta}
                </div>
              </div>
            </div>
          </div>

          {/* Record Count Changes */}
          {comparison.recordCounts?.topObjects && (
            <div className="google-card max-w-4xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Record Count Changes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Object
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scan 1
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scan 2
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparison.recordCounts.topObjects.map((obj: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {obj.object}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatNumber(obj.scan1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatNumber(obj.scan2)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            obj.delta > 0
                              ? 'text-green-600'
                              : obj.delta < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {obj.delta > 0 ? '+' : ''}
                          {formatNumber(obj.delta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}