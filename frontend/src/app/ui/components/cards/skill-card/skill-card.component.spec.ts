import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { cardS, displayOption } from '@testing/entities/test-cards';
import { serveCardAssets } from '@testing/serve-card-assets';
import { getTranslocoModule } from '@testing/transloco.testing';
import { SkillCardComponent } from './skill-card.component';

describe('SkillCardComponent', () => {
  let component: SkillCardComponent;
  let fixture: ComponentFixture<SkillCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
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
