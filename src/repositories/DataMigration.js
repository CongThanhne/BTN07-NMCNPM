/**
 * DataMigration Service (V3 requirement)
 * Migrates existing tasks from JSON file repository to SQLite database.
 * Ensures zero data loss during persistence layer evolution.
 */
class DataMigration {
  constructor(jsonRepo, sqliteRepo) {
    this.jsonRepo = jsonRepo;
    this.sqliteRepo = sqliteRepo;
  }

  async migrate() {
    const jsonTasks = await this.jsonRepo.getAll();
    if (jsonTasks.length === 0) {
      return { migratedCount: 0, message: 'Không có dữ liệu trong tasks.json để di chuyển.' };
    }

    const sqliteTasks = await this.sqliteRepo.getAll();
    const existingIds = new Set(sqliteTasks.map(t => t.id));

    let migratedCount = 0;
    for (const task of jsonTasks) {
      if (existingIds.has(task.id)) {
        continue; // Skip already migrated task
      }
      await this.sqliteRepo.create(task);
      migratedCount++;
    }

    return {
      migratedCount,
      totalInSqlite: (await this.sqliteRepo.getAll()).length,
      message: `Đã di chuyển thành công ${migratedCount} công việc từ tasks.json sang SQLite.`
    };
  }
}

module.exports = DataMigration;
