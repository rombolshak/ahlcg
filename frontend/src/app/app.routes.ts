import { Routes } from '@angular/router';
import { GameViewComponent } from './pages/game-view/game-view.component';

export const routes: Routes = [
  { path: '', component: GameViewComponent, pathMatch: 'full' },
];
