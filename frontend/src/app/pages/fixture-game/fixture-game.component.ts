import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogComponent } from '@core/dialog/dialog.component';
import { InputManagerService } from '@core/input-manager.service';
import { GameConnectionService } from '@features/games/game-connection.service';
import { GameMember, GamesService } from '@features/games/games.service';
import { SettingsComponent } from '@features/settings/settings.component';
import { finalize } from 'rxjs';
import { FixtureGameStore } from './fixture-game.store';

type NoticeId = 'rejected' | 'network-error' | 'empty';
type Screen = 'loading' | 'ready' | NoticeId;

interface Notice {
  testId: NoticeId;
  className: string;
  text: string;
}

const NOTICES: Record<NoticeId, Notice> = {
  rejected: { testId: 'rejected', className: 'alert w-2xl alert-error', text: 'The server rejected this connection. You are not a member of this game.' },
  'network-error': { testId: 'network-error', className: 'alert w-2xl alert-error', text: 'The connection to the server was lost.' },
  empty: { testId: 'empty', className: 'alert w-2xl alert-info', text: 'This game has no state yet.' },
};

const ACTIONS = { sharedDec: 'shared:dec', sharedInc: 'shared:inc', secretDec: 'secret:dec', secretInc: 'secret:inc', reveal: 'reveal' } as const;

const SIGN_CLASSES = { Negative: 'badge badge-error', Zero: 'badge badge-neutral', Positive: 'badge badge-success' } as const;

@Component({
  selector: 'ah-fixture-game',
  imports: [DialogComponent, SettingsComponent],
  templateUrl: './fixture-game.component.html',
  providers: [FixtureGameStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative h-screen w-screen block bg-[url("/assets/images/main-menu.webp")] bg-cover bg-center bg-no-repeat bg-black',
  },
})
export class FixtureGameComponent implements OnInit, OnDestroy {
  private readonly inputManager = inject(InputManagerService);
  private readonly connection = inject(GameConnectionService);
  private readonly games = inject(GamesService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(FixtureGameStore);
  private readonly settingsDialog = viewChild.required<DialogComponent>('settings');

  public readonly id = input.required<string>();

  protected readonly notice = computed(() => {
    const state = this.connection.state();
    if (state.status === 'disconnected' && state.reason === 'server_rejected') return NOTICES.rejected;
    if (state.status === 'disconnected' && state.reason === 'network_error') return NOTICES['network-error'];

    return this.store.status() === 'empty' ? NOTICES.empty : null;
  });

  protected readonly screen = computed<Screen>(() => {
    const notice = this.notice();
    if (notice) return notice.testId;

    return this.store.status() === 'ready' ? 'ready' : 'loading';
  });

  private readonly othersKey = computed(() => {
    const view = this.store.viewModel();
    return view ? Object.keys(view.others).sort().join(',') : undefined;
  });

  private readonly members = rxResource({
    params: () => {
      const others = this.othersKey();
      return others === undefined ? undefined : { id: this.id(), others };
    },
    stream: ({ params }) => this.games.members(params.id),
  });

  private readonly names = linkedSignal<GameMember[] | undefined, Map<string, string | null>>({
    source: () => (this.members.hasValue() ? this.members.value() : undefined),
    computation: (loaded, previous) => (loaded ? new Map(loaded.map(member => [member.userId, member.userName])) : (previous?.value ?? new Map())),
  });

  protected readonly others = computed(() => {
    const view = this.store.viewModel();
    if (!view) return [];

    const names = this.names();
    return Object.entries(view.others).map(([userId, sign]) => ({
      userId,
      sign,
      label: names.get(userId) ?? 'Anonymous',
      signClass: SIGN_CLASSES[sign],
    }));
  });

  protected readonly revealed = computed(() => this.store.viewModel()?.revealed ?? 'None yet');

  protected readonly journal = computed(() =>
    [...(this.store.viewModel()?.journal ?? [])]
      .reverse()
      .map(entry => (entry.key === 'fixture.revealed' ? `Revealed ${String(entry.parameters['value'])}` : entry.key)),
  );

  protected readonly actions = ACTIONS;

  private readonly available = computed(() => new Set(this.store.availableActions()));

  protected readonly turn = computed(() => {
    if (this.store.holdsActions()) return 'Your move';

    const acting = this.store.viewModel()?.actingPlayers ?? [];
    const waiting = this.others()
      .filter(other => acting.includes(other.userId))
      .map(other => other.label);
    return waiting.length > 0 ? `Waiting for ${waiting.join(', ')}` : 'Resolving…';
  });

  private readonly memberCount = computed(() => Object.keys(this.store.viewModel()?.others ?? {}).length + 1);

  protected readonly changingSeats = signal(false);

  protected openSeat(): void {
    this.setSeats(this.memberCount() + 1);
  }

  protected closeSeats(): void {
    this.setSeats(this.memberCount());
  }

  private setSeats(count: number): void {
    this.changingSeats.set(true);
    this.games
      .setMembersCount(this.id(), count)
      .pipe(
        finalize(() => {
          this.changingSeats.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (err: unknown) => {
          console.error('Could not change the seats', err);
        },
      });
  }

  protected isAvailable(action: string): boolean {
    return this.available().has(action);
  }

  protected choose(action: string): void {
    this.store.choose(action);
  }

  public ngOnInit(): void {
    this.inputManager.registerGlobal({
      cancel: () => {
        this.settingsDialog().open();
      },
    });
    this.store.connect(this.id());
  }

  public ngOnDestroy(): void {
    this.store.disconnect();
  }
}
