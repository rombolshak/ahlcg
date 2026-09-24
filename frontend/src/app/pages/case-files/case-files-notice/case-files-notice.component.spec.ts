import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaseFilesNoticeComponent } from './case-files-notice.component';

describe('CaseFilesNoticeComponent', () => {
  let fixture: ComponentFixture<CaseFilesNoticeComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CaseFilesNoticeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseFilesNoticeComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('heading', 'Title');
    fixture.componentRef.setInput('message', 'Body');
  });

  it('should render the heading above the message', () => {
    fixture.detectChanges();

    expect(host.querySelector('h2')?.textContent).toBe('Title');
    expect(host.querySelector('p')?.textContent).toBe('Body');
  });

  it('should announce itself as an alert only in the error tone', () => {
    fixture.detectChanges();
    expect(host.getAttribute('role')).toBeNull();

    fixture.componentRef.setInput('tone', 'error');
    fixture.detectChanges();
    expect(host.getAttribute('role')).toBe('alert');
  });
});
