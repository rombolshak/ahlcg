import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentralViewComponent } from './central-view.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('CentralViewComponent', () => {
  let component: CentralViewComponent;
  let fixture: ComponentFixture<CentralViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentralViewComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(CentralViewComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
