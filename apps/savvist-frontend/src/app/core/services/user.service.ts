import { computed, inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { UserModel } from '../models/user';
import { firstValueFrom } from 'rxjs';

interface UserDto extends Omit<UserModel, 'id'> {
  _id: string;
}

const toUser = ({ _id, ...rest }: UserDto): UserModel => ({ ...rest, id: _id });

@Service()
export class UserService {
  private readonly http = inject(HttpClient);
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

  async updateUser(dto: {
    displayName?: string;
    baseSalary?: number;
    salaryDay1?: number;
    salaryDay2?: number;
    isUnemployed?: boolean;
  }): Promise<UserModel> {
    const raw = await firstValueFrom(
      this.http.patch<UserDto>('/api/user', dto),
    );
    this.reload();
    return toUser(raw);
  }
}