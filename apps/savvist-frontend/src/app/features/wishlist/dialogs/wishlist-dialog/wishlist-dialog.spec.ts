import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WishlistDialog } from './wishlist-dialog';

describe('WishlistDialog', () => {
  let component: WishlistDialog;
  let fixture: ComponentFixture<WishlistDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WishlistDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(WishlistDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
