import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorAvatarComponent } from './investigator-avatar.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';

describe('InvestigatorAvatarComponent', () => {
  let component: InvestigatorAvatarComponent;
  let fixture: ComponentFixture<InvestigatorAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
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
