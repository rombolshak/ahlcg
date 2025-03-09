import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActComponent } from './act.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testAct } from '../../../../../shared/domain/test/test-act';

describe('ActComponent', () => {
  let component: ActComponent;
  let fixture: ComponentFixture<ActComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActComponent],
      providers: [provideExperimentalZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('act', testAct);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
