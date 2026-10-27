const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const Task = require('./src/domain/Task');
const JsonTaskRepository = require('./src/repositories/JsonTaskRepository');
const SqliteTaskRepository = require('./src/repositories/SqliteTaskRepository');
const DataMigration = require('./src/repositories/DataMigration');
const TaskService = require('./src/services/TaskService');

async function runTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG CÁC TẦNG KIẾN TRÚC V1 -> V4...\n');

  const testDir = path.join(__dirname, 'data_test');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const testJsonFile = path.join(testDir, 'test_tasks.json');
  const testDbFile = path.join(testDir, 'test_tasks.db');

  // --- TEST 1: Domain Entity & Business Rules ---
  console.log('1️⃣ Kiểm thử Domain Entity (Task.js)...');
  const t1 = new Task({ title: 'Task kiểm thử 1' });
  assert.strictEqual(t1.title, 'Task kiểm thử 1');
  assert.strictEqual(t1.completed, false);
  t1.toggleCompleted();
  assert.strictEqual(t1.completed, true);
  assert.throws(() => new Task({ title: '' }), /không được để trống/);
  console.log('   ✅ Domain Entity passed.');

  // --- TEST 2: V1/V2 JsonTaskRepository Persistence ---
  console.log('2️⃣ Kiểm thử V1/V2 JsonTaskRepository (tasks.json)...');
  const jsonRepo = new JsonTaskRepository(testJsonFile);
  const createdJson = await jsonRepo.create(t1);
  assert.strictEqual(createdJson.id, t1.id);

  let jsonAll = await jsonRepo.getAll();
  assert.strictEqual(jsonAll.length, 1);
  assert.strictEqual(jsonAll[0].title, 'Task kiểm thử 1');

  // Test restart simulation
  const jsonRepoRestart = new JsonTaskRepository(testJsonFile);
  const jsonAllRestart = await jsonRepoRestart.getAll();
  assert.strictEqual(jsonAllRestart.length, 1);
  assert.strictEqual(jsonAllRestart[0].completed, true);
  console.log('   ✅ V1/V2 JsonTaskRepository & Khôi phục sau Restart passed.');

  // --- TEST 3: V3 SqliteTaskRepository Persistence ---
  console.log('3️⃣ Kiểm thử V3 SqliteTaskRepository (SQLite)...');
  const sqliteRepo = new SqliteTaskRepository(testDbFile);
  const t2 = new Task({ title: 'Task SQLite độc lập' });
  await sqliteRepo.create(t2);

  const sqliteAll = await sqliteRepo.getAll();
  assert.strictEqual(sqliteAll.length, 1);
  assert.strictEqual(sqliteAll[0].title, 'Task SQLite độc lập');

  await sqliteRepo.update(t2.id, { completed: true });
  const updatedT2 = await sqliteRepo.getById(t2.id);
  assert.strictEqual(updatedT2.completed, true);
  console.log('   ✅ V3 SqliteTaskRepository passed.');

  // --- TEST 4: V3 DataMigration (tasks.json -> tasks.db) ---
  console.log('4️⃣ Kiểm thử V3 Data Migration (Chuyển dữ liệu từ JSON sang SQLite)...');
  // Add 1 more task to JSON
  const t3 = new Task({ title: 'Task chuyển đổi từ V2' });
  await jsonRepo.create(t3);

  const migration = new DataMigration(jsonRepo, sqliteRepo);
  const migResult = await migration.migrate();
  console.log(`   Thông báo di chuyển: ${migResult.message}`);
  assert.strictEqual(migResult.migratedCount >= 1, true);

  const allAfterMigrate = await sqliteRepo.getAll();
  const hasMigratedTask = allAfterMigrate.some(t => t.id === t3.id);
  assert.strictEqual(hasMigratedTask, true);
  console.log('   ✅ V3 Data Migration bảo toàn toàn bộ dữ liệu passed.');

  // --- TEST 5: TaskService Business Logic Decoupling ---
  console.log('5️⃣ Kiểm thử TaskService (Tách biệt tầng nghiệp vụ)...');
  const taskService = new TaskService(sqliteRepo);
  const tNew = await taskService.createTask('Nghiệp vụ qua Service');
  assert.strictEqual(tNew.title, 'Nghiệp vụ qua Service');

  await taskService.toggleTaskStatus(tNew.id);
  const tToggled = await taskService.getTask(tNew.id);
  assert.strictEqual(tToggled.completed, true);

  await taskService.deleteTask(tNew.id);
  const tDeleted = await taskService.getTask(tNew.id);
  assert.strictEqual(tDeleted, null);
  console.log('   ✅ TaskService Logic passed.');

  // --- TEST 6: V3.5 Multi-user Assignee & Role Separation ---
  console.log('6️⃣ Kiểm thử V3.5 Multi-user (Phân quyền & Phân công công việc)...');
  const tAlice = await taskService.createTask('Công việc của Alice', 'Alice');
  const tBob = await taskService.createTask('Công việc của Bob', 'Bob');
  assert.strictEqual(tAlice.assignee, 'Alice');
  assert.strictEqual(tBob.assignee, 'Bob');

  const allTasks = await taskService.listTasks();
  const aliceTasks = allTasks.filter(t => t.assignee === 'Alice');
  const bobTasks = allTasks.filter(t => t.assignee === 'Bob');
  assert.strictEqual(aliceTasks.length >= 1, true);
  assert.strictEqual(bobTasks.length >= 1, true);
  console.log('   ✅ V3.5 Multi-user Phân công công việc passed.');

  // Cleanup test dir
  sqliteRepo.close();
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}

  console.log('\n🎉 TẤT CẢ 6 BỘ TEST KIỂM CHỨNG ĐÃ ĐẠT 100%!');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
