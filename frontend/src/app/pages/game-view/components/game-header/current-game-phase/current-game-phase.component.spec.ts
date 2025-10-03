import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
import { CurrentGamePhaseComponent } from './current-game-phase.component';
import { InvestigatorSeeker } from './phase-colors.model';

describe('CurrentGamePhaseComponent', () => {
  let component: CurrentGamePhaseComponent;
  let fixture: ComponentFixture<CurrentGamePhaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CurrentGamePhaseComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrentGamePhaseComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('roundNumber', 4);
    fixture.componentRef.setInput('gamePhase', 'enemy');
    fixture.componentRef.setInput('actingEntityTitle', 'cards/01/119.title');
    fixture.componentRef.setInput('colorSet', InvestigatorSeeker);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays all values from inputs', () => {
    const elem = fixture.debugElement.nativeElement as HTMLElement;

    expect(elem.innerText).toContain('Round 4');
    expect(elem.innerText).toContain('Enemy phase');
    expect(elem.innerText).toContain('Icy Ghoul');
  });
});
