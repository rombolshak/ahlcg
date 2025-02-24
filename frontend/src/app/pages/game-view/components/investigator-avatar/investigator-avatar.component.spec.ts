import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorAvatarComponent } from './investigator-avatar.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { InvestigatorS } from 'shared/domain/test/test-investigators';

describe('InvestigatorAvatarComponent', () => {
  let component: InvestigatorAvatarComponent;
  let fixture: ComponentFixture<InvestigatorAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [InvestigatorAvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorAvatarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('investigator', InvestigatorS);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
