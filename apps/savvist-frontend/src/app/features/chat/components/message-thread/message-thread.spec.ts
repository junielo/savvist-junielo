import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageThread } from './message-thread';
import { ChatMessage } from '../../models/chat-message';

describe('MessageThread', () => {
  let component: MessageThread;
  let fixture: ComponentFixture<MessageThread>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageThread],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageThread);
    component = fixture.componentInstance;
  });

  it('should create and render empty state when no messages', () => {
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Start a conversation');
  });

  it('should render messages list', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Hi', status: 'complete' },
      { id: '2', role: 'assistant', content: 'Hello!', status: 'complete' },
    ];
    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Hi');
    expect(compiled.textContent).toContain('Hello!');
  });
});
