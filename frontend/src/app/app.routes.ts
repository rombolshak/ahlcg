import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('pages/game-view/game-view.component').then(
        (c) => c.GameViewComponent,
      ),
    pathMatch: 'full',
  },
];
