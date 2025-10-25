import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../database';
import { ValidationError, UnauthorizedError, ConflictError, ForbiddenError } from '../../errors';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  secret: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const REGISTRATION_SECRET = process.env.REGISTRATION_SECRET || 'valid-secret';

export async function authenticateUser(username: string, password: string): Promise<LoginResponse> {
  // Find user by username
  const user = await db
    .selectFrom('users')
    .select(['id', 'username', 'email', 'password_hash', 'is_admin'])
    .where('username', '=', username)
    .executeTakeFirst();

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: '120d' }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
    },
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function registerUser(userData: RegisterRequest): Promise<RegisterResponse> {
  const { username, password, email, secret } = userData;

  // Validate required fields
  if (!username || !password || !email || !secret) {
    throw new ValidationError('Username, password, email, and secret are required');
  }

  // Validate secret
  if (secret !== REGISTRATION_SECRET) {
    throw new ForbiddenError('Invalid registration secret');
  }

  // Validate email format
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate password strength
  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters long');
  }


  // Check if username already exists
  const existingUserByUsername = await db
    .selectFrom('users')
    .select('id')
    .where('username', '=', username)
    .executeTakeFirst();

  if (existingUserByUsername) {
    throw new ConflictError('Username already exists');
  }

  // Check if email already exists
  const existingUserByEmail = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();

  if (existingUserByEmail) {
    throw new ConflictError('Email already exists');
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  await db
    .insertInto('users')
    .values({
      username,
      email,
      password_hash: passwordHash,
      is_admin: false,
    })
    .execute();

  return {
    success: true,
    message: 'User created successfully',
  };
}