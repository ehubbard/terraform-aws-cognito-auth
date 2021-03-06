/*
 * Copyright (c) 2018 Martin Donath <martin.donath@squidfunk.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { AWSError, CognitoIdentityServiceProvider } from "aws-sdk"
import * as uuid from "uuid/v4"

import { Client } from "clients"
import {
  Verification,
  VerificationCode
} from "verification"

import { Session } from "common/session"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Create a date for a specific time in the future
 *
 * @param seconds - Validity in seconds
 *
 * @return Expiry date
 */
export function expires(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000)
}

/**
 * Translate/map error code and message for some errors
 *
 * @param err - Error
 *
 * @return Mapped error
 */
export function translate(err: AWSError): AWSError {
  switch (err.code) {

    /* Empty username and password */
    case "InvalidParameterException":
      err.code    = "TypeError"
      err.message = "Invalid request"
      return err

    /* Obfuscate non-existent user error for authentication */
    case "UserNotFoundException":
      err.code    = "NotAuthorizedException"
      err.message = "Incorrect username or password"
      return err

    /* Pass-through all other errors */
    default:
      return err
  }
}

/* ----------------------------------------------------------------------------
 * Class
 * ------------------------------------------------------------------------- */

/**
 * Authentication client
 */
export class AuthenticationClient extends Client {

  /**
   * Initialize verification and identity provider
   *
   * @param verification - Verification provider
   * @param cognito - Cognito client
   */
  public constructor(
    protected verification = new Verification(),
    cognito = new CognitoIdentityServiceProvider({
      apiVersion: "2016-04-18"
    })
  ) {
    super(cognito)
  }

  /**
   * Register user with email address and password
   *
   * @param email - Email address
   * @param password Password
   *
   * @return Promise resolving with verification code
   */
  public async register(
    email: string, password: string
  ): Promise<VerificationCode> {
    const username = uuid()

    /* Register user with Cognito */
    await this.cognito.signUp({
      ClientId: process.env.COGNITO_USER_POOL_CLIENT!,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: "email",
          Value: email
        }
      ]
    }).promise()

    /* Issue and return verification code */
    return this.verification.issue("register", username)
  }

  /**
   * Authenticate using credentials or refresh token
   *
   * Both authentication flows will return an identity token (and not access
   * token) because we're currently not defining any OAuth scopes and API
   * Gateway demands OAuth scopes in order to accept an access token. For now,
   * the identity token is automatically  checked against the user pool.
   *
   * For more information, see https://amzn.to/2tcKVR2. Also, feel free to PR.
   *
   * @param usernameOrToken - Username, email address or refresh token
   * @param password - Password if username is supplied
   *
   * @return Promise resolving with session
   */
  public authenticate(
    usernameOrToken: string, password?: string
  ): Promise<Session> {
    return password
      ? this.authenticateWithCredentials(usernameOrToken, password)
      : this.authenticateWithToken(usernameOrToken)
  }

  /**
   * Trigger authentication flow for password reset
   *
   * @param username - Username or email address
   *
   * @return Promise resolving with verification code
   */
  public async forgotPassword(username: string): Promise<VerificationCode> {
    const { Username: id } = await this.cognito.adminGetUser({
      UserPoolId: process.env.COGNITO_USER_POOL!,
      Username: username
    }).promise()

    /* Issue and return verification code */
    return this.verification.issue("reset", id)
  }

  /**
   * Authenticate using username or email and password
   *
   * @param username - Username or email address
   * @param password - Password
   *
   * @return Promise resolving with session
   */
  protected async authenticateWithCredentials(
    username: string, password: string
  ): Promise<Session> {
    try {
      const { AuthenticationResult, ChallengeName } =
        await this.cognito.initiateAuth({
          ClientId: process.env.COGNITO_USER_POOL_CLIENT!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password
          }
        }).promise()

      /* Return session if authenticated */
      if (!AuthenticationResult)
        throw new Error(`Invalid authentication: challenge "${ChallengeName}"`)
      return {
        access: {
          token: AuthenticationResult.IdToken!,
          expires: expires(60 * 60) /* 1 hour */
        },
        refresh: {
          token: AuthenticationResult.RefreshToken!,
          expires: expires(60 * 60 * 24 * 30) /* 30 days */
        }
      }

    /* Obfuscate errors */
    } catch (err) {
      throw translate(err)
    }
  }

  /**
   * Re-authenticate using refresh token
   *
   * @param token - Refresh token
   *
   * @return Promise resolving with session
   */
  protected async authenticateWithToken(
    token: string
  ): Promise<Session> {
    try {
      const { AuthenticationResult, ChallengeName } =
        await this.cognito.initiateAuth({
          ClientId: process.env.COGNITO_USER_POOL_CLIENT!,
          AuthFlow: "REFRESH_TOKEN",
          AuthParameters: {
            REFRESH_TOKEN: token
          }
        }).promise()

      /* Return renewed session if authenticated */
      if (!AuthenticationResult)
        throw new Error(`Invalid authentication: challenge "${ChallengeName}"`)
      return {
        access: {
          token: AuthenticationResult.IdToken!,
          expires: expires(60 * 60) /* 1 hour */
        }
      }

    /* Obfuscate errors */
    } catch (err) {
      throw translate(err)
    }
  }
}
