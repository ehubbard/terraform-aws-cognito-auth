# Copyright (c) 2018 Martin Donath <martin.donath@squidfunk.com>

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to
# deal in the Software without restriction, including without limitation the
# rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
# sell copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE.

# -----------------------------------------------------------------------------
# Outputs: Cognito
# -----------------------------------------------------------------------------

# output.cognito_user_pool
output "cognito_user_pool" {
  value = "${aws_cognito_user_pool._.id}"
}

# output.cognito_user_pool_arn
output "cognito_user_pool_arn" {
  value = "${aws_cognito_user_pool._.arn}"
}

# output.cognito_user_pool_client
output "cognito_user_pool_client" {
  value = "${aws_cognito_user_pool_client._.id}"
}

# output.cognito_identity_pool
output "cognito_identity_pool" {
  value = "${aws_cognito_identity_pool._.id}"
}
