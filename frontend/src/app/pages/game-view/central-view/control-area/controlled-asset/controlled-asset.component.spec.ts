import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlledAssetComponent } from './controlled-asset.component';
import { cardA } from 'shared/domain/test/entities/test-cards';
import { provideZonelessChangeDetection } from '@angular/core';

describe('ControlledAssetComponent', () => {
  let component: ControlledAssetComponent;
  let fixture: ComponentFixture<ControlledAssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [ControlledAssetComponent],
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
