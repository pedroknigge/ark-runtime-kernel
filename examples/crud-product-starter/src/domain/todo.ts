/** DomainModel — business rules and ports. No database or UI imports here. */

export type TodoId = string;

export type Todo = {
  id: TodoId;
  title: string;
  done: boolean;
};

export interface TodoRepository {
  list(): Promise<Todo[]>;
  save(todo: Todo): Promise<void>;
}

export function createTodo(title: string): Todo {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('Todo title is required');
  }
  return { id: crypto.randomUUID(), title: trimmed, done: false };
}