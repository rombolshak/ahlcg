import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorTitleComponent } from './investigator-title.component';

describe('InvestigatorTitleComponent', () => {
  let component: InvestigatorTitleComponent;
  let fixture: ComponentFixture<InvestigatorTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [InvestigatorTitleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorTitleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'test title');
    fixture.componentRef.setInput('faction', 'rogue');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
