# Privacy Policy - AI-spend Forensics

## Data Collection and Usage

**AI-spend Forensics** does not collect, transmit, or share any user data with external servers.

### Local Data Storage Only

All data is stored locally on your device using Chrome's `storage` API. No data leaves your browser.

### Permissions Usage

| Permission | Purpose | Justification |
|------------|---------|---------------|
| **storage** | Save spend data locally | Required to store extracted spend data between browser sessions |
| **notifications** | Alert on spending anomalies | Optional feature for v0.3+ anomaly detection |
| **activeTab** | Read current page data | Required to access AI tool dashboard pages for data extraction |
| **host permissions** | Access AI tool websites | Required to read spend data from cursor.com, claude.ai, and replit.com |

### Remote Code

This extension does not use any remote code. All code is bundled within the extension package.

### Data Access

The extension only reads data from pages you actively visit:
- Cursor settings/billing pages
- Claude settings/billing pages  
- Replit billing pages

### Single Purpose

This extension has a single purpose: to help users track and monitor their AI tool spending across multiple platforms by reading publicly visible billing information from AI tool dashboards.

## Compliance

This extension complies with the Chrome Web Store Developer Program Policies regarding data usage and privacy.

## Contact

For privacy-related questions, please open an issue on GitHub: https://github.com/LeonTing1010/aispend-forensics/issues
