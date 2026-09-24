import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSummary } from '@features/games/games.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { CaseFileCardComponent } from './case-file-card.component';

const game = (completedAt: GameSummary['completedAt']): GameSummary => ({
  id: 'game-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastPlayedAt: new Date('2026-01-05T12:00:00Z'),
  completedAt,
});

describe('CaseFileCardComponent', () => {
  let fixture: ComponentFixture<CaseFileCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CaseFileCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseFileCardComponent);
  });

  it('should show the last played line and no completed line for an active game', () => {
    fixture.componentRef.setInput('game', game(null));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Last played');
    expect(text).not.toContain('Closed');
  });

  it('should show the completed line and no last played line for a finished game', () => {
    fixture.componentRef.setInput('game', game(new Date('2026-01-10T00:00:00Z')));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Closed');
    expect(text).not.toContain('Last played');
  });
});
