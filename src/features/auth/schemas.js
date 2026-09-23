import { z } from 'zod'

export const PASSWORD_MIN = 10

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))
const password = z.string().min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters`).max(72)

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

const confirmMatches = (v) => v.password === v.confirm
const mismatch = { path: ['confirm'], message: 'Passwords don’t match.' }

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name').max(120),
    email,
    password,
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine(confirmMatches, mismatch)

export const emailSchema = z.object({ email })

export const newPasswordSchema = z
  .object({ password, confirm: z.string().min(1, 'Confirm your password') })
  .refine(confirmMatches, mismatch)
