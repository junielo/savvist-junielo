import { computed, Service } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { UserModel } from '../models/user';

// Shape returned by the API (DATABASE.md 4.1)
// Shape returned by the API (DATABASE.md 4.1)
interface UserDto extends Omit<UserModel, 'id'> {
  _id: string;
}

const toUser = ({ _id, ...rest }: UserDto): UserModel => ({ ...rest, id: _id });

@Service()
export class UserService {
  private readonly resource = httpResource<UserModel>(() => '/api/user', {
    parse: (raw) => toUser(raw as UserDto),
  });

  readonly user = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }
}
