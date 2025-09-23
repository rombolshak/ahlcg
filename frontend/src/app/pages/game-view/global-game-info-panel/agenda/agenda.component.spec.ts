import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { testAgenda } from 'shared/domain/test/entities/test-agenda';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { AgendaComponent } from './agenda.component';

describe('AgendaComponent', () => {
  let component: AgendaComponent;
  let fixture: ComponentFixture<AgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('agenda', testAgenda);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display total doom slots', () => {
    expect(fixture.debugElement.queryAll(By.css('img')).length).toEqual(
      testAgenda.requiredDoom,
    );
  });

  it('should display current doom bright', () => {
    expect(
      fixture.debugElement.queryAll(By.css('img.brightness-125')).length,
    ).toEqual(testAgenda.currentDoom);
  });

  it('should display doom on cards', () => {
    expect(
      fixture.debugElement.queryAll(By.css('img.brightness-95')).length,
    ).toEqual(testAgenda.doomOnCards);
  });

  it('should display agenda title', () => {
    expect(
      (fixture.debugElement.nativeElement as HTMLElement).textContent,
    ).toContain('Прорываясь вперёд');
  });

  async function checkDoom(doom: number, color: string) {
    fixture.componentRef.setInput('agenda', {
      ...testAgenda,
      currentDoom: doom,
    });
    await fixture.whenStable();

    expect(fixture.debugElement.classes[`to-${color}-800/70`]).toBeTrue();
  }

  it('should change background by doom threshold', async () => {
    await checkDoom(0, 'slate');
    await checkDoom(1, 'slate');
    await checkDoom(2, 'slate');

    await checkDoom(3, 'yellow');
    await checkDoom(4, 'yellow');

    await checkDoom(5, 'amber');
    await checkDoom(6, 'amber');

    await checkDoom(7, 'orange');
    await checkDoom(8, 'orange');

    await checkDoom(9, 'red');
    await checkDoom(10, 'red');
    await checkDoom(11, 'red');
  });
});
