import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillCardComponent } from './skill-card.component';
import { cardS, displayOption } from 'shared/domain/test/entities/test-cards';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '../../../../domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('SkillCardComponent', () => {
  let component: SkillCardComponent;
  let fixture: ComponentFixture<SkillCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [SkillCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardS);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
