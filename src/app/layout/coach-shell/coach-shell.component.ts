import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-coach-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './coach-shell.component.html',
  styleUrl: './coach-shell.component.scss'
})
export class CoachShellComponent {
  sidebarOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/coach/dashboard',  icon: 'dashboard' },
    { label: 'Alunos',    route: '/coach/students',   icon: 'group' },
    { label: 'Planos',    route: '/coach/plan-builder', icon: 'fitness_center' },
    { label: 'Biblioteca',route: '/coach/dashboard',  icon: 'menu_book' },
    { label: 'Financeiro',route: '/coach/dashboard',  icon: 'payments' },
  ];

  constructor(public auth: AuthService) {}

  logout(): void { this.auth.logout(); }
}
