export type UserRole = 'owner' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  storeId: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface DbConfig {
  host: string;
  port: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  dbConfig?: DbConfig;
}

export interface AddStoreCredentials {
  email: string;
  password: string;
  dbConfig: DbConfig;
}

export interface StoreRef {
  store_id: string;
  name: string;
  role: UserRole;
}

export interface BackendLoginResponse {
  status: string;
  user_id: string;
  email: string | null;
  stores: StoreRef[];
}

export interface AuthResult {
  userId: string;
  email: string;
  username: string;
  stores: StoreRef[];
}
