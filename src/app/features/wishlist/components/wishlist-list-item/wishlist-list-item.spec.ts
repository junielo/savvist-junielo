import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WishlistListItem } from './wishlist-list-item';

describe('WishlistListItem', () => {
  let component: WishlistListItem;
  let fixture: ComponentFixture<WishlistListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WishlistListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(WishlistListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
