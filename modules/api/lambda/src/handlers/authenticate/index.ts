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

import * as cookie from "cookie"

import { AuthenticationClient } from "clients/authentication"
import { handler } from "handlers"

import {
  AuthenticateRequestWithCredentials,
  AuthenticateRequestWithToken
} from "common/events"
import schema = require("common/events/authenticate/index.json")
import { Session, SessionToken } from "common/session"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Authentication request (intersection type to omit complex type guards)
 */
type Request =
  & AuthenticateRequestWithCredentials
  & AuthenticateRequestWithToken

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Parse refresh token from cookie
 *
 * @param header - Cookie header
 *
 * @return Refresh token
 */
function parseCookie(value: string) {
  if (!(value && value.length))
    throw new TypeError("Invalid request")
  const { "__Secure-token": token } = cookie.parse(value)
  return token
}

/**
 * Serialize refresh token for set-cookie header
 *
 * The refresh token is sent back to the client in the body and as a cookie
 * header. While non-browser clients should obtain the refresh token from the
 * body, browser clients will handle the refresh token automatically as it is
 * set via a HTTP-only secure cookie that is not accessible from JavaScript.
 *
 * At no time or circumstance should a browser client store the refresh token
 * in local storage as this will introduce XSS vulnerabilities.
 *
 * @param token - Refresh token
 * @param path - Cookie path
 *
 * @return Serialized cookie
 */
function generateSetCookie(
  { token, expires }: SessionToken, path: string
) {
  return cookie.serialize("__Secure-token", token, {
    expires,
    domain: process.env.COGNITO_IDENTITY_DOMAIN!,
    path,
    secure: true,
    httpOnly: true,
    sameSite: true
  })
}

/* ----------------------------------------------------------------------------
 * Handler
 * ------------------------------------------------------------------------- */

/**
 * Authenticate using credentials or refresh token
 *
 * @param event - API Gateway event
 *
 * @return Promise resolving with session
 */
export const post = handler<{}, Request, Session>(schema,
  async ({ path, headers, body: { username, password, token } }) => {
    const auth = new AuthenticationClient()
    const session = await auth.authenticate(username || token ||
      parseCookie(headers.Cookie), password)
    return {
      body: session,
      ...(session.refresh
        ? {
          headers: {
            "Set-Cookie": generateSetCookie(session.refresh, path)
          }
        }
        : {})
    }
  })
