import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
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
import { firstValueFrom } from 'rxjs';
import { I18N_SCOPE } from './i18n/scope';
import { toJoinError } from './join-game.errors';

export const JOIN_GAME_DIALOG_OPTIONS = { size: 's' } as const satisfies DialogOptions;

/** #527's alphabet, case-insensitive: a player reading a code aloud should not have to match its case. */
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/i;

/**
 * The code-entry dialog, opened by `MainMenuComponent` from the "Join game" item and, prefilled,
 * from the `/join/:code` link — both share this one surface, so every state (submitting, rejected,
 * malformed, throttled) exists once. Signal Form, following `CredentialsFormComponent`.
 */
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

  protected readonly scope = I18N_SCOPE;

  /** Set through `DialogOptions.bindings` by the `/join/:code` link; empty for a menu-opened dialog. */
  public readonly initialCode = input('');

  /** The joined game's id, or `undefined` on dismissal. */
  public readonly result = output<string | undefined>();

  private readonly titleText = translateSignal('title', {}, I18N_SCOPE);
  public getTitle = () => this.titleText();

  private readonly formElement = viewChild.required<ElementRef<HTMLFormElement>>('form');

  protected readonly model = signal({ code: '' });

  protected readonly joinForm = form(
    this.model,
    path => {
      required(path.code);
      pattern(path.code, CODE_PATTERN);
      maxLength(path.code, 6);
    },
    {
      submission: {
        action: async () => {
          try {
            const game = await firstValueFrom(this.games.join(this.model().code.toUpperCase()).pipe(takeUntilDestroyed(this.destroyRef)));
            this.result.emit(game.id);
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

    // Needs an explicit injector: ngOnInit is not itself an injection context.
    afterNextRender(
      () => {
        this.formElement().nativeElement.requestSubmit();
      },
      { injector: this.injector },
    );
  }

  /** `confirm` submits through the same path a button click does, the keyboard's only route in. */
  public getInputHandlers: () => InputLayer = () => ({
    cancel: () => {
      this.dismiss();
    },
    confirm: () => {
      this.formElement().nativeElement.requestSubmit();
    },
  });

  protected dismiss(): void {
    this.result.emit(undefined);
  }
}
