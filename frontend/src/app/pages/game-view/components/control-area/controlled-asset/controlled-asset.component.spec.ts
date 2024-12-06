import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlledAssetComponent } from './controlled-asset.component';
import { cardA } from 'models/test/test-cards';

describe('ControlledAssetComponent', () => {
  let component: ControlledAssetComponent;
  let fixture: ComponentFixture<ControlledAssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlledAssetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlledAssetComponent);
    fixture.componentRef.setInput('asset', cardA);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
