import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageBubble } from './message-bubble';
import { ChatMessage } from '../../models/chat-message';

describe('MessageBubble', () => {
  let component: MessageBubble;
  let fixture: ComponentFixture<MessageBubble>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageBubble],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageBubble);
    component = fixture.componentInstance;
  });

  it('should create and render user message', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello assistant',
      status: 'complete',
    };
    fixture.componentRef.setInput('message', msg);
    fixture.detectChanges();

    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message-wrapper')?.classList.contains('user')).toBe(true);
    expect(compiled.textContent).toContain('Hello assistant');
  });

  it('should render error state and emit retry', () => {
    const msg: ChatMessage = {
      id: '2',
      role: 'assistant',
      content: 'Error response',
      status: 'error',
    };
    fixture.componentRef.setInput('message', msg);
    fixture.detectChanges();

    const spy = vi.fn();
    component.retry.subscribe(spy);

    const btn = fixture.nativeElement.querySelector('.retry-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    expect(spy).toHaveBeenCalledWith('2');
  });
});
