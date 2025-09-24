import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { cardA, displayOption } from 'shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../domain/test/transloco.testing';
import { AssetCardComponent } from './asset-card.component';

describe('AssetCardComponent', () => {
  let component: AssetCardComponent;
  let fixture: ComponentFixture<AssetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [AssetCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
