// tests/task-manager.test.js

const TaskManager = require('../task-manager');

describe('TaskManager', () => {
  test('should add a task to the task list', () => {
    const taskManager = new TaskManager();
    const task = { name: 'Task 1', status: 'Pending' };

    taskManager.addTask(task);

    expect(taskManager.getTasks()).toEqual([task]);
  });
});

// You can add more tests for other methods of TaskManager
