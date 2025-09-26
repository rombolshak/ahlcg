import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
import { InvestigatorThreatItemComponent } from './investigator-threat-item.component';

describe('InvestigatorThreatItemComponent', () => {
  let component: InvestigatorThreatItemComponent;
  let fixture: ComponentFixture<InvestigatorThreatItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [InvestigatorThreatItemComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorThreatItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
