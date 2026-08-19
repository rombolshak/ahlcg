import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA, cardAInfo, displayOption } from '@testing/entities/test-cards';
import { getTranslocoModule } from '@testing/transloco.testing';
import { AssetCardComponent } from './asset-card.component';

describe('AssetCardComponent', () => {
  let component: AssetCardComponent;
  let fixture: ComponentFixture<AssetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [AssetCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('cardInfo', cardAInfo);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the player card', () => {
    expect(fixture.debugElement.query(By.css('ah-player-card'))).toBeTruthy();
  });

  it('should show the illustrator in the copyright line', () => {
    expect(fixture.nativeElement.textContent).toContain(cardAInfo.copyright.illustrator);
  });
});
