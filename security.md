# security.md — Security Considerations & Best Practices

This document defines the **comprehensive security strategy** for the platform, including authentication, authorization, data protection, API security, and compliance considerations.

---

## 1. Security Principles

* **Defense in depth** - Multiple layers of security
* **Least privilege** - Users and services have minimum required permissions
* **Fail securely** - Default to deny, not allow
* **Never trust user input** - Validate and sanitize all inputs
* **Encrypt sensitive data** - At rest and in transit
* **Audit everything** - Log security-relevant events
* **Keep dependencies updated** - Regular security patches

---

## 2. Authentication

### 2.1 Password Security

**Requirements:**
* Minimum 8 characters (recommend 12+)
* Require uppercase, lowercase, number, special character
* Use bcrypt or Argon2 for hashing
* Salt rounds: 10+ (bcrypt) or cost factor: 2 (Argon2)

**Implementation:**
```typescript
import * as bcrypt from 'bcrypt';

const saltRounds = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Password Reset:**
* Use time-limited tokens (expire in 1 hour)
* One-time use tokens
* Send reset links via email only
* Rate limit reset requests (max 3 per hour per email)

---

### 2.2 JWT Token Security

**Token Configuration:**
```typescript
const jwtConfig = {
  accessToken: {
    expiresIn: '15m', // Short-lived
    secret: process.env.JWT_SECRET
  },
  refreshToken: {
    expiresIn: '30d', // Long-lived
    secret: process.env.JWT_REFRESH_SECRET,
    httpOnly: true, // Not accessible via JavaScript
    secure: true, // HTTPS only
    sameSite: 'strict' // CSRF protection
  }
};
```

**Token Storage:**
* Access tokens: Memory only (not localStorage)
* Refresh tokens: HttpOnly cookies (not accessible to JavaScript)

**Token Rotation:**
* Rotate refresh tokens on use
* Invalidate old refresh tokens
* Track token family to detect token theft

---

### 2.3 Session Management

**Session Configuration:**
```typescript
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};
```

**Session Security:**
* Regenerate session ID on login
* Invalidate sessions on logout
* Track active sessions per user
* Allow users to revoke sessions

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

**Roles:**
* `USER` - Regular user
* `ADMIN` - Admin user
* `SUPER_ADMIN` - Super admin (optional)

**Implementation:**
```typescript
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('/admin/users')
getUsers() {
  // Only admins can access
}
```

---

### 3.2 Subscription Tier Restrictions

**Tier-Based Access:**
```typescript
@RequireSubscription('PRO')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Get('/api/signals')
getSignals() {
  // Only PRO and PREMIUM users
}
```

**Feature Gating:**
```typescript
function checkSubscriptionAccess(
  user: User,
  requiredTier: SubscriptionLevel
): boolean {
  const tierHierarchy = {
    FREE: 0,
    BASIC: 1,
    PRO: 2,
    PREMIUM: 3
  };

  return tierHierarchy[user.subscriptionLevel] >= tierHierarchy[requiredTier];
}
```

---

## 4. Input Validation

### 4.1 DTO Validation

**NestJS DTOs with class-validator:**
```typescript
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;
}
```

**Validation Pipes:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true, // Transform to DTO instance
    transformOptions: {
      enableImplicitConversion: true
    }
  })
);
```

---

### 4.2 SQL Injection Prevention

**Prisma Protection:**
* Prisma uses parameterized queries (prevents SQL injection)
* Never use raw SQL with user input
* If using `$queryRaw`, use Prisma.sql template

**Safe:**
```typescript
await prisma.user.findUnique({
  where: { email: userInput } // Prisma handles escaping
});
```

**Unsafe (Don't do this):**
```typescript
await prisma.$queryRawUnsafe(
  `SELECT * FROM User WHERE email = '${userInput}'` // SQL injection risk!
);
```

---

### 4.3 XSS Prevention

**Frontend:**
* Use React's built-in XSS protection
* Sanitize user-generated content
* Use Content Security Policy (CSP)

**CSP Headers:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

**Sanitization:**
```typescript
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput);
```

---

## 5. API Security

### 5.1 Rate Limiting

**Implementation:**
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/auth/', authLimiter);
```

**Per-User Rate Limiting:**
```typescript
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip
});
```

---

### 5.2 CORS Configuration

**Strict CORS:**
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL, // Specific origin only
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

**Never use:**
```typescript
app.enableCors({ origin: '*' }); // Allows all origins - security risk!
```

---

### 5.3 HTTPS Enforcement

**Production:**
```typescript
// Force HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

**HSTS Headers:**
```typescript
app.use((req, res, next) => {
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
```

---

## 6. Data Protection

### 6.1 Encryption at Rest

**Database:**
* Use encrypted database volumes
* Enable PostgreSQL encryption
* Use managed database services with encryption

**File Storage:**
* Encrypt files in S3
* Use S3 server-side encryption (SSE)
* Encrypt sensitive files before upload

---

### 6.2 Encryption in Transit

**TLS/SSL:**
* Use TLS 1.2+ (prefer 1.3)
* Valid SSL certificates
* Regular certificate renewal
* HSTS headers

**Database Connections:**
* Use SSL for database connections
* Verify SSL certificates

---

### 6.3 Sensitive Data Handling

**Never Log:**
* Passwords (even hashed)
* API keys
* JWT tokens
* Credit card numbers
* Personal identification numbers

