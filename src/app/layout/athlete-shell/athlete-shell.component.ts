import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { NotificationPermissionBannerComponent } from '../../shared/components/notification-permission-banner/notification-permission-banner.component';

@Component({
  selector: 'app-athlete-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationPermissionBannerComponent],
  templateUrl: './athlete-shell.component.html',
  styleUrl: './athlete-shell.component.scss'
})
export class AthleteShellComponent implements OnInit, OnDestroy {
  menuOpen     = signal(false);
  unreadMsgs   = signal(0);
  /** Telas de tela-cheia (ex: treino ativo) escondem o header/nav fixos do shell. */
  fullScreen   = signal(false);

  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private socket: SocketService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.socket.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.router.url.includes('/athlete/messages')) {
          this.unreadMsgs.update(n => n + 1);
        }
      });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe((e: any) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      if (url.includes('/athlete/messages')) {
        this.unreadMsgs.set(0);
      }
      this.fullScreen.set(url.includes('/athlete/active/'));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void { this.auth.logout(); }
}
