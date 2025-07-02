import { ElementRef, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private readonly dialogs = new Map<string, ElementRef<HTMLDialogElement>>();

  register(id: string, dialog: ElementRef<HTMLDialogElement>) {
    console.log('registered dialog', id);
    this.dialogs.set(id, dialog);
  }

  unregister(id: string) {
    this.dialogs.delete(id);
  }

  open(id: string) {
    this.dialogs.get(id)?.nativeElement.showModal();
  }

  close(id: string) {
    this.dialogs.get(id)?.nativeElement.close();
  }

  toggle(id: string) {
    const element = this.dialogs.get(id)?.nativeElement;
    if (element) {
      if (element.open) element.close();
      else element.showModal();
    }
  }
}
