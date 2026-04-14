import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole } from '../models';

const MOCK_USERS: User[] = [
  { id: 'coach-001', name: 'Luan Silveira',    email: 'luan@aevonfit.com',    role: 'coach' },
  { id: 'athlete-001', name: 'Gustavo Karnopp', email: 'gustavo@aevonfit.com', role: 'athlete' },
];

const MOCK_PASSWORDS: Record<string, string> = {
  'luan@aevonfit.com':    'coach123',
  'gustavo@aevonfit.com': 'athlete123',
};

const SESSION_KEY = 'aevonfit_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.loadFromStorage());

  constructor(private router: Router) {}

  login(email: string, password: string, role: UserRole): { success: boolean; error?: string } {
    const user = MOCK_USERS.find(u => u.email === email && u.role === role);
    if (!user) return { success: false, error: 'Usuário não encontrado para esse perfil.' };
    if (MOCK_PASSWORDS[email] !== password) return { success: false, error: 'Senha incorreta.' };
    this.currentUser.set(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true };
  }

  logout(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isCoach(): boolean {
    return this.currentUser()?.role === 'coach';
  }

  isAthlete(): boolean {
    return this.currentUser()?.role === 'athlete';
  }

  private loadFromStorage(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
