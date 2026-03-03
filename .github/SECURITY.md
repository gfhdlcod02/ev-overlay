# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do **NOT** open a public issue.

Instead, please report it via:

1. **GitHub Security Advisories**: [Create a private security advisory](https://github.com/gfhdlcod02/ev-overlay/security/advisories/new)
2. **Email**: Contact the repository owner directly

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Time

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix & Release**: As soon as possible depending on severity

## Security Measures

This project follows these security practices:

- ✅ No secrets or credentials in code
- ✅ Input validation on all user inputs
- ✅ Rate limiting on API endpoints (60 req/min per IP)
- ✅ Dependency vulnerability scanning (Dependabot)
- ✅ Secret scanning enabled
- ✅ Automated security updates
- ✅ All commits signed (recommended)

## Security Features

- Rate limiting: 60 requests/minute per IP
- No PII collection
- Location data not persisted
- Secrets server-side only
- CORS properly configured
- Input validation on all endpoints
