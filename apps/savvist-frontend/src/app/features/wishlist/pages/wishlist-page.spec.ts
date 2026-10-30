import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { WishlistPage } from './wishlist-page';
import { WishlistService } from '../services/wishlist.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { vi } from 'vitest';

describe('WishlistPage', () => {
  let component: WishlistPage;
  let fixture: ComponentFixture<WishlistPage>;
  let mockWishlistService: {
    wishlist: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
    purchase: ReturnType<typeof vi.fn>;
    undoPurchase: ReturnType<typeof vi.fn>;
    updateType: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockMatDialog: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockWishlistService = {
      wishlist: signal([]),
      isLoading: signal(false),
      purchase: vi.fn().mockResolvedValue(undefined),
      undoPurchase: vi.fn().mockResolvedValue(undefined),
      updateType: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockMatDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [WishlistPage],
      providers: [
        { provide: WishlistService, useValue: mockWishlistService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WishlistPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should purchase item', async () => {
    await component['purchase']('1');
    expect(mockWishlistService.purchase).toHaveBeenCalledWith('1');
  });

  it('should undo purchase item', async () => {
    await component['undoPurchase']('1');
    expect(mockWishlistService.undoPurchase).toHaveBeenCalledWith('1');
  });

  it('should update item type', async () => {
    await component['updateType']('1', 'ASAP');
    expect(mockWishlistService.updateType).toHaveBeenCalledWith('1', 'ASAP');
  });

  it('should delete wishlist item when confirmed', async () => {
    await component['deleteWishlist']('1');
    expect(mockMatDialog.open).toHaveBeenCalled();
    expect(mockWishlistService.remove).toHaveBeenCalledWith('1');
  });
});
