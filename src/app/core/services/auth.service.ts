import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { User, UserRole } from '../models';
import { SocketService } from './socket.service';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'aevonfit_token';
const USER_KEY  = 'aevonfit_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.loadUser());

  constructor(
    private http: HttpClient,
    private router: Router,
    private socket: SocketService,
  ) {
    // Re-connect socket if already logged in (page refresh)
    const token = this.getToken();
    if (token) this.socket.connect(token);
  }

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
          this.socket.connect(res.access_token);
          this.requestNotificationPermission();
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
    this.socket.disconnect();
    this.router.navigate(['/login']);
  }

  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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
