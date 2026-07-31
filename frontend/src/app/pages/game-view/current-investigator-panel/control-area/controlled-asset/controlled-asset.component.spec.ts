import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { cardA } from 'shared/domain/test/entities/test-cards';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { getTranslocoModule } from '../../../../../shared/domain/test/transloco.testing';
import { ControlledAssetComponent } from './controlled-asset.component';

describe('ControlledAssetComponent', () => {
  let component: ControlledAssetComponent;
  let fixture: ComponentFixture<ControlledAssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [ControlledAssetComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlledAssetComponent);
    fixture.componentRef.setInput('asset', cardA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
