import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreatAreaComponent } from './threat-area.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { testEnemy } from 'shared/domain/test/entities/test-enemies';
import { By } from '@angular/platform-browser';

describe('ThreatAreaComponent', () => {
  let component: ThreatAreaComponent;
  let fixture: ComponentFixture<ThreatAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [ThreatAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreatAreaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('threatArea', [
      {
        ...testEnemy,
        damage: 1,
      },
      {
        ...testEnemy,
        damage: 2,
        isMassive: true,
      },
      {
        ...testEnemy,
        damage: 3,
      },
    ]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all enemies with massive first', () => {
    const enemies = fixture.debugElement.queryAll(By.css('ah-enemy-avatar'));

    expect(enemies.length).toBe(3);
    expect(enemies.filter((e) => e.classes['w-full']).length).toBe(1);
    expect(enemies[0]?.classes['w-full']).toBeTruthy();
  });
});
