import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameHeaderComponent } from './game-header.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('GameHeaderComponent', () => {
  let component: GameHeaderComponent;
  let fixture: ComponentFixture<GameHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [GameHeaderComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(GameHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
