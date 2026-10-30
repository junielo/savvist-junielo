import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WishlistListItemModel } from '../models/wishlist-list-item';

export interface WishlistDto {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  priority: string;
  status: string;
  purchasedAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateWishlistDto {
  name: string;
  amount: number;
  priority?: string;
  type?: string;
}

export interface UpdateWishlistDto {
  name?: string;
  amount?: number;
  priority?: string;
  type?: string;
  status?: string;
}

const mapPriorityToType = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'asap':
      return 'ASAP';
    case 'priority':
      return 'Priority';
    case 'important':
      return 'Important';
    case 'peripheral':
      return 'Peripheral';
    case 'normal':
    default:
      return 'Normal';
  }
};

const mapTypeToPriority = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'asap':
      return 'asap';
    case 'priority':
      return 'priority';
    case 'important':
      return 'important';
    case 'peripheral':
      return 'peripheral';
    case 'normal':
    default:
      return 'normal';
  }
};

export const toWishlistModel = (
  dto: WishlistDto,
): WishlistListItemModel & {
  priority: string;
  status: string;
  purchasedAt?: string | Date | null;
} => ({
  id: dto._id,
  userId: dto.userId,
  name: dto.name,
  amount: dto.amount,
  type: mapPriorityToType(dto.priority),
  isCompleted: dto.status === 'purchased',
  priority: dto.priority,
  status: dto.status,
  purchasedAt: dto.purchasedAt,
});

@Service()
export class WishlistService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<WishlistListItemModel[]>(() => '/api/wishlist', {
    defaultValue: [],
    parse: (raw) => (raw as WishlistDto[]).map(toWishlistModel),
  });

  readonly wishlist = this.resource.value;
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }

  async findAll(): Promise<WishlistListItemModel[]> {
    const raw = await firstValueFrom(this.http.get<WishlistDto[]>('/api/wishlist'));
    return raw.map(toWishlistModel);
  }

  async findOne(id: string): Promise<WishlistListItemModel> {
    const raw = await firstValueFrom(this.http.get<WishlistDto>(`/api/wishlist/${id}`));
    return toWishlistModel(raw);
  }

  async create(dto: CreateWishlistDto): Promise<WishlistListItemModel> {
    const body = {
      ...dto,
      priority: dto.priority
        ? mapTypeToPriority(dto.priority)
        : dto.type
          ? mapTypeToPriority(dto.type)
          : undefined,
    };
    const raw = await firstValueFrom(this.http.post<WishlistDto>('/api/wishlist', body));
    this.reload();
    return toWishlistModel(raw);
  }

  async update(id: string, dto: UpdateWishlistDto): Promise<WishlistListItemModel> {
    const body = {
      ...dto,
      priority: dto.priority
        ? mapTypeToPriority(dto.priority)
        : dto.type
          ? mapTypeToPriority(dto.type)
          : undefined,
    };
    const raw = await firstValueFrom(this.http.patch<WishlistDto>(`/api/wishlist/${id}`, body));
    this.reload();
    return toWishlistModel(raw);
  }

  async updateType(id: string, type: string): Promise<WishlistListItemModel> {
    const priority = mapTypeToPriority(type);
    const raw = await firstValueFrom(
      this.http.patch<WishlistDto>(`/api/wishlist/${id}/type`, { priority, type }),
    );
    this.reload();
    return toWishlistModel(raw);
  }

  async purchase(id: string): Promise<WishlistListItemModel> {
    const raw = await firstValueFrom(this.http.post<WishlistDto>(`/api/wishlist/${id}/purchase`, {}));
    this.reload();
    return toWishlistModel(raw);
  }

  async undoPurchase(id: string): Promise<WishlistListItemModel> {
    const raw = await firstValueFrom(
      this.http.post<WishlistDto>(`/api/wishlist/${id}/undo-purchase`, {}),
    );
    this.reload();
    return toWishlistModel(raw);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/wishlist/${id}`));
    this.reload();
  }

  // Aliases for convenience
  async createWishlist(dto: CreateWishlistDto): Promise<WishlistListItemModel> {
    return this.create(dto);
  }

  async updateWishlist(id: string, dto: UpdateWishlistDto): Promise<WishlistListItemModel> {
    return this.update(id, dto);
  }

  async deleteWishlist(id: string): Promise<void> {
    return this.remove(id);
  }
}
