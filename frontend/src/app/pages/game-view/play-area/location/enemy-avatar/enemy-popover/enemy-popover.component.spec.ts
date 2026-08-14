import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { testEnemy } from '@domain/test/entities/test-enemies';
import { serveCardAssets } from '@domain/test/serve-card-assets';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { EnemyPopoverComponent } from './enemy-popover.component';

describe('EnemyPopoverComponent', () => {
  let component: EnemyPopoverComponent;
  let fixture: ComponentFixture<EnemyPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemyPopoverComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
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
