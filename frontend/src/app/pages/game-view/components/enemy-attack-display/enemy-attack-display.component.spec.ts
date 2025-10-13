import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { EnemyAttackDisplayComponent } from './enemy-attack-display.component';

describe('EnemyAttackDisplayComponent', () => {
  let component: EnemyAttackDisplayComponent;
  let fixture: ComponentFixture<EnemyAttackDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemyAttackDisplayComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(EnemyAttackDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
