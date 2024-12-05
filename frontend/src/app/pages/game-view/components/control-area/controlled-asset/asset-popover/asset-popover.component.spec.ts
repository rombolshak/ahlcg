import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetPopoverComponent } from './asset-popover.component';
import { cardA } from '../../../../../../models/test/test-cards';

describe('AssetPopoverComponent', () => {
  let component: AssetPopoverComponent;
  let fixture: ComponentFixture<AssetPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetPopoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetPopoverComponent);
    fixture.componentRef.setInput('asset', cardA);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
