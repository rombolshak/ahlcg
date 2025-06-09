import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardCopyrightComponent } from './card-copyright.component';
import { displayOption } from 'shared/domain/test/entities/test-cards';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';

describe('CardCopyrightComponent', () => {
  let component: CardCopyrightComponent;
  let fixture: ComponentFixture<CardCopyrightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CardCopyrightComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardCopyrightComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', {
      copyright: { illustrator: 'Test Art', ffg: '2015' },
    });
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print copyright', () => {
    expect(fixture.debugElement.queryAll(By.css('span')).length).toEqual(3);
    expect(
      fixture.debugElement.query(By.css('span:nth-child(2)')).nativeElement
        .innerText,
    ).toContain('FFG');
  });
});
