import { ProfileMetadata, MigrationBlocker } from '@/lib/types';

export function detectProfileMismatchBlockers(profiles: ProfileMetadata[]): MigrationBlocker[] {
  const blockers: MigrationBlocker[] = [];

  // Group profiles by license type
  const profilesByLicense: Record<string, ProfileMetadata[]> = {};
  
  for (const profile of profiles) {
    if (!profilesByLicense[profile.userLicense]) {
      profilesByLicense[profile.userLicense] = [];
    }
    profilesByLicense[profile.userLicense].push(profile);
  }

  // Check for potential mismatches
  const licenseTypes = Object.keys(profilesByLicense);
  if (licenseTypes.length > 3) {
    blockers.push({
      type: 'profile_mismatch',
      severity: 'medium',
      message: `Organization uses ${licenseTypes.length} different license types. Profile migration may require mapping and validation.`,
      recommendation: `Document license type mappings. Ensure target org has equivalent licenses. Plan for profile consolidation or splitting strategy.`,
    });
  }

  return blockers;
}
