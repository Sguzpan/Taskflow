import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../models/user.model';

interface StoredUser extends User {
  password: string; // ⚠️ solo para prototipo
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USERS_KEY = 'taskflow_users';
  private readonly SESSION_KEY = 'taskflow_session';

  private currentUserSignal = signal<User | null>(this.loadSession());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  register(name: string, email: string, password: string): { success: boolean; message?: string } {
    const users = this.getStoredUsers();
    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return { success: false, message: 'Ya existe una cuenta con ese correo.' };
    }
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser);
    return { success: true };
  }

  login(email: string, password: string): { success: boolean; message?: string } {
    const found = this.getStoredUsers().find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) {
      return { success: false, message: 'Correo o contraseña incorrectos.' };
    }
    this.setSession(found);
    return { success: true };
  }

  logout(): void {
    localStorage.removeItem(this.SESSION_KEY);
    this.currentUserSignal.set(null);
  }

  private setSession(user: StoredUser): void {
    const { password, ...safeUser } = user;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(safeUser));
    this.currentUserSignal.set(safeUser);
  }

  private loadSession(): User | null {
    const raw = localStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private getStoredUsers(): StoredUser[] {
    const raw = localStorage.getItem(this.USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private saveUsers(users: StoredUser[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }
}