/**
 * AI-spend Forensics — Background service worker
 * Handles notifications and cross-tab communication
 */

interface SpendData {
  amount: number;
  currency: string;
  period: string;
  lastUpdated: number;
  error?: string;
}

// Store last known values for anomaly detection (v0.3)
const lastKnownSpend: Map<string, number> = new Map();

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "aispend_data_updated") {
    const { provider, data } = message as {
      provider: string;
      data: SpendData;
    };

    console.log(`[AI-spend BG] Data updated for ${provider}:`, data);

    // Store for anomaly detection (v0.3)
    if (!data.error) {
      lastKnownSpend.set(provider, data.amount);
    }

    // Update extension icon badge with total
    updateBadge();

    // Acknowledge receipt
    sendResponse({ success: true });
  }

  return true; // Keep channel open for async
});

/**
 * Update extension icon badge with total spend
 */
async function updateBadge(): Promise<void> {
  try {
    const result = await chrome.storage.local.get([
      "cursor_spend",
      "claude_spend",
      "replit_spend",
    ]);

    let total = 0;
    let count = 0;

    for (const key of ["cursor_spend", "claude_spend", "replit_spend"]) {
      const data: SpendData | undefined = result[key];
      if (data && !data.error) {
        total += data.amount;
        count++;
      }
    }

    // Format badge text (show total in $K if > 1000)
    let badgeText: string;
    if (total >= 1000) {
      badgeText = `$${(total / 1000).toFixed(1)}k`;
    } else if (total >= 100) {
      badgeText = `$${Math.round(total)}`;
    } else if (total > 0) {
      badgeText = `$${total.toFixed(0)}`;
    } else {
      badgeText = "";
    }

    // Truncate if too long
    if (badgeText.length > 4) {
      badgeText = badgeText.slice(0, 4);
    }

    await chrome.action.setBadgeText({ text: badgeText });

    // Color based on amount (warning if high)
    if (total > 500) {
      await chrome.action.setBadgeBackgroundColor({ color: "#cf222e" }); // Red
    } else if (total > 100) {
      await chrome.action.setBadgeBackgroundColor({ color: "#d29922" }); // Yellow
    } else {
      await chrome.action.setBadgeBackgroundColor({ color: "#238636" }); // Green
    }
  } catch (error) {
    console.error("[AI-spend BG] Error updating badge:", error);
  }
}

/**
 * Initialize on install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[AI-spend BG] Extension installed/updated:", details.reason);

  // Clear any stale data on update
  if (details.reason === "update") {
    // Optionally migrate data here
  }

  // Set initial badge
  updateBadge();
});

/**
 * Listen for storage changes to update badge in real-time
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    updateBadge();
  }
});

/**
 * Periodic sync (every 15 minutes)
 * This ensures data stays fresh even if user doesn't revisit pages
 */
chrome.alarms?.create("sync", { periodInMinutes: 15 });

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync") {
    console.log("[AI-spend BG] Periodic sync check");
    updateBadge();
  }
});

// Initial badge update
updateBadge();

console.log("[AI-spend BG] Service worker loaded");
