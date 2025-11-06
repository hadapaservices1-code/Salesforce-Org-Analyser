import * as XLSX from 'xlsx';
import { ScanOutput } from '@/lib/types';

export function generateExcelReport(scan: ScanOutput, scanId: string): Buffer {
  const workbook = XLSX.utils.book_new();

  // Ensure arrays exist to prevent errors
  const objects = scan.objects || [];
  const flows = scan.flows || [];
  const triggers = scan.triggers || [];
  const validationRules = scan.validationRules || [];
  const profiles = scan.profiles || [];
  const roles = scan.roles || [];
  const permissionSets = scan.permissionSets || [];
  const queues = scan.queues || [];
  const reports = scan.reports || [];
  const dashboards = scan.dashboards || [];
  const blockers = scan.blockers || [];

  // Sheet 1: Org Overview
  const orgOverview = [
    ['Organization Information', ''],
    ['Org ID', scan.orgInfo?.id || 'N/A'],
    ['Organization Type', scan.orgInfo?.organizationType || 'N/A'],
    ['Edition', scan.orgInfo?.edition || 'N/A'],
    ['Instance Name', scan.orgInfo?.instanceName || 'N/A'],
    ['Active Users', scan.orgInfo?.userCount || 0],
    [''],
    ['Key Metrics', ''],
    ['Total Objects', objects.length],
    ['Total Flows', flows.length],
    ['Total Triggers', triggers.length],
    ['Total Validation Rules', validationRules.length],
    ['Total Profiles', profiles.length],
    ['Total Roles', roles.length],
    ['Total Permission Sets', permissionSets.length],
    ['Total Queues', queues.length],
    ['Total Reports', reports.length],
    ['Total Dashboards', dashboards.length],
    ['Migration Blockers', blockers.length],
    [''],
    ['Scan Information', ''],
    ['Scanned At', scan.scannedAt ? new Date(scan.scannedAt).toLocaleString() : 'N/A'],
    ['Scan Duration (seconds)', scan.scanDuration ? (scan.scanDuration / 1000).toFixed(1) : '0'],
  ];
  const orgSheet = XLSX.utils.aoa_to_sheet(orgOverview);
  XLSX.utils.book_append_sheet(workbook, orgSheet, 'Org Overview');

  // Sheet 2: Objects
  const objectsData = objects.map(obj => ({
    'Object Name': obj.name || 'N/A',
    'Label': obj.label || 'N/A',
    'Key Prefix': obj.keyPrefix || 'N/A',
    'Record Count': obj.recordCount || 0,
    'Field Count': (obj.fields || []).length,
    'Relationship Count': (obj.relationships || []).length,
  }));
  const objectsSheet = XLSX.utils.json_to_sheet(objectsData);
  XLSX.utils.book_append_sheet(workbook, objectsSheet, 'Objects');

  // Sheet 3: Fields (flattened from all objects)
  const fieldsData: any[] = [];
  for (const obj of objects) {
    const fields = obj.fields || [];
    for (const field of fields) {
      fieldsData.push({
        'Object': obj.name || 'N/A',
        'Object Label': obj.label || 'N/A',
        'Field Name': field.name || 'N/A',
        'Field Label': field.label || 'N/A',
        'Type': field.type || 'N/A',
        'Required': field.required ? 'Yes' : 'No',
        'Unique': field.unique ? 'Yes' : 'No',
        'Lookup Target': field.lookupTarget || '',
      });
    }
  }
  if (fieldsData.length > 0) {
    const fieldsSheet = XLSX.utils.json_to_sheet(fieldsData);
    XLSX.utils.book_append_sheet(workbook, fieldsSheet, 'Fields');
  }

  // Sheet 4: Flows
  const flowsData = flows.map(flow => ({
    'Flow Name': flow.name || 'N/A',
    'Label': flow.label || 'N/A',
    'Status': flow.status || 'N/A',
    'Version': flow.version || 0,
  }));
  if (flowsData.length > 0) {
    const flowsSheet = XLSX.utils.json_to_sheet(flowsData);
    XLSX.utils.book_append_sheet(workbook, flowsSheet, 'Flows');
  }

  // Sheet 5: Triggers
  const triggersData = triggers.map(trigger => ({
    'Trigger Name': trigger.name || 'N/A',
    'Object': trigger.object || 'N/A',
    'Status': trigger.status || 'N/A',
    'Body Length (chars)': trigger.bodyLength || 0,
  }));
  if (triggersData.length > 0) {
    const triggersSheet = XLSX.utils.json_to_sheet(triggersData);
    XLSX.utils.book_append_sheet(workbook, triggersSheet, 'Triggers');
  }

  // Sheet 6: Validation Rules
  const validationRulesData = validationRules.map(vr => ({
    'Rule Name': vr.name || 'N/A',
    'Object': vr.object || 'N/A',
    'Active': vr.active ? 'Yes' : 'No',
    'Error Message': vr.errorMessage || '',
  }));
  if (validationRulesData.length > 0) {
    const validationSheet = XLSX.utils.json_to_sheet(validationRulesData);
    XLSX.utils.book_append_sheet(workbook, validationSheet, 'Validation Rules');
  }

  // Sheet 7: Profiles
  const profilesData = profiles.map(profile => ({
    'Profile Name': profile.name || 'N/A',
    'User License': profile.userLicense || 'N/A',
    'Object Permissions Count': Object.keys(profile.objectPermissions || {}).length,
  }));
  if (profilesData.length > 0) {
    const profilesSheet = XLSX.utils.json_to_sheet(profilesData);
    XLSX.utils.book_append_sheet(workbook, profilesSheet, 'Profiles');
  }

  // Sheet 8: Roles
  const rolesData = roles.map(role => ({
    'Role Name': role.name || 'N/A',
    'Parent Role ID': role.parentRole || '',
    'User Count': role.userCount || 0,
  }));
  if (rolesData.length > 0) {
    const rolesSheet = XLSX.utils.json_to_sheet(rolesData);
    XLSX.utils.book_append_sheet(workbook, rolesSheet, 'Roles');
  }

  // Sheet 9: Permission Sets
  const permissionSetsData = permissionSets.map(ps => ({
    'Permission Set Name': ps.name || 'N/A',
    'Label': ps.label || 'N/A',
    'Description': ps.description || '',
    'User Count': ps.userCount || 0,
    'License': ps.license || 'Standard',
  }));
  if (permissionSetsData.length > 0) {
    const permissionSetsSheet = XLSX.utils.json_to_sheet(permissionSetsData);
    XLSX.utils.book_append_sheet(workbook, permissionSetsSheet, 'Permission Sets');
  }

  // Sheet 10: Queues
  const queuesData = queues.map(queue => ({
    'Queue Name': queue.name || 'N/A',
    'Object Type': queue.objectType || 'N/A',
    'Member Count': queue.memberCount || 0,
  }));
  if (queuesData.length > 0) {
    const queuesSheet = XLSX.utils.json_to_sheet(queuesData);
    XLSX.utils.book_append_sheet(workbook, queuesSheet, 'Queues');
  }

  // Sheet 11: Reports
  const reportsData = reports.map(report => ({
    'Report Name': report.name || 'N/A',
    'Folder': report.folder || 'N/A',
    'Type': report.type || 'N/A',
  }));
  if (reportsData.length > 0) {
    const reportsSheet = XLSX.utils.json_to_sheet(reportsData);
    XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Reports');
  }

  // Sheet 12: Dashboards
  const dashboardsData = dashboards.map(dashboard => ({
    'Dashboard Name': dashboard.name || 'N/A',
    'Folder': dashboard.folder || 'N/A',
  }));
  if (dashboardsData.length > 0) {
    const dashboardsSheet = XLSX.utils.json_to_sheet(dashboardsData);
    XLSX.utils.book_append_sheet(workbook, dashboardsSheet, 'Dashboards');
  }

  // Sheet 13: Migration Blockers
  const blockersData = blockers.map(blocker => ({
    'Type': blocker.type || 'N/A',
    'Severity': blocker.severity || 'N/A',
    'Object': blocker.object || '',
    'Message': blocker.message || '',
    'Recommendation': blocker.recommendation || '',
  }));
  if (blockersData.length > 0) {
    const blockersSheet = XLSX.utils.json_to_sheet(blockersData);
    XLSX.utils.book_append_sheet(workbook, blockersSheet, 'Migration Blockers');
  }

  // Sheet 14: Licenses
  const licensesData = Object.entries(scan.orgInfo?.licenses || {}).map(([name, license]) => ({
    'License Name': name,
    'Total Licenses': license?.Total || 0,
    'Used Licenses': license?.Used || 0,
    'Available': (license?.Total || 0) - (license?.Used || 0),
    'Usage %': (license?.Total || 0) > 0 ? (((license?.Used || 0) / (license?.Total || 1)) * 100).toFixed(1) + '%' : '0%',
  }));
  if (licensesData.length > 0) {
    const licensesSheet = XLSX.utils.json_to_sheet(licensesData);
    XLSX.utils.book_append_sheet(workbook, licensesSheet, 'Licenses');
  }

  // Sheet 15: Limits
  const limitsData = Object.entries(scan.orgInfo?.limits || {}).map(([name, limit]) => ({
    'Limit Name': name.replace(/([A-Z])/g, ' $1').trim(),
    'Max': limit?.Max || 0,
    'Remaining': limit?.Remaining || 0,
    'Used': (limit?.Max || 0) - (limit?.Remaining || 0),
    'Usage %': (limit?.Max || 0) > 0 ? ((((limit?.Max || 0) - (limit?.Remaining || 0)) / (limit?.Max || 1)) * 100).toFixed(1) + '%' : '0%',
  }));
  if (limitsData.length > 0) {
    const limitsSheet = XLSX.utils.json_to_sheet(limitsData);
    XLSX.utils.book_append_sheet(workbook, limitsSheet, 'Organization Limits');
  }

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}

export function generateAllScansExcel(scans: ScanOutput[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = scans.map((scan, index) => ({
    'Scan #': index + 1,
    'Scan ID': scan.scannedAt,
    'Scanned At': new Date(scan.scannedAt).toLocaleString(),
    'Duration (s)': (scan.scanDuration / 1000).toFixed(1),
    'Objects': scan.objects.length,
    'Flows': scan.flows.length,
    'Triggers': scan.triggers.length,
    'Profiles': scan.profiles.length,
    'Users': scan.orgInfo.userCount,
    'Blockers': scan.blockers.length,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'All Scans Summary');

  // Create sheets for each scan
  scans.forEach((scan, index) => {
    const scanId = `Scan-${index + 1}`;
    const scanBuffer = generateExcelReport(scan, scanId);
    const tempWorkbook = XLSX.read(scanBuffer, { type: 'buffer' });
    
    // Copy each sheet from the scan workbook with a prefix
    tempWorkbook.SheetNames.forEach((sheetName) => {
      const sheet = tempWorkbook.Sheets[sheetName];
      const newSheetName = `${scanId}-${sheetName}`;
      XLSX.utils.book_append_sheet(workbook, sheet, newSheetName);
    });
  });

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}

