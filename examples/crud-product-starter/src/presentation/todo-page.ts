/** PresentationAdapters — UI entry; calls application use cases, never the database. */

import { listTodos } from '../application/list-todos.js';
import type { TodoRepository } from '../application/todo-repository-port.js';

export async function renderTodoPage(repo: TodoRepository): Promise<string> {
  const todos = await listTodos(repo);
  const lines = todos.map((todo) => `- [${todo.done ? 'x' : ' '}] ${todo.title}`);
  return ['Todos', ...lines].join('\n');
}