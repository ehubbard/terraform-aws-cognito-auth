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

import { AuthenticationClient } from "clients/authentication"
import { ManagementClient } from "clients/management"

import { chance, request } from "_/helpers"
import {
  mockRegisterRequest
} from "_/mocks/common/events/register"

/* ----------------------------------------------------------------------------
 * Tests
 * ------------------------------------------------------------------------- */

/* Authentication check */
describe("POST /check", () => {

  /* Authentication and management client */
  const auth = new AuthenticationClient()
  const mgmt = new ManagementClient()

  /* Test: should return error for missing authentication header */
  it("should return error for missing authentication header", () => {
    return request.get("/check")
      .expect(401)
  })

  /* Test: should return error for invalid authentication header */
  it("should return error for invalid authentication header", () => {
    return request.get("/check")
      .set("Authorization", chance.string())
      .expect(401)
  })

  /* with authenticated user */
  describe("with authenticated user", () => {

    /* Registration request */
    const { email, password } = mockRegisterRequest()

    /* Create and verify user */
    beforeAll(async () => {
      const { subject } = await auth.register(email, password)
      await mgmt.verifyUser(subject)
    })

    /* Delete user */
    afterAll(async () => {
      await mgmt.deleteUser(email)
    })

    /* Test: should return empty body for valid access token */
    it("should return empty body for valid access token", async () => {
      const { body } =  await request.post("/authenticate")
        .set("Content-Type", "application/json")
        .send({ username: email, password })
      return request.get("/check")
        .set("Authorization", `Bearer ${body.access.token}`)
        .expect(200, "")
    })

    /* Test: should return appropriate cache-control header */
    it("should return appropriate cache-control header", async () => {
      const { body } =  await request.post("/authenticate")
        .set("Content-Type", "application/json")
        .send({ username: email, password })
      const { header } = await request.get("/check")
        .set("Authorization", `Bearer ${body.access.token}`)
        .expect(200, "")
      expect(header["cache-control"])
        .toEqual("public, max-age=0, must-revalidate")
    })
  })
})
