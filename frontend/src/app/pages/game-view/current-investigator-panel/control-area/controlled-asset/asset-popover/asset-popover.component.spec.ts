import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { cardA } from 'shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../../../shared/domain/test/transloco.testing';
import { AssetPopoverComponent } from './asset-popover.component';

describe('AssetPopoverComponent', () => {
  let component: AssetPopoverComponent;
  let fixture: ComponentFixture<AssetPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      imports: [AssetPopoverComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetPopoverComponent);
    fixture.componentRef.setInput('asset', cardA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
