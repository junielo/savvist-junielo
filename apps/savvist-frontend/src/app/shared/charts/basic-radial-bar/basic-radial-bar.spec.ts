import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BasicRadialBar } from './basic-radial-bar';

describe('BasicRadialBar', () => {
  let component: BasicRadialBar;
  let fixture: ComponentFixture<BasicRadialBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicRadialBar],
    }).compileComponents();

    fixture = TestBed.createComponent(BasicRadialBar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 50);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
