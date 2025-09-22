import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorSubtitleComponent } from './investigator-subtitle.component';

describe('InvestigatorSubtitleComponent', () => {
  let component: InvestigatorSubtitleComponent;
  let fixture: ComponentFixture<InvestigatorSubtitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorSubtitleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorSubtitleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'test');
    fixture.componentRef.setInput('faction', 'mystic');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
