import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlAreaComponent } from './control-area.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { cardA, cardA3, cardA4 } from 'shared/domain/test/test-cards';
import { By } from '@angular/platform-browser';

describe('ControlAreaComponent', () => {
  let component: ControlAreaComponent;
  let fixture: ComponentFixture<ControlAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [ControlAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlAreaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('assets', [cardA, cardA3, cardA4]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display controlled assets', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-controlled-asset')).length,
    ).toBe(component.assets().length);
  });
});
