/*app/api/auth/register/route.ts
The endpoint:
- Validates registration input
- Checks for existing users
- Handles password hashing
- Creates new users in the tblUser table
- Creates a new account if the user isn't invited
- Links users to accounts through the AccountUser table
- Uses transactions to ensure data consistency

This path follows Next.js 13+ App Router conventions, where:
- api indicates it's an API route
- auth/register creates the /api/auth/register endpoint
- route.js is the required filename for API routes in Next.js 13+ (instead of the older pages/api style)

*/
// app/api/auth/register/route.ts
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

//const prisma = new PrismaClient();

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  inviteEmail?: string;
}

export async function POST(req: NextRequest) {
  try {
    let prisma: PrismaClient;

    if (!globalThis.prisma) {
      globalThis.prisma = new PrismaClient();
    }
    prisma = globalThis.prisma;

    const body: RegisterRequest = await req.json();
    const { email, password, firstName, lastName, inviteEmail } = body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.tblUser.findUnique({
      where: { email },
      // include: {
      //   tblAccountUser: true
      // }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check for valid invitation if inviteEmail is provided
      let invitation = null;
      if (inviteEmail) {
        invitation = await tx.tblInvitation.findFirst({
          where: {
            email: inviteEmail,
            status: 'pending',
            expires: {
              gt: new Date()
            }
          }
        });

        if (!invitation) {
          throw new Error('Invalid or expired invitation');
        }
      }

      // Create user
      const user = await tx.tblUser.create({
        data: {
          email,
          password: hashedPassword,
          fname: firstName,
          lname: lastName,

          // providing a default value if invitation.role is null
          access_level: invitation && invitation.role !== null ? invitation.role : 99, // Set access level based on invitation or default
        }
      });

      if (invitation) {
        // Link user to the invited account
        await tx.tblAccountUser.create({
          data: {
            account_id: invitation.account_id,
            user_id: user.id,
            access_level: invitation.role
          }
        });

        // Update invitation status
        await tx.tblInvitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted' }
        });
      } else {
        // Create new account for non-invited users
        const account = await tx.tblAccount.create({
          data: {
            name: `${firstName}'s Account`,
            subscription: 'free'
          }
        });

        // Link user to new account with admin rights
        await tx.tblAccountUser.create({
          data: {
            account_id: account.id,
            user_id: user.id,
            access_level: 1 // Admin rights
          }
        });
      }

      return user;
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        userId: result.id.toString()
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle specific errors
    if (error.message === 'Invalid or expired invitation') {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}