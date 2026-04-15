import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
import { User, UserRole } from '../models';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'aevonfit_token';
const USER_KEY  = 'aevonfit_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string, expectedRole: UserRole): Observable<void> {
    return this.http
      .post<{ access_token: string; user: User }>(
        `${environment.apiUrl}/auth/login`,
        { email, password },
      )
      .pipe(
        tap(res => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }),
        map(res => {
          if (res.user.role !== expectedRole) {
            throw new Error(
              expectedRole === 'coach'
                ? 'Este e-mail pertence a um atleta. Use o acesso Atleta.'
                : 'Este e-mail pertence a um coach. Use o acesso Coach.',
            );
          }
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null && !!this.getToken();
  }

  isCoach(): boolean {
    return this.currentUser()?.role === 'coach';
  }

  isAthlete(): boolean {
    return this.currentUser()?.role === 'athlete';
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
