import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentralViewComponent } from './central-view.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CentralViewComponent', () => {
  let component: CentralViewComponent;
  let fixture: ComponentFixture<CentralViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentralViewComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CentralViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('assets', []);
    fixture.componentRef.setInput('cards', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
