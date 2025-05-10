import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnemyAvatarComponent } from './enemy-avatar.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testEnemy } from 'shared/domain/test/entities/test-enemies';

describe('EnemyAvatarComponent', () => {
  let component: EnemyAvatarComponent;
  let fixture: ComponentFixture<EnemyAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemyAvatarComponent],
      providers: [provideExperimentalZonelessChangeDetection()],
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
