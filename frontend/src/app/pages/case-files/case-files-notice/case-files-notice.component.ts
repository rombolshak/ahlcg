import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type NoticeTone = 'neutral' | 'error';

@Component({
  selector: 'ah-case-files-notice',
  templateUrl: './case-files-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex w-full flex-col items-center gap-4 rounded-box border-2 bg-base-200/94 px-8 py-10 text-center',
    '[class.border-error]': 'isError()',
    '[class.border-base-content/20]': '!isError()',
    '[attr.role]': 'isError() ? "alert" : null',
  },
})
export class CaseFilesNoticeComponent {
  public readonly heading = input.required<string>();
  public readonly message = input.required<string>();
  public readonly tone = input<NoticeTone>('neutral');

  protected readonly isError = computed(() => this.tone() === 'error');
}
