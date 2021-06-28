import {TokenService, UserService} from '@loopback/authentication';
import {BindingKey} from '@loopback/core';
import {Authentication} from './models';
import {Credentials} from './repositories/authentication.repository';
import {PasswordHasher} from './services/hash.password.service';
import dotenv from 'dotenv'

dotenv.config()

export namespace TokenServiceConstants {
  export const TOKEN_SECRET_VALUE = process.env.TOKEN_SECRET_KEY || "";
  export const TOKEN_EXPIRES_IN_VALUE = `${process.env.TOKEN_EXPIRES_IN}h` || "0h";
}
export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>(
    'authentication.jwt.secret',
  );
  export const TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.expiresIn',
  );
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.jwt.service',
  );
}

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>(
    'services.hasher',
  );
  export const ROUNDS = BindingKey.create<number>('services.hasher.rounds');
}

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<Credentials, Authentication>>(
    'services.user.service',
  );
}