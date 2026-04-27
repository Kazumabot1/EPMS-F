# Gmail SMTP setup for EPMS

Onboarding and temporary-password emails use **Spring Mail** with Gmail’s SMTP endpoint. Authentication **must** use a [Google App Password](https://support.google.com/accounts/answer/185833), not your normal Gmail password.

## 1. Sender Google account

1. Open the Gmail account that will **send** mail (the same address you set as `SMTP_USER`).
2. Enable **[2-Step Verification](https://myaccount.google.com/security)** for that account (required before App Passwords appear).
3. Create an **App Password** (Google Account → Security → 2-Step Verification → App passwords):
   - Choose “Mail” and your device, or “Other” and name it `EPMS`.
   - Google shows a **16-character** password, often grouped as four blocks of four characters.

## 2. Configure the Spring Boot application

**Do not commit real credentials.** Prefer environment variables or a **local, gitignored** properties file.

Required environment variables (see `EPMS/src/main/resources/application.properties`):

| Variable    | Purpose |
|------------|---------|
| `SMTP_USER` | Full Gmail address of the sender, e.g. `hr-notify@company.com` (must match the mailbox used for the App Password). |
| `SMTP_PASS` | The 16-character App Password. You may paste with or without spaces; if delivery fails, try without spaces. |

The app maps them to:

- `spring.mail.username=${SMTP_USER:}`
- `spring.mail.password=${SMTP_PASS:}`
- `app.mail.from=EPMS HR <${SMTP_USER:}>`

Also set:

- `spring.mail.host=smtp.gmail.com`
- `spring.mail.port=587`
- `spring.mail.properties.mail.smtp.auth=true`
- STARTTLS enabled (see `application.properties`)

**Never** put a real App Password in a file that is tracked by Git.

## 3. Restart after changes

Spring reads mail settings at startup. After changing `SMTP_USER`, `SMTP_PASS`, or `application.properties`, **restart** the EPMS backend.

## 4. Verify

1. Log in to EPMS as an HR user (JWT required).
2. Call:

   `POST /api/mail/test`  
   Body: `{ "to": "your-test-address@gmail.com" }`

3. On success, check the inbox (and **Spam**) for the test message.
4. Check application logs on startup: they list SMTP host, whether username/password are **set** (not their values), and the from address.

## 5. Operational notes

- **535 / BadCredentials:** Usually wrong App Password, normal Gmail password used by mistake, or 2-Step/App Password not set up for that account.
- **From address:** For Gmail SMTP, the envelope and `From` sender should match the authenticated user (`SMTP_USER`).
- **Resend after fixing SMTP:** HR can open an employee with a linked login and use **Resend onboarding email**, or call `POST /api/users/{userId}/resend-temporary-password`.

## 6. Local override (optional)

You may add `application-local.properties` (gitignored) with overrides for your machine only—**do not commit** it:

```properties
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-16-char-app-password
```

Or export the same variables in your shell / IDE run configuration before starting the JVM.
