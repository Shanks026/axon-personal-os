const BY_CODE = {
  invalid_credentials: 'That password doesn’t match this email.',
  email_not_confirmed: 'Confirm your email first. Check your inbox for the link.',
  user_already_exists: 'An account with this email already exists. Sign in instead.',
  email_exists: 'An account with this email already exists. Sign in instead.',
  weak_password: 'Choose a stronger password.',
  same_password: 'Your new password must be different from the old one.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  signup_disabled: 'New sign-ups are turned off.',
}

/** Friendly copy for a Supabase auth error (by error code, then by message). */
export function mapAuthError(error) {
  if (!error) return ''
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  const msg = String(error.message ?? '')
  if (/invalid login credentials/i.test(msg)) return BY_CODE.invalid_credentials
  if (/email not confirmed/i.test(msg)) return BY_CODE.email_not_confirmed
  if (/already registered/i.test(msg)) return BY_CODE.user_already_exists
  if (/failed to fetch|network/i.test(msg)) return 'Can’t reach the server. Check your connection.'
  return msg || 'Something went wrong. Try again.'
}
