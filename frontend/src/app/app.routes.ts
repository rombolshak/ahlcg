import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('@pages/main-menu/main-menu.component').then(c => c.MainMenuComponent),
  },
  {
    path: 'case-files',
    loadComponent: () => import('@pages/case-files/case-files.component').then(c => c.CaseFilesComponent),
  },
  {
    path: 'join/:code',
    loadComponent: () => import('@pages/main-menu/main-menu.component').then(c => c.MainMenuComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () => import('@pages/fixture-game/fixture-game.component').then(c => c.FixtureGameComponent),
    pathMatch: 'prefix',
  },
];
