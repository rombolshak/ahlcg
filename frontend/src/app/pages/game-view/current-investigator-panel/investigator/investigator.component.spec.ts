import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { InvestigatorComponent } from './investigator.component';

describe('InvestigatorComponent', () => {
  let component: InvestigatorComponent;
  let fixture: ComponentFixture<InvestigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [InvestigatorComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('investigator', InvestigatorS);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
