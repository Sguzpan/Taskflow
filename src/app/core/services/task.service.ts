import { Injectable, signal, computed, inject } from '@angular/core';
import { Task, TaskStatus, TaskPriority } from '../../models/task.model';
import { AuthService } from './auth.service';

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly TASKS_KEY = 'taskflow_tasks';
  private auth = inject(AuthService);

  private tasksSignal = signal<Task[]>(this.loadTasks());
  readonly tasks = this.tasksSignal.asReadonly();

  // Tareas del usuario autenticado, agrupadas por estado
  readonly userTasks = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.tasksSignal().filter(t => t.userId === user.id);
  });

  readonly tasksByStatus = computed(() => {
    const list = this.userTasks();
    return {
      pending:     list.filter(t => t.status === 'pending'),
      'in-progress': list.filter(t => t.status === 'in-progress'),
      completed:   list.filter(t => t.status === 'completed'),
    } as Record<TaskStatus, Task[]>;
  });

  create(input: Pick<Task, 'title' | 'description' | 'dueDate' | 'priority'>): Task {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Debes iniciar sesión para crear tareas.');
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      ...input,
      status: 'pending',
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.tasksSignal.update(list => [...list, task]);
    this.persist();
    return task;
  }

  update(id: string, changes: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>): void {
    this.tasksSignal.update(list =>
      list.map(t => t.id === id
        ? { ...t, ...changes, updatedAt: new Date().toISOString() }
        : t
      )
    );
    this.persist();
  }

  remove(id: string): void {
    this.tasksSignal.update(list => list.filter(t => t.id !== id));
    this.persist();
  }

  toggleCompleted(id: string): void {
    const task = this.tasksSignal().find(t => t.id === id);
    if (!task) return;
    this.update(id, {
      status: task.status === 'completed' ? 'pending' : 'completed',
    });
  }

  filter(filters: TaskFilters): Task[] {
    return this.userTasks().filter(t => {
      const term = filters.search?.trim().toLowerCase() ?? '';
      const matchSearch = !term ||
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term);
      const matchStatus   = !filters.status   || filters.status   === 'all' || t.status   === filters.status;
      const matchPriority = !filters.priority || filters.priority === 'all' || t.priority === filters.priority;
      return matchSearch && matchStatus && matchPriority;
    });
  }

  private persist(): void {
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasksSignal()));
  }

  private loadTasks(): Task[] {
    const raw = localStorage.getItem(this.TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}