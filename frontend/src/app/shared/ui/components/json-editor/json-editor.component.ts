import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import {
  Content,
  createJSONEditor,
  JsonEditor,
  toJSONContent,
  ValidationError,
} from 'vanilla-jsoneditor';

@Component({
  selector: 'ah-json-editor',
  imports: [],
  templateUrl: './json-editor.component.html',
  styles:
    ':host { .jse-theme-dark { --jse-theme-color: var(--color-neutral); }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonEditorComponent<T> implements OnDestroy {
  public readonly data = input.required<T>();
  public readonly update = output<T>();
  public readonly validateFn = input<(data: T) => ValidationError[]>();

  private readonly editor = viewChild<ElementRef<Element>>('editor');
  private editorRef?: JsonEditor;

  constructor() {
    effect(() => {
      const editor = this.editor();
      if (editor) {
        this.editorRef = createJSONEditor({
          target: editor.nativeElement,
          props: {
            content: { text: '' },
            validator: this.validateFn(),
            onChange: (content: Content) => {
              this.update.emit(toJSONContent(content).json as T);
            },
          },
        });
      }
    });

    effect(() => {
      this.editorRef?.updateProps({
        content: { json: this.data() },
      });
    });
  }

  public ngOnDestroy() {
    if (this.editorRef) {
      void this.editorRef.destroy();
    }
  }
}
