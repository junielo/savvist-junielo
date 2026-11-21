export interface WishlistListItemModel {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  amount: number;
  type: string;
  isCompleted: boolean;
  priority?: string;
  status?: string;
  purchasedAt?: string | Date | null;
}
