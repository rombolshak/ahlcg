import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnemyPopoverComponent } from './enemy-popover.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { testEnemy } from 'shared/domain/test/entities/test-enemies';
import { getTranslocoModule } from '../../../../../shared/domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('EnemyPopoverComponent', () => {
  let component: EnemyPopoverComponent;
  let fixture: ComponentFixture<EnemyPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemyPopoverComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(EnemyPopoverComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('enemy', testEnemy);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
