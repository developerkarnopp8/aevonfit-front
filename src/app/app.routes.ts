import { Routes } from '@angular/router';
import { authGuard, coachGuard, athleteGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'coach',
    loadComponent: () =>
      import('./layout/coach-shell/coach-shell.component').then(m => m.CoachShellComponent),
    canActivate: [authGuard, coachGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/coach/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/coach/students/students.component').then(m => m.StudentsComponent)
      },
      {
        path: 'plan-builder/:studentId',
        loadComponent: () =>
          import('./features/coach/plan-builder/plan-builder.component').then(m => m.PlanBuilderComponent)
      }
    ]
  },

  {
    path: 'athlete',
    loadComponent: () =>
      import('./layout/athlete-shell/athlete-shell.component').then(m => m.AthleteShellComponent),
    canActivate: [authGuard, athleteGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/athlete/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'weekly',
        loadComponent: () =>
          import('./features/athlete/weekly-view/weekly-view.component').then(m => m.WeeklyViewComponent)
      },
      {
        path: 'session/:sessionId',
        loadComponent: () =>
          import('./features/athlete/session-detail/session-detail.component').then(m => m.SessionDetailComponent)
      },
      {
        path: 'active/:sessionId',
        loadComponent: () =>
          import('./features/athlete/active-workout/active-workout.component').then(m => m.ActiveWorkoutComponent)
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/athlete/history/history.component').then(m => m.HistoryComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
