import dataSource from './data-source';

async function revertLastMigration(): Promise<void> {
  await dataSource.initialize();
  await dataSource.undoLastMigration();
  await dataSource.destroy();
  console.log('Last migration reverted.');
}

revertLastMigration().catch((error: unknown) => {
  console.error('Revert failed:', error);
  process.exit(1);
});
