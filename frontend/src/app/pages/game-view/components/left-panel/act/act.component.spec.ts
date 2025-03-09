import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActComponent } from './act.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testAct } from 'shared/domain/test/test-act';
import { By } from '@angular/platform-browser';

describe('ActComponent', () => {
  let component: ActComponent;
  let fixture: ComponentFixture<ActComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActComponent],
      providers: [provideExperimentalZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('act', testAct);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all objectives', () => {
    expect(
      fixture.debugElement.queryAll(By.css('[data-testId="objective"]')).length,
    ).toBe(testAct.objectives.length);
  });

  async function checkProgress(
    first: number,
    second: number,
    progress: string,
  ) {
    fixture.componentRef.setInput('act', {
      ...testAct,
      objectives: [
        { ...testAct.objectives[0], currentValue: first },
        { ...testAct.objectives[1], currentValue: second },
      ],
    });
    await fixture.whenStable();

    console.log(
      'checking ',
      fixture.debugElement.classes,
      'to contain',
      `bg-${progress}-700/80`,
    );

    expect(fixture.debugElement.classes[`bg-${progress}-700/80`]).toBeTrue();
  }

  it('should calc overall objectives progress', async () => {
    await checkProgress(18, 6, 'slate');
    await checkProgress(12, 6, 'cyan');
    await checkProgress(6, 6, 'emerald');
    await checkProgress(0, 6, 'lime');
    await checkProgress(18, 6, 'slate');
    await checkProgress(18, 4, 'cyan');
    await checkProgress(18, 2, 'emerald');
    await checkProgress(18, 0, 'lime');
  });

  it('should display act title', () => {
    expect(
      (fixture.debugElement.nativeElement as HTMLElement).textContent,
    ).toContain(testAct.title);
  });
});
