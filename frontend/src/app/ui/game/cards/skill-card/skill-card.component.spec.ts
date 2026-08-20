import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardS, cardSInfo, displayOption } from '@domain/testing/entities/test-cards';
import { getTranslocoModule } from '@testing/transloco.testing';
import { SkillCardComponent } from './skill-card.component';

describe('SkillCardComponent', () => {
  let component: SkillCardComponent;
  let fixture: ComponentFixture<SkillCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [SkillCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardS);
    fixture.componentRef.setInput('cardInfo', cardSInfo);
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
    expect(fixture.nativeElement.textContent).toContain(cardSInfo.copyright.illustrator);
  });
});
