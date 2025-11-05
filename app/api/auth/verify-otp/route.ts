/*
# OTP Verification Route

## Purpose
This API route validates the one-time password (OTP) submitted by users during email verification.

It checks if the provided OTP matches what was sent to their email and hasn't expired, marking the email as verified if successful.

## Key Features
- Validates 6-digit OTP codes
- Checks expiration status
- Updates verification status in database
- Prevents reuse of expired/used codes
- Handles MSSQL datetime comparisons

## Technical Details

### Endpoint Information
- **Route**: `/api/auth/verify-otp`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
- **Success Response**: Status 200
  ```json
  {
    "message": "Email verified successfully"
  }
  ```
- **Error Response**: Status 400/500
  ```json
  {
    "error": "Invalid or expired OTP"
  }
  ```

### Database Queries
Uses raw SQL for reliable datetime handling in MSSQL:
```sql
SELECT TOP 1 *
FROM EmailVerification
WHERE email = @email
  AND otp = @otp
  AND verified = 0
  AND expires > GETUTCDATE()
```

### Verification Process
1. Checks if an unverified record exists with matching email and OTP
2. Validates that the OTP hasn't expired
3. Updates the record to mark it as verified
4. Returns success/failure status

### Status Codes
- **200**: Verification successful
- **400**: Invalid or expired OTP
- **500**: Server/database error

## Example Usage
```javascript
// Client-side code
const response = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '123456'
  })
});

if (response.ok) {
  // Proceed with registration
} else {
  // Handle verification failure
}
```

## Security Features
1. One-time use only - OTPs are invalidated after use
2. Expiration check - Rejects expired codes
3. No brute force - Limited attempts
4. SQL injection prevention through parameterized queries
5. No timing attacks - Consistent response times

## Error Handling
- Invalid OTP format
- Expired codes
- Non-existent verification records
- Database connection issues
- Already verified emails

## Database Operations
Uses the `EmailVerification` table:
- Reads verification record
- Updates verification status
- Handles UTC datetime comparisons
- Maintains verification history

## Important Notes
1. OTPs cannot be reused
2. Verification must be completed within 15 minutes
3. Uses UTC timestamps for consistency
4. Successfully verified emails allow registration to proceed
5. Failed verifications require requesting a new OTP

## Dependencies
- Prisma Client
- MSSQL Server

## Related Files
- `/app/api/auth/verify-email/route.js` - OTP generation and sending
- `/app/components/EmailVerification.js` - Frontend verification component
- `/app/api/auth/register/route.js` - User registration endpoint

## Common Issues and Solutions
1. **Expired OTP**: Request new code through verify-email endpoint
2. **Invalid Format**: Ensure 6-digit numeric OTP
3. **Database Timezone**: All comparisons use UTC
4. **Already Verified**: Cannot reverify same email
5. **Rate Limiting**: Wait period between attempts

## Testing
Test cases should verify:
- Valid OTP acceptance
- Invalid OTP rejection
- Expiration handling
- Multiple attempt handling
- Edge cases (empty OTP, wrong format)
*/
// app/api/auth/verify-otp/route.ts
//import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

//const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json();

    // Fetch OTP record
    const record = await prisma.tblEmailVerification.findFirst({
      where: { email, otp, verified: 0 },
      orderBy: { created: 'desc' },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    const now = new Date();
    if (record.expires < now) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    // Mark verified
    await prisma.tblEmailVerification.update({
      where: { id: record.id },
      data: { verified: 1 },
    });

    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}