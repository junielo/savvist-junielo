export interface UserModel {
  id: string;
  displayName: string;
  baseSalary: number;
  salaryDay1?: number;
  salaryDay2?: number;
  isUnemployed: boolean;
  currency: string;
  locale: string;
  timeZone: string;
}