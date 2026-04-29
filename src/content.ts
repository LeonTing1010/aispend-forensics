/**
 * AI-spend Forensics — Content script
 * Runs on AI tool dashboard pages to extract spend data
 */

// IMMEDIATE LOG - This should appear in console as soon as script loads

interface SpendData {
  amount: number;
  currency: string;
  period: string;
  lastUpdated: number;
  error?: string;
}

// Avoid double-injection using a unique symbol
const LOADED_KEY = "__aispend_loaded_" + chrome.runtime.id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any;

if (win[LOADED_KEY]) {
  throw new Error("Already loaded"); // Stop execution
}
win[LOADED_KEY] = true;


/**
 * Detect which provider we're on
 */
function detectProvider(): "cursor" | "claude" | "replit" | null {
  const host = location.hostname;

  if (host.includes("cursor.com")) {
    return "cursor";
  }
  if (host.includes("claude.ai") || host.includes("anthropic.com")) {
    return "claude";
  }
  if (host.includes("replit.com")) {
    return "replit";
  }
  return null;
}

/**
 * Extract spend from Cursor settings page
 * Looks for usage/cost displays in the settings UI
 */
function extractCursorSpend(): SpendData | null {
  try {

    // Get all text content from the page
    const bodyText = document.body.innerText;

    // PRIORITY 1: Look for "On-Demand Usage" or actual usage charges
    // This is the real spend, not the plan price
    const usagePatterns = [
      /On-Demand Usage[\s\S]*?\$([\d,]+\.?\d*)/i,  // On-Demand Usage...$0.00
      /Usage[\s\S]*?\$([\d,]+\.?\d*)[\s\S]*?Subtotal/i,  // Usage section before Subtotal
      /Subtotal[:\s]*\$([\d,]+\.?\d*)/i,  // Subtotal: $X.XX
      /Total[:\s]*\$([\d,]+\.?\d*)/i,  // Total: $X.XX
    ];

    for (const pattern of usagePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(amount) && amount >= 0) {
          return {
            amount,
            currency: "USD",
            period: "current billing cycle",
            lastUpdated: Date.now(),
          };
        }
      }
    }

    // PRIORITY 2: If on billing page but no usage found, report $0
    if (location.href.includes("billing") || bodyText.includes("On-Demand Usage")) {
      return {
        amount: 0,
        currency: "USD",
        period: "current billing cycle",
        lastUpdated: Date.now(),
      };
    }

    // PRIORITY 3: Look for plan price (fallback for dashboard page)
    const planPatterns = [
      /\$([\d,]+\.?\d*)\s*\/\s*mo/i,  // $20/mo
      /\$([\d,]+\.?\d*)\s*per\s*month/i,  // $20 per month
    ];

    for (const pattern of planPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(amount) && amount >= 0) {
          return {
            amount,
            currency: "USD",
            period: "plan price",
            lastUpdated: Date.now(),
          };
        }
      }
    }

    return null;
  } catch (error) {
    return {
      amount: 0,
      currency: "USD",
      period: "this month",
      lastUpdated: Date.now(),
      error: "Failed to read usage data",
    };
  }
}

/**
 * Extract spend from Claude Console
 */
function extractClaudeSpend(): SpendData | null {
  try {

    const bodyText = document.body.innerText;

    // Parse invoices section - look for rows with Date, Total, Status
    // Pattern: Date | Total | Status (Paid/Refunded)
    // We need to find "Paid" invoices only, skip "Refunded"

    // Find all invoice entries with their status
    // Typical format: "Jan 22, 2026 US$100.00 Refunded" or "Jul 14, 2025 US$0.00 Paid"
    const invoiceRegex = /(\w{3}\s+\d{1,2},?\s+\d{4})[\s\S]*?US?\$([\d,]+\.?\d*)[\s\S]*?(Paid|Refunded)/gi;

    let totalPaid = 0;
    let hasPaidInvoices = false;
    let match;

    while ((match = invoiceRegex.exec(bodyText)) !== null) {
      const date = match[1];
      const amount = parseFloat(match[2].replace(/,/g, ""));
      const status = match[3];


      if (status === "Paid" && !isNaN(amount)) {
        totalPaid += amount;
        hasPaidInvoices = true;
      }
      // Skip "Refunded" invoices
    }

    if (hasPaidInvoices) {
      return {
        amount: totalPaid,
        currency: "USD",
        period: "paid invoices",
        lastUpdated: Date.now(),
      };
    }

    // No paid invoices found - check if on free plan
    if (bodyText.includes("Free plan") || bodyText.match(/Current plan[:\s]*Free/i)) {
      return {
        amount: 0,
        currency: "USD",
        period: "free plan",
        lastUpdated: Date.now(),
      };
    }

    return null;
  } catch (error) {
    return {
      amount: 0,
      currency: "USD",
      period: "this month",
      lastUpdated: Date.now(),
      error: "Failed to read usage data",
    };
  }
}

