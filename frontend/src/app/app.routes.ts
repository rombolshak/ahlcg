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
    // The link is the main menu itself: it opens the same join dialog, prefilled, over it — there is
    // no screen of its own behind it. See `MainMenuComponent`.
    path: 'join/:code',
    loadComponent: () => import('@pages/main-menu/main-menu.component').then(c => c.MainMenuComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () => import('@pages/game-view/game-view.component').then(c => c.GameViewComponent),
    pathMatch: 'prefix',
  },
];
