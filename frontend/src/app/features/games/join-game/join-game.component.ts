import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, maxLength, pattern, required } from '@angular/forms/signals';
import { AH_DIALOG_CONTENT } from '@core/dialog/dialog-content';
import { DialogContentWithResult, DialogOptions } from '@core/dialog/dialog.service';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InputLayer } from '@core/input-manager.service';
import { GamesService } from '@features/games/games.service';
import { translateSignal } from '@jsverse/transloco';
import { FocusTrapDirective } from '@ui/directives/focus-trap.directive';
import { firstValueFrom, timer } from 'rxjs';
import { I18N_SCOPE } from './i18n/scope';
import { toJoinError } from './join-game.errors';

export const JOIN_GAME_DIALOG_OPTIONS = { size: 's' } as const satisfies DialogOptions;

export const GRANTED_REDIRECT_DELAY = new InjectionToken<number>('Join game granted redirect delay', {
  factory: () => 1500,
});

const CODE_LENGTH = 6;
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/i;

@Component({
  selector: 'ah-join-game',
  imports: [ScopedTranslocoDirective, FormField, FormRoot, FocusTrapDirective],
  templateUrl: './join-game.component.html',
  providers: [
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: JoinGameComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinGameComponent implements DialogContentWithResult<string | undefined>, OnInit {
  private readonly games = inject(GamesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  protected readonly redirectDelay = inject(GRANTED_REDIRECT_DELAY);

  protected readonly scope = I18N_SCOPE;

  public readonly initialCode = input('');

  public readonly result = output<string | undefined>();

  private readonly titleText = translateSignal('title', {}, I18N_SCOPE);
  public getTitle = () => this.titleText();

  private readonly formElement = viewChild.required<ElementRef<HTMLFormElement>>('form');

  protected readonly model = signal({ code: '' });
  protected readonly focused = signal(false);
  protected readonly granted = signal<string | undefined>(undefined);

  protected readonly codeChars = computed(() => {
    const code = this.model().code.toUpperCase();
    return Array.from({ length: CODE_LENGTH }, (_, index) => code[index] ?? '');
  });

  private readonly nextSlotIndex = computed(() => this.model().code.length);

  protected readonly formError = computed(() => this.joinForm().errors()[0]);

  protected readonly showFormatHint = computed(() => this.joinForm.code().touched() && !!this.joinForm.code().getError('pattern'));

  protected readonly codeGranted = computed(() => !!this.granted());

  protected readonly codeInError = computed(() => {
    const kind = this.formError()?.kind;
    return this.showFormatHint() || kind === 'rejected' || kind === 'too_many_attempts';
  });

  protected readonly joinForm = form(
    this.model,
    path => {
      required(path.code);
      pattern(path.code, CODE_PATTERN);
      maxLength(path.code, CODE_LENGTH);
    },
    {
      submission: {
        action: async () => {
          try {
            const game = await firstValueFrom(this.games.join(this.model().code.toUpperCase()).pipe(takeUntilDestroyed(this.destroyRef)));
            this.granted.set(game.id);
            timer(this.redirectDelay)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(() => {
                this.result.emit(game.id);
              });
            return undefined;
          } catch (err: unknown) {
            return toJoinError(err);
          }
        },
      },
    },
  );

  ngOnInit(): void {
    const code = this.initialCode();
    if (!code) return;

    this.model.set({ code });
    this.joinForm.code().markAsTouched();

    if (!CODE_PATTERN.test(code)) return;

    afterNextRender(
      () => {
        this.formElement().nativeElement.requestSubmit();
      },
      { injector: this.injector },
    );
  }

  protected isCaretSlot(index: number, char: string): boolean {
    return this.focused() && !this.granted() && !char && index === this.nextSlotIndex();
  }

  public getInputHandlers: () => InputLayer = () => ({
    cancel: () => {
      if (this.granted()) return;
      this.dismiss();
    },
    confirm: () => {
      if (this.granted()) return;
      this.formElement().nativeElement.requestSubmit();
    },
  });

  protected dismiss(): void {
    this.result.emit(undefined);
  }
}
