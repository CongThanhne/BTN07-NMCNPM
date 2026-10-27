/**
 * Contract: ITaskRepository
 * Abstract interface for data persistence mechanisms (Dependency Inversion Principle).
 */
class ITaskRepository {
  async getAll() {
    throw new Error('Method getAll() must be implemented.');
  }

  async getById(id) {
    throw new Error('Method getById(id) must be implemented.');
  }

  async create(task) {
    throw new Error('Method create(task) must be implemented.');
  }

  async update(id, updates) {
    throw new Error('Method update(id, updates) must be implemented.');
  }

  async delete(id) {
    throw new Error('Method delete(id) must be implemented.');
  }
}

module.exports = ITaskRepository;
