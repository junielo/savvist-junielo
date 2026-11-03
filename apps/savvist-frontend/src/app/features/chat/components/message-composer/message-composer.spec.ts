import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageComposer } from './message-composer';

describe('MessageComposer', () => {
  let component: MessageComposer;
  let fixture: ComponentFixture<MessageComposer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageComposer],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageComposer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable send button when text is empty or whitespace', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const sendBtn = fixture.nativeElement.querySelector('button.send-btn') as HTMLButtonElement;

    expect(sendBtn.disabled).toBe(true);

    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(sendBtn.disabled).toBe(true);
  });

  it('should enable send button when valid text is entered and emit send on click', () => {
    const spy = vi.fn();
    component.send.subscribe(spy);

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Hello world';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const sendBtn = fixture.nativeElement.querySelector('button.send-btn') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(false);

    sendBtn.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith('Hello world');
    expect(textarea.value).toBe('');
  });

  it('should send on Enter without Shift', () => {
    const spy = vi.fn();
    component.send.subscribe(spy);

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Test enter';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const keyboardEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
    textarea.dispatchEvent(keyboardEvent);

    expect(spy).toHaveBeenCalledWith('Test enter');
  });

  it('should not send on Shift+Enter', () => {
    const spy = vi.fn();
    component.send.subscribe(spy);

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Test shift enter';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const keyboardEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    textarea.dispatchEvent(keyboardEvent);

    expect(spy).not.toHaveBeenCalled();
  });
});