**Mask in Logs:**
```typescript
function maskSensitiveData(data: string): string {
  if (data.length <= 4) return '****';
  return data.slice(0, 2) + '****' + data.slice(-2);
}
```

---

## 7. Secrets Management

### 7.1 Environment Variables

**Never commit secrets:**
* Add `.env` to `.gitignore`
* Use `.env.example` with placeholder values
* Rotate secrets regularly
* Use different secrets per environment

**Validation:**
```typescript
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'APP_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

---

### 7.2 Secrets Storage

**Development:**
* `.env` file (gitignored)

**Production:**
* AWS Secrets Manager
* HashiCorp Vault
* Kubernetes Secrets
* Environment variables in deployment platform

**Never:**
* Hardcode secrets in code
* Commit secrets to version control
* Share secrets via email/chat

---

## 8. Payment Security

### 8.1 Payment Verification

**Manual Verification:**
* Admin reviews screenshots
* Verify transaction hash on blockchain explorer
* Compare amounts
* Check network matches

**Future Automated Verification:**
* Verify transaction hash via blockchain API
* Check transaction amount
* Verify recipient address
* Check transaction confirmation count

---

### 8.2 Payment Data Protection

**Storage:**
* Encrypt payment screenshots
* Store in secure S3 bucket
* Use signed URLs with expiration
* Restrict access to admins only

**Access Control:**
```typescript
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('/api/admin/payments/:id/screenshot')
async getScreenshot(@Param('id') id: string) {
  // Generate signed URL with 5-minute expiration
  const url = await s3Service.getSignedUrl(id, 300);
  return { url };
}
```

---

## 9. Admin Security

### 9.1 Admin Access Control

**IP Whitelisting (Optional):**
```typescript
const adminIPWhitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

function checkAdminIP(req: Request): boolean {
  if (adminIPWhitelist.length === 0) return true; // Disabled
  const clientIP = req.ip;
  return adminIPWhitelist.includes(clientIP);
}
```

**Two-Factor Authentication (Future):**
* TOTP-based 2FA for admin accounts
* Backup codes
* Recovery process

---

### 9.2 Admin Audit Logging

**Log All Admin Actions:**
```typescript
@Post('/api/admin/payments/:id/approve')
async approvePayment(@Param('id') id: string, @User() admin: User) {
  // ... approve logic

  // Log admin action
  await adminLogService.log({
    adminId: admin.id,
    action: 'APPROVE_PAYMENT',
    targetId: id,
    metadata: { paymentId: id }
  });
}
```

---

## 10. Dependency Security

### 10.1 Dependency Scanning

**Tools:**
* `npm audit` / `pnpm audit`
* Snyk
* Dependabot (GitHub)

**Regular Checks:**
```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically
pnpm audit fix

# Update dependencies
pnpm update
```

---

### 10.2 Dependency Pinning

**Lock Files:**
* Commit `pnpm-lock.yaml` / `package-lock.json`
* Use exact versions for critical dependencies
* Review dependency updates before merging

---

## 11. Monitoring & Incident Response

### 11.1 Security Monitoring

**Monitor:**
* Failed login attempts
* Unusual API usage patterns
* Admin actions
* Payment verification activities
* Error rates

**Alerts:**
* Multiple failed logins from same IP
* Unusual admin activity
* Payment fraud patterns
* High error rates

---

### 11.2 Incident Response Plan

**Steps:**
1. **Detect** - Identify security incident
2. **Contain** - Isolate affected systems
3. **Investigate** - Determine scope and impact
4. **Remediate** - Fix vulnerabilities
5. **Recover** - Restore normal operations
6. **Document** - Record incident and lessons learned

**Contacts:**
* Security team
* Infrastructure team
* Legal (if data breach)

---

## 12. Compliance

### 12.1 GDPR Compliance

**User Rights:**
* Right to access data
* Right to rectification
* Right to erasure
* Right to data portability

**Implementation:**
```typescript
@Get('/api/users/me/data')
async getUserData(@User() user: User) {
  // Return all user data
  return {
    profile: user,
    payments: await getPayments(user.id),
    watchlist: await getWatchlist(user.id),
    // ... all user data
  };
}

@Delete('/api/users/me')
async deleteAccount(@User() user: User) {
  // Delete all user data
  await userService.deleteUser(user.id);
}
```

---

### 12.2 Data Retention

**Policies:**
* User data: Retain while account active, delete 30 days after deletion request
* Payment records: Retain for 7 years (tax/legal requirements)
* Logs: Retain for 90 days
* Error logs: Retain for 30 days

---

## 13. Security Headers

### 13.1 Recommended Headers

```typescript
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  
  next();
});
```

---

## 14. Security Testing

### 14.1 Penetration Testing

**Regular Testing:**
* Annual penetration tests
* Vulnerability assessments
* Security code reviews

**Tools:**
* OWASP ZAP
* Burp Suite
* SQLMap (for SQL injection testing)

---

### 14.2 Security Checklist

Before production launch:

- [ ] All secrets in environment variables
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] CORS restricted
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention
- [ ] Password hashing (bcrypt/Argon2)
- [ ] JWT tokens secure (httpOnly, secure)
- [ ] Admin access restricted
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies updated and scanned
- [ ] Security headers configured
- [ ] Backup and recovery tested

---

**End of security.md**

