import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetCardComponent } from './asset-card.component';
import { cardA, displayOption } from 'shared/domain/test/test-cards';

describe('PlayerCardComponent', () => {
  let component: AssetCardComponent;
  let fixture: ComponentFixture<AssetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
