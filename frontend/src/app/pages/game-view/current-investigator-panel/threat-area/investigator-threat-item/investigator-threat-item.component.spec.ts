import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { testEnemy } from '@domain/test/entities/test-enemies';
import { serveCardAssets } from '@domain/test/serve-card-assets';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { InvestigatorThreatItemComponent } from './investigator-threat-item.component';

describe('InvestigatorThreatItemComponent', () => {
  let component: InvestigatorThreatItemComponent;
  let fixture: ComponentFixture<InvestigatorThreatItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [InvestigatorThreatItemComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorThreatItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('enemy', testEnemy);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
