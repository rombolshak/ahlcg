import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnemyAvatarComponent } from './enemy-avatar.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { testEnemy } from 'shared/domain/test/entities/test-enemies';
import { provideHttpClient } from '@angular/common/http';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';

describe('EnemyAvatarComponent', () => {
  let component: EnemyAvatarComponent;
  let fixture: ComponentFixture<EnemyAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemyAvatarComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
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
