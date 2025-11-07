// Use dotenv/config to load env vars before any imports
import 'dotenv/config';

async function cleanupScans() {
  try {
    // Dynamic imports after env vars are loaded
    const { db, schema } = await import('../lib/db');
    const { desc, eq } = await import('drizzle-orm');
    
    console.log('Fetching all scans...');
    
    // Get all scans ordered by creation date (newest first)
    const allScans = await db.query.scans.findMany({
      orderBy: [desc(schema.scans.createdAt)],
    });

    console.log(`Found ${allScans.length} total scans`);

    if (allScans.length <= 3) {
      console.log('No scans to delete. Only 3 or fewer scans exist.');
      process.exit(0);
    }

    // Get the IDs of the 3 most recent scans to keep
    const scansToKeep = allScans.slice(0, 3);
    const keepIds = scansToKeep.map(scan => scan.id);

    // Get IDs of scans to delete (all except the 3 most recent)
    const scansToDelete = allScans.slice(3);
    const deleteIds = scansToDelete.map(scan => scan.id);

    console.log(`Keeping ${keepIds.length} most recent scans`);
    console.log(`Deleting ${deleteIds.length} old scans...`);

    // Delete scans one by one
    let deletedCount = 0;
    
    for (const scanId of deleteIds) {
      try {
        await db.delete(schema.scans).where(eq(schema.scans.id, scanId));
        deletedCount++;
        console.log(`Deleted scan ${scanId.substring(0, 8)}... (${deletedCount}/${deleteIds.length})`);
      } catch (deleteError) {
        console.error(`Failed to delete scan ${scanId}:`, deleteError);
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Total scans: ${allScans.length}`);
    console.log(`   Kept: ${keepIds.length}`);
    console.log(`   Deleted: ${deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to cleanup scans:', error);
    process.exit(1);
  }
}

cleanupScans();

