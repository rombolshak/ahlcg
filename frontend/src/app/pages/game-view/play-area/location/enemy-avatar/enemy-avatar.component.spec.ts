import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { testEnemy } from '@testing/entities/test-enemies';
import { serveCardAssets } from '@testing/serve-card-assets';
import { getTranslocoModule } from '@testing/transloco.testing';
import { EnemyAvatarComponent } from './enemy-avatar.component';

describe('EnemyAvatarComponent', () => {
  let component: EnemyAvatarComponent;
  let fixture: ComponentFixture<EnemyAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemyAvatarComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
    }).compileComponents();

    fixture = TestBed.createComponent(EnemyAvatarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('enemy', testEnemy);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
