# UI Forms & Internationalization

## Purpose
Separate guidance for Reactive Forms and Transcloco-based i18n in the frontend.

## When to Load
Read this when implementing forms or supporting multilingual UI.

## Related Files
- [UI Patterns](./ui_patterns.md)
- [Conventions](../../99_reference/conventions.md)
- [Component Patterns](./ui_components.md)

---

## Reactive Forms

### Benefits
- Strongly typed form models
- Composable validators
- Easy to manage validity-based UI state

### Example

```typescript
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(private fb: FormBuilder) {}

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    // call service: authService.login(payload)
  }
}
```

### Template

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <input formControlName="email" placeholder="Email" />
  <div *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
    Invalid email
  </div>

  <input type="password" formControlName="password" placeholder="Password" />
  <div *ngIf="form.get('password')?.errors?.['minlength']">
    Minimum 8 characters
  </div>

  <button type="submit" [disabled]="form.invalid">Login</button>
</form>
```

---

## i18n with Transloco

### Setup

`transloco.config.ts` is configured to load language JSON from
`public/assets/i18n/{lang}.json`.

### Usage in Template

```html
<h1>{{ 'GAME.TITLE' | transloco }}</h1>
<p>{{ 'INVESTIGATOR.SELECTED' | transloco: { count: investigators.length } }}</p>
```

### Usage in Component

```typescript
import { TranslocoService } from '@ngneat/transloco';

constructor(private transloco: TranslocoService) {}

switchLang(lang: string) {
  this.transloco.setActiveLang(lang);
}

getTranslation(key: string) {
  return this.transloco.selectTranslate(key);
}
```

### Localization Files

From `public/assets/i18n/en.json`:

```json
{
  "GAME": {
    "TITLE": "Arkham Horror LCG",
    "TURN": "Turn {{ turn }}"
  },
  "INVESTIGATOR": {
    "SELECTED": "{{ count }} investigator(s) selected"
  }
}
```

### Supported Languages
- en, de, fr, es, pt, it, ru, uk, vi, cs, ko, zh

---

## Form I18n

- Use translation keys for form field labels and validation messages.
- Keep form states (dirty/pristine, touched) separate from language text.

```html
<label>{{ 'FORM.EMAIL' | transloco }}</label>
<input formControlName="email" />
<div *ngIf="form.get('email')?.hasError('required')">
  {{ 'FORM.EMAIL_REQUIRED' | transloco }}
</div>
```

