export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    gold: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}
