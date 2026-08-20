import { afterNextRender, ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { AuthService, User } from '@core/auth/auth.service';
import { DialogComponent } from '@core/dialog/dialog.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { applicationConfig, Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { of } from 'rxjs';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { AccountComponent } from './account.component';

/**
 * `DialogService` appends its own host `<div>` to `document.body`, outside the Storybook canvas —
 * so the dialog it opens (`UpgradeStacked`'s credentials form) cannot be found with
 * `within(canvasElement)`. That story opens it for real, from `afterNextRender` — never
 * `ngOnInit`/`ngAfterViewInit`, which would re-enter change detection — and queries it directly
 * from `document.querySelectorAll('dialog')` rather than the canvas.
 *
 * Opening a dialog for real does **not** by itself earn a story a place at this tier: happy-dom
 * runs `showModal()` and the rest of `DialogService.open()` fine (`dialog.service.spec.ts`), so a
 * story earns F1 only when its *assertion* needs real layout or real focus — see
 * `docs/testing.md`'s "Component tests (F1)" section. `UpgradeStacked` stays only for the
 * top-layer hit test; everything else it used to assert moved to `account.component.spec.ts`.
 *
 * `Anonymous`/`Permanent`/`SignedOut` and `AccountKeyboardNavigation` below need none of the
 * `DialogService` machinery: the first three render the three static states and never interact, so
 * the older `[isOpen]="true"` projection is enough; `AccountKeyboardNavigation` opens
 * `AccountDialogHostComponent`'s own dialog locally (`.open()`, not `DialogService`), which is why
 * it stays inside the canvas.
 */

/**
 * `applicationConfig`, not `moduleMetadata`: `moduleMetadata`'s `providers` land as an *element*-
 * injector override on Storybook's own wrapper component, which only reaches content declared
 * inside the story's template. `DialogService.open()` (`UpgradeStacked` below) creates its content
 * with `createComponent(..., { environmentInjector })` instead, bypassing that element-injector
 * chain — a stub registered the `moduleMetadata` way would be invisible to it, and the real
 * `AuthService` would run underneath. `applicationConfig` registers the override on the story's
 * actual root environment injector, which every path reaches alike.
 */
const withUser = (user: User | undefined, logout: ReturnType<typeof fn> = fn(() => of(undefined))) =>
  applicationConfig({
    providers: [
      {
        provide: AuthService,
        useValue: { currentUser: of(user), logout },
      },
    ],
  });

const anonymousUser: User = { isAnonymous: true, email: null, userName: '4139f1ea-4901-4253-a391-021faa001677' };

/** Opens `<ah-account>` as its own dialog content — real `showModal()`, so the `AH_DIALOG_CONTENT`
 * provider `AccountComponent` registers is live and the input layer it pushes actually receives
 * keydowns, unlike the meta's static `[isOpen]="true"` dialog. */
@Component({
  selector: 'ah-story-account-dialog-host',
  imports: [DialogComponent, AccountComponent, TranslocoDirective],
  template: ` <ah-dialog *transloco="let t" #dialog size="s" [title]="t('settings.account.title')">
    <ah-account />
  </ah-dialog>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AccountDialogHostComponent {
  private readonly dialogRef = viewChild.required<DialogComponent>('dialog');

  constructor() {
    afterNextRender(() => {
      this.dialogRef().open();
    });
  }
}

const meta: Meta<AccountComponent> = {
  component: AccountComponent,
  decorators: [
    moduleMetadata({
      imports: [DialogComponent, AccountDialogHostComponent],
    }),
  ],
  // Load-bearing, not just a failure guard: `UpgradeStacked` never closes the credentials dialog it
  // opens, so on every green run it leaves a `DialogService`-opened dialog in `document.body`,
  // outside the canvas Storybook replaces between stories. Without this, the next story in this
  // file would find that stray dialog too. All stories in this file share one browser page.
  beforeEach: ({ canvasElement }) => {
    document.body.querySelectorAll('dialog').forEach(dialog => {
      if (canvasElement.contains(dialog)) return;
      dialog.parentElement?.remove();
    });
  },
  parameters: {
    // The dialog is `position: fixed` and covers the canvas, so story padding would only mislead —
    // this view renders inside the settings dialog's own `size="s"` box, as it does in the app.
    layout: 'fullscreen',
  },
  // The heading is the dialog's, not this component's: `SettingsComponent` renames the dialog when
  // it switches to this view, so the story hardcodes the name that swap produces.
  render: () => ({
    template: `
      <ah-dialog [isOpen]="true" title="Your Account" size="s">
        <ah-account />
      </ah-dialog>`,
  }),
};

export default meta;
type Story = StoryObj<AccountComponent>;

export const Anonymous: Story = {
  decorators: [withUser({ isAnonymous: true, email: null, userName: '4139f1ea-4901-4253-a391-021faa001677' })],
};

export const Permanent: Story = {
  decorators: [withUser({ isAnonymous: false, email: 'a@example.com', userName: 'Alice' })],
};

export const SignedOut: Story = {
  decorators: [withUser(undefined)],
};

export const UpgradeStacked: Story = {
  decorators: [withUser(anonymousUser)],
  render: () => ({ template: '<ah-story-account-dialog-host />' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('upgrade'));

    const credentialsDialog = await waitFor(() => {
      const dialog = Array.from(document.querySelectorAll('dialog')).find(d => !canvasElement.contains(d));
      if (!dialog) throw new Error('Expected the credentials form dialog to have opened outside the canvas');
      return dialog;
    });

    // Both dialogs being present and `.open`, the form, and its own heading are all covered at F0
    // now (`account.component.spec.ts`'s "should open a second, independently-open dialog..."), so
    // under Rule 2 they would be misplaced here. What only a real layout engine can show is "over",
    // not just "also open": a real top-layer hit test at the credentials dialog's own centre point
    // has to land inside it, not fall through to the account dialog underneath. Guarded against a
    // zero-sized rect so this cannot pass vacuously on an unlaid-out element — that is exactly how
    // it would silently succeed in a fake DOM.
    const rect = credentialsDialog.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) throw new Error('Expected the credentials dialog to have a laid-out size');
    const topElement = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await expect(credentialsDialog.contains(topElement)).toBe(true);
  },
};

export const AccountKeyboardNavigation: Story = {
  decorators: [withUser(anonymousUser)],
  render: () => ({ template: '<ah-story-account-dialog-host />' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialogElement = canvasElement.querySelector('dialog');
    if (!dialogElement) throw new Error('Expected the account dialog to be in the canvas');

    // `listNavigation` (`core/list-navigation.ts`) only moves a `selectedIndex` signal and never
    // calls `focus()` — docs/testing.md names that as correctly staying at the happy-dom tier. What
    // this story can newly observe is what only a real `showModal()` provides: native focus landing
    // inside the dialog, and a real `keydown` reaching `AccountComponent` through the input layer
    // that `DialogComponent.open()` pushes (nothing pushes it for `[isOpen]="true"`). Selection
    // moving between actions below is the visible consequence of that layer receiving the event,
    // not the claim under test.
    await expect(dialogElement.contains(document.activeElement)).toBe(true);

    const upgrade = canvas.getByTestId('upgrade');
    const signOut = canvas.getByTestId('sign_out');
    await expect(upgrade).toHaveClass('btn-primary');

    await userEvent.keyboard('{ArrowRight}');
    await expect(signOut).toHaveClass('btn-primary');
    await expect(upgrade).not.toHaveClass('btn-primary');

    await userEvent.keyboard('{ArrowLeft}');
    await expect(upgrade).toHaveClass('btn-primary');
    await expect(signOut).not.toHaveClass('btn-primary');
  },
};
