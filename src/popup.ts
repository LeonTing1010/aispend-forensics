/**
 * AI-spend Forensics — Popup script
 * Reads spend data from storage and renders the popup UI
 */

interface SpendData {
  amount: number;
  currency: string;
  period: string;
  lastUpdated: number;
  error?: string;
}

interface ProviderData {
  cursor?: SpendData;
  claude?: SpendData;
  replit?: SpendData;
}

const PROVIDER_NAMES: Record<string, string> = {
  cursor: "Cursor",
  claude: "Claude",
  replit: "Replit",
};

async function loadSpendData(): Promise<ProviderData> {
  const result = await chrome.storage.local.get([
    "cursor_spend",
    "claude_spend",
    "replit_spend",
  ]);
  return {
    cursor: result.cursor_spend,
    claude: result.claude_spend,
    replit: result.replit_spend,
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function createProviderElement(
  key: string,
  data: SpendData | undefined
): HTMLElement {
  const provider = document.createElement("div");
  provider.className = "provider";

  const header = document.createElement("div");
  header.className = "provider-header";

  const name = document.createElement("div");
  name.className = "provider-name";
  name.textContent = PROVIDER_NAMES[key] || key;

  const status = document.createElement("div");
  status.className = "provider-status";

  if (!data) {
    status.textContent = "Not connected";
  } else if (data.error) {
    status.textContent = "Error";
    status.classList.add("error");
  } else {
    status.textContent = "Connected";
    status.classList.add("connected");
  }

  header.appendChild(name);
  header.appendChild(status);
  provider.appendChild(header);

  if (data && !data.error) {
    const display = document.createElement("div");
    display.className = "spend-display";

    const amount = document.createElement("span");
    amount.className = "spend-amount";
    amount.textContent = formatCurrency(data.amount, data.currency);

    const currency = document.createElement("span");
    currency.className = "spend-currency";
    currency.textContent = data.currency || "USD";

    const period = document.createElement("span");
    period.className = "spend-period";
    period.textContent = data.period || "this month";

    display.appendChild(amount);
    display.appendChild(currency);
    display.appendChild(period);
    provider.appendChild(display);
  } else if (data?.error) {
    const errorMsg = document.createElement("div");
    errorMsg.style.fontSize = "11px";
    errorMsg.style.color = "#cf222e";
    errorMsg.style.marginTop = "4px";
    errorMsg.textContent = data.error;
    provider.appendChild(errorMsg);
  }

  return provider;
}

async function renderPopup(): Promise<void> {
  const container = document.getElementById("providers-container");
  const lastSyncEl = document.getElementById("last-sync");
  if (!container) return;

  const data = await loadSpendData();
  const providers = Object.entries(data).filter(([_, v]) => v !== undefined);

  if (providers.length === 0) {
    // Keep empty state
    return;
  }

  // Clear container
  container.innerHTML = "";

  // Add provider elements
  for (const [key, spendData] of providers) {
    container.appendChild(createProviderElement(key, spendData));
  }

  // Update last sync time
  const lastSync = providers
    .map(([_, d]) => d?.lastUpdated || 0)
    .sort((a, b) => b - a)[0];

  if (lastSyncEl && lastSync > 0) {
    lastSyncEl.textContent = `Synced ${formatTimeAgo(lastSync)}`;
  }
}

// Render on load
document.addEventListener("DOMContentLoaded", renderPopup);

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    renderPopup();
  }
});
