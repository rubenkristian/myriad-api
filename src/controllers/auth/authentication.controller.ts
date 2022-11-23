import {inject, intercept, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  HttpErrors,
  response,
} from '@loopback/rest';
import {
  Credential,
  RequestCreateNewUserByEmail,
  RequestCreateNewUserByWallet,
  RequestOTPByEmail,
  User,
  RequestLoginByOTP,
} from '../../models';
import {UserProfile, securityId} from '@loopback/security';
import {RefreshGrant, TokenObject} from '../../interfaces';
import {RefreshTokenServiceBindings, TokenServiceBindings} from '../../keys';
import {
  NetworkRepository,
  RequestCreateNewUserByEmailRepository,
  UserRepository,
  WalletRepository,
} from '../../repositories';
import {AuthenticationInterceptor} from '../../interceptors';
import {pick} from 'lodash';
import {RefreshtokenService, JWTService, UserOTPService} from '../../services';
import validator from 'validator';

export class AuthenticationController {
  constructor(
    @repository(RequestCreateNewUserByEmailRepository)
    protected requestCreateNewUserByEmailRepository: RequestCreateNewUserByEmailRepository,
    @repository(UserRepository)
    protected userRepository: UserRepository,
    @repository(NetworkRepository)
    protected networkRepository: NetworkRepository,
    @repository(WalletRepository)
    protected walletRepository: WalletRepository,
    @service(UserOTPService)
    protected userOTPService: UserOTPService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    protected jwtService: JWTService,
    @inject(RefreshTokenServiceBindings.REFRESH_TOKEN_SERVICE)
    protected refreshService: RefreshtokenService,
  ) {}

  @get('/wallets/{id}/nonce', {
    responses: {
      '200': {
        description: 'User nonce',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                nonce: {
                  type: 'number',
                },
              },
            },
          },
        },
      },
    },
  })
  async getNonceByWallet(
    @param.path.string('id') id: string,
  ): Promise<{nonce: number}> {
    const result = {nonce: 0};

    try {
      const user = await this.walletRepository.user(id);
      result.nonce = user.nonce;
    } catch {
      // ignore
    }

    return result;
  }

  @get('/users/{id}/nonce', {
    responses: {
      '200': {
        description: 'User nonce',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                nonce: {
                  type: 'number',
                },
              },
            },
          },
        },
      },
    },
  })
  async getNonceByUser(
    @param.path.string('id') id: string,
    @param.query.string('platform') platform?: string,
  ): Promise<{nonce: number}> {
    if (!platform) {
      const {nonce} = await this.userRepository.findById(id);
      return {nonce};
    }

    const networks = await this.networkRepository.find({
      where: {blockchainPlatform: platform},
    });
    const networkIds = networks.map(network => network.id);
    const wallet = await this.walletRepository.findOne({
      where: {networkId: {inq: networkIds}, userId: id},
    });

    if (!wallet) return {nonce: 0};

    const {nonce} = await this.userRepository.findById(id);
    return {nonce};
  }

  @post('/otp/email')
  @response(200, {
    description: 'Request OTP by Email Response',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async requestOTPByEmail(
    @requestBody({
      description: 'The input of request OTP by Email',
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(RequestOTPByEmail),
        },
      },
    })
    requestOTP: RequestOTPByEmail,
  ): Promise<{message: string}> {
    if (!validator.isEmail(requestOTP.email)) {
      throw new HttpErrors.UnprocessableEntity('Invalid Email Address');
    }

    await this.userOTPService.requestByEmail(
      requestOTP.email,
      requestOTP.callbackURL,
    );

    return {
      message: `OTP sent to ${requestOTP.email}`,
    };
  }

  @intercept(AuthenticationInterceptor.BINDING_KEY)
  @post('/signup')
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, {includeRelations: false}),
      },
    },
  })
  async signup(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(RequestCreateNewUserByWallet, {
            title: 'CreateNewUserByWallet',
          }),
        },
      },
    })
    requestCreateNewUserByWallet: RequestCreateNewUserByWallet,
  ): Promise<User> {
    const user = pick(requestCreateNewUserByWallet, [
      'id',
      'name',
      'username',
      'permissions',
      'fullAccess',
    ]);
    return this.userRepository.create(user);
  }

  @intercept(AuthenticationInterceptor.BINDING_KEY)
  @post('/signup/email')
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, {includeRelations: false}),
      },
    },
  })
  async signupByEmail(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(RequestCreateNewUserByEmail, {
            title: 'CreateNewUserByEmailUser',
          }),
        },
      },
    })
    requestCreateNewUserByEmail: RequestCreateNewUserByEmail,
  ): Promise<User> {
    const {email, callbackURL} = requestCreateNewUserByEmail;
    const user = pick(requestCreateNewUserByEmail, [
      'id',
      'name',
      'username',
      'email',
    ]);
    const currentUser: UserProfile = {
      [securityId]: user.id.toString(),
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
    };
    const {token} = await this.userOTPService.requestByEmail(
      email,
      callbackURL,
      currentUser,
    );
    const key = `sign-up/${token}`;
    await this.requestCreateNewUserByEmailRepository.set(key, user);
    await this.requestCreateNewUserByEmailRepository.expire(
      key,
      30 * 60 * 1000,
    );
    return new User(currentUser);
  }

  @intercept(AuthenticationInterceptor.BINDING_KEY)
  @post('/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                },
                refreshToken: {
                  type: 'string',
                },
                expiresId: {
                  type: 'string',
                },
                tokenType: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody({
      description: 'The input of login function',
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(Credential, {exclude: ['data']}),
        },
      },
    })
    credential: Credential,
  ): Promise<TokenObject> {
    const accessToken = await this.jwtService.generateToken(
      credential.data as UserProfile,
    );

    return {accessToken};
  }

  @intercept(AuthenticationInterceptor.BINDING_KEY)
  @post('/login/otp', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                },
                refreshToken: {
                  type: 'string',
                },
                expiresId: {
                  type: 'string',
                },
                tokenType: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async loginByOTP(
    @requestBody({
      description: 'The input of login function',
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(RequestLoginByOTP, {exclude: ['data']}),
        },
      },
    })
    requestLoginByOTP: RequestLoginByOTP,
  ): Promise<TokenObject> {
    const accessToken = await this.jwtService.generateToken(
      requestLoginByOTP.data as UserProfile,
    );

    return {accessToken};
  }

  @post('/refresh', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async refresh(
    @requestBody({
      description: 'Reissuing Acess Token',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['refreshToken'],
            properties: {
              refreshToken: {
                type: 'string',
              },
            },
          },
        },
      },
    })
    refreshGrant: RefreshGrant,
  ): Promise<TokenObject> {
    return this.refreshService.refreshToken(refreshGrant.refreshToken);
  }
}