/**
 * Extract spend from Replit billing page
 */
function extractReplitSpend(): SpendData | null {
  try {

    const bodyText = document.body.innerText;

    // Check if on Free plan
    if (bodyText.includes("Current plan") && bodyText.match(/Current plan[\s\n]*Free/i)) {
      return {
        amount: 0,
        currency: "USD",
        period: "free plan",
        lastUpdated: Date.now(),
      };
    }

    // Look for dollar amounts in billing context
    const patterns = [
      /Current usage[:\s]*\$([\d,]+\.?\d*)/i,
      /This month[:\s]*\$([\d,]+\.?\d*)/i,
      /Total[:\s]*\$([\d,]+\.?\d*)/i,
      /\$([\d,]+\.?\d*)[\s\n]*per month/i,
    ];

    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(amount) && amount >= 0) {
          return {
            amount,
            currency: "USD",
            period: "current",
            lastUpdated: Date.now(),
          };
        }
      }
    }

    // If page mentions "Free" anywhere in billing context, assume $0
    if (bodyText.match(/plan[\s\n]*Free/i) || bodyText.match(/Free[\s\n]*plan/i)) {
      return {
        amount: 0,
        currency: "USD",
        period: "free plan",
        lastUpdated: Date.now(),
      };
    }

    return null;
  } catch (error) {
    return {
      amount: 0,
      currency: "USD",
      period: "this month",
      lastUpdated: Date.now(),
      error: "Failed to read usage data",
    };
  }
}

/**
 * Save spend data to extension storage
 */
async function saveSpendData(
  provider: string,
  data: SpendData
): Promise<void> {
  try {
    const key = `${provider}_spend`;
    await chrome.storage.local.set({ [key]: data });
  } catch (error) {
    // Extension context invalidated - happens when extension is reloaded during development
    if (error instanceof Error && error.message.includes("Extension context invalidated")) {
      return;
    }
    throw error;
  }
}

/**
 * Main extraction logic
 */
async function extractAndSave(): Promise<void> {
  const provider = detectProvider();
  if (!provider) {
    return;
  }


  // Wait for page to fully load (SPA content)
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    let data: SpendData | null = null;

    switch (provider) {
      case "cursor":
        data = extractCursorSpend();
        break;
      case "claude":
        data = extractClaudeSpend();
        break;
      case "replit":
        data = extractReplitSpend();
        break;
    }

    if (data) {
      try {
        await saveSpendData(provider, data);

        // Notify background script
        chrome.runtime.sendMessage({
          type: "aispend_data_updated",
          provider,
          data,
        });
      } catch (error) {
        // Extension context invalidated - happens when extension is reloaded during development
        if (error instanceof Error && error.message.includes("Extension context invalidated")) {
          return;
        }
        throw error;
      }
      return; // Success, exit
    }

    // No data yet, wait and retry
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

}

/**
 * Watch for page changes (SPA navigation)
 */
function watchForChanges(): void {
  let lastUrl = location.href;

  const checkForUrlChange = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Delay to let page settle
      setTimeout(extractAndSave, 1000);
    }
  };

  // Watch for history changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    checkForUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    checkForUrlChange();
  };

  window.addEventListener("popstate", checkForUrlChange);

  // Also watch for DOM changes that might indicate new content
  let debounceTimer: number | null = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      extractAndSave();
    }, 2000); // 2s debounce
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize

// Wait for page to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    extractAndSave();
    watchForChanges();
  });
} else {
  extractAndSave();
  watchForChanges();
}

// Also extract when page becomes visible (user switches back to tab)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    extractAndSave();
  }
});
