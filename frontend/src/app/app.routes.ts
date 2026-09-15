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
    path: 'game/:id',
    loadComponent: () => import('@pages/game-view/game-view.component').then(c => c.GameViewComponent),
    pathMatch: 'prefix',
  },
];
