import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayAreaComponent } from './play-area.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('PlayAreaComponent', () => {
  let component: PlayAreaComponent;
  let fixture: ComponentFixture<PlayAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [PlayAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayAreaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
