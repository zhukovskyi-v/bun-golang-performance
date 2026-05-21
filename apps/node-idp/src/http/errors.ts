export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidCredentials extends DomainError {
  constructor() {
    super('invalid_credentials', 401, 'invalid credentials');
  }
}

export class UserExists extends DomainError {
  constructor() {
    super('user_exists', 409, 'user already exists');
  }
}

export class InvalidToken extends DomainError {
  constructor() {
    super('invalid_token', 401, 'invalid token');
  }
}
