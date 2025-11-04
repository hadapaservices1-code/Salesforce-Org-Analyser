import * as XLSX from 'xlsx';
import { ScanOutput } from '@/lib/types';

export function generateExcelReport(scan: ScanOutput, scanId: string): Buffer {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Org Overview
  const orgOverview = [
    ['Organization Information', ''],
    ['Org ID', scan.orgInfo.id],
    ['Organization Type', scan.orgInfo.organizationType],
    ['Edition', scan.orgInfo.edition],
    ['Instance Name', scan.orgInfo.instanceName],
    ['Active Users', scan.orgInfo.userCount],
    [''],
    ['Key Metrics', ''],
    ['Total Objects', scan.objects.length],
    ['Total Flows', scan.flows.length],
    ['Total Triggers', scan.triggers.length],
    ['Total Validation Rules', scan.validationRules.length],
    ['Total Profiles', scan.profiles.length],
    ['Total Roles', scan.roles.length],
    ['Total Permission Sets', scan.permissionSets.length],
    ['Total Queues', scan.queues.length],
    ['Total Reports', scan.reports.length],
    ['Total Dashboards', scan.dashboards.length],
    ['Migration Blockers', scan.blockers.length],
    [''],
    ['Scan Information', ''],
    ['Scanned At', new Date(scan.scannedAt).toLocaleString()],
    ['Scan Duration (seconds)', (scan.scanDuration / 1000).toFixed(1)],
  ];
  const orgSheet = XLSX.utils.aoa_to_sheet(orgOverview);
  XLSX.utils.book_append_sheet(workbook, orgSheet, 'Org Overview');

  // Sheet 2: Objects
  const objectsData = scan.objects.map(obj => ({
    'Object Name': obj.name,
    'Label': obj.label,
    'Key Prefix': obj.keyPrefix,
    'Record Count': obj.recordCount,
    'Field Count': obj.fields.length,
    'Relationship Count': obj.relationships.length,
  }));
  const objectsSheet = XLSX.utils.json_to_sheet(objectsData);
  XLSX.utils.book_append_sheet(workbook, objectsSheet, 'Objects');

  // Sheet 3: Fields (flattened from all objects)
  const fieldsData: any[] = [];
  for (const obj of scan.objects) {
    for (const field of obj.fields) {
      fieldsData.push({
        'Object': obj.name,
        'Object Label': obj.label,
        'Field Name': field.name,
        'Field Label': field.label,
        'Type': field.type,
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
  const flowsData = scan.flows.map(flow => ({
    'Flow Name': flow.name,
    'Label': flow.label,
    'Status': flow.status,
    'Version': flow.version,
  }));
  if (flowsData.length > 0) {
    const flowsSheet = XLSX.utils.json_to_sheet(flowsData);
    XLSX.utils.book_append_sheet(workbook, flowsSheet, 'Flows');
  }

  // Sheet 5: Triggers
  const triggersData = scan.triggers.map(trigger => ({
    'Trigger Name': trigger.name,
    'Object': trigger.object,
    'Status': trigger.status,
    'Body Length (chars)': trigger.bodyLength,
  }));
  if (triggersData.length > 0) {
    const triggersSheet = XLSX.utils.json_to_sheet(triggersData);
    XLSX.utils.book_append_sheet(workbook, triggersSheet, 'Triggers');
  }

  // Sheet 6: Validation Rules
  const validationRulesData = scan.validationRules.map(vr => ({
    'Rule Name': vr.name,
    'Object': vr.object,
    'Active': vr.active ? 'Yes' : 'No',
    'Error Message': vr.errorMessage,
  }));
  if (validationRulesData.length > 0) {
    const validationSheet = XLSX.utils.json_to_sheet(validationRulesData);
    XLSX.utils.book_append_sheet(workbook, validationSheet, 'Validation Rules');
  }

  // Sheet 7: Profiles
  const profilesData = scan.profiles.map(profile => ({
    'Profile Name': profile.name,
    'User License': profile.userLicense,
    'Object Permissions Count': Object.keys(profile.objectPermissions || {}).length,
  }));
  if (profilesData.length > 0) {
    const profilesSheet = XLSX.utils.json_to_sheet(profilesData);
    XLSX.utils.book_append_sheet(workbook, profilesSheet, 'Profiles');
  }

  // Sheet 8: Roles
  const rolesData = scan.roles.map(role => ({
    'Role Name': role.name,
    'Parent Role ID': role.parentRole || '',
    'User Count': role.userCount,
  }));
  if (rolesData.length > 0) {
    const rolesSheet = XLSX.utils.json_to_sheet(rolesData);
    XLSX.utils.book_append_sheet(workbook, rolesSheet, 'Roles');
  }

  // Sheet 9: Permission Sets
  const permissionSetsData = scan.permissionSets.map(ps => ({
    'Permission Set Name': ps.name,
    'Label': ps.label,
    'Description': ps.description || '',
    'User Count': ps.userCount,
    'License': ps.license || 'Standard',
  }));
  if (permissionSetsData.length > 0) {
    const permissionSetsSheet = XLSX.utils.json_to_sheet(permissionSetsData);
    XLSX.utils.book_append_sheet(workbook, permissionSetsSheet, 'Permission Sets');
  }

  // Sheet 10: Queues
  const queuesData = scan.queues.map(queue => ({
    'Queue Name': queue.name,
    'Object Type': queue.objectType,
    'Member Count': queue.memberCount,
  }));
  if (queuesData.length > 0) {
    const queuesSheet = XLSX.utils.json_to_sheet(queuesData);
    XLSX.utils.book_append_sheet(workbook, queuesSheet, 'Queues');
  }

  // Sheet 11: Reports
  const reportsData = scan.reports.map(report => ({
    'Report Name': report.name,
    'Folder': report.folder,
    'Type': report.type,
  }));
  if (reportsData.length > 0) {
    const reportsSheet = XLSX.utils.json_to_sheet(reportsData);
    XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Reports');
  }

  // Sheet 12: Dashboards
  const dashboardsData = scan.dashboards.map(dashboard => ({
    'Dashboard Name': dashboard.name,
    'Folder': dashboard.folder,
  }));
  if (dashboardsData.length > 0) {
    const dashboardsSheet = XLSX.utils.json_to_sheet(dashboardsData);
    XLSX.utils.book_append_sheet(workbook, dashboardsSheet, 'Dashboards');
  }

  // Sheet 13: Migration Blockers
  const blockersData = scan.blockers.map(blocker => ({
    'Type': blocker.type,
    'Severity': blocker.severity,
    'Object': blocker.object || '',
    'Message': blocker.message,
    'Recommendation': blocker.recommendation,
  }));
  if (blockersData.length > 0) {
    const blockersSheet = XLSX.utils.json_to_sheet(blockersData);
    XLSX.utils.book_append_sheet(workbook, blockersSheet, 'Migration Blockers');
  }

  // Sheet 14: Licenses
  const licensesData = Object.entries(scan.orgInfo.licenses || {}).map(([name, license]) => ({
    'License Name': name,
    'Total Licenses': license.Total,
    'Used Licenses': license.Used,
    'Available': license.Total - license.Used,
    'Usage %': license.Total > 0 ? ((license.Used / license.Total) * 100).toFixed(1) + '%' : '0%',
  }));
  if (licensesData.length > 0) {
    const licensesSheet = XLSX.utils.json_to_sheet(licensesData);
    XLSX.utils.book_append_sheet(workbook, licensesSheet, 'Licenses');
  }

  // Sheet 15: Limits
  const limitsData = Object.entries(scan.orgInfo.limits || {}).map(([name, limit]) => ({
    'Limit Name': name.replace(/([A-Z])/g, ' $1').trim(),
    'Max': limit.Max,
    'Remaining': limit.Remaining,
    'Used': limit.Max - limit.Remaining,
    'Usage %': limit.Max > 0 ? (((limit.Max - limit.Remaining) / limit.Max) * 100).toFixed(1) + '%' : '0%',
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

