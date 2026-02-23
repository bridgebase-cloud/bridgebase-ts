# Security Policy

## Reporting a Vulnerability

**Please do not disclose security vulnerabilities publicly.**

If you discover a security issue in the **BridgeBase Node.js SDK**, please report it privately by emailing:

**[security@bridgebase.dev](mailto:security@bridgebase.dev)**

### What to Include

Please include as much information as possible:

* A clear description of the vulnerability
* Steps to reproduce the issue
* Proof-of-concept code or screenshots (if applicable)
* Potential impact and attack scenarios
* Any suggested fixes or mitigations (optional)

### Response Timeline

We aim to follow responsible disclosure best practices:

* **Initial Response:** Within 48 hours
* **Status Update:** Within 5 business days
* **Fix Timeline:** Depends on severity (critical issues are prioritized)

We appreciate responsible disclosure and will acknowledge your contribution once the issue is resolved.

---

## Supported Versions

Security updates are provided for the latest stable release. We strongly recommend always using the most recent version.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅         |

---

## Security Best Practices

When using this SDK:

* **Never commit API keys or JWT tokens** to version control
* **Use environment variables** for secrets management (e.g., `.env` files with `.gitignore`)
* **Rotate tokens regularly** according to your security policy
* **Validate all external input** before passing it to SDK methods
* **Keep dependencies updated**:

```bash
npm update bridgebase
# or
yarn upgrade bridgebase
# or
pnpm update bridgebase
```

* Use tools like `npm audit` or `pnpm audit` to detect vulnerabilities:

```bash
npm audit
```

---

## Disclosure Policy

We follow coordinated vulnerability disclosure. Please allow us reasonable time to investigate and release a fix before any public disclosure.

---

Thank you for helping keep **BridgeBase** secure.
