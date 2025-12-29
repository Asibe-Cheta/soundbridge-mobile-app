#!/usr/bin/env node
/**
 * Check Wise Account Balance
 *
 * This script checks the current balance in your Wise account
 * for all currencies and alerts if any balance is below threshold.
 *
 * Usage:
 *   node scripts/check-wise-balance.js
 *
 * Schedule this to run daily via cron or CI/CD:
 *   0 9 * * * cd /path/to/project && node scripts/check-wise-balance.js
 */

require('dotenv').config();

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;

// Alert thresholds (adjust based on your needs)
const BALANCE_THRESHOLDS = {
  USD: 1000,    // $1,000
  EUR: 1000,    // €1,000
  GBP: 1000,    // £1,000
  NGN: 500000,  // ₦500,000 (~$330)
  GHS: 5000,    // GH₵5,000 (~$330)
  KES: 100000,  // KES 100,000 (~$770)
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function section(title) {
  log(`\n${'═'.repeat(70)}`, colors.blue);
  log(`${colors.bold}${title}${colors.reset}`, colors.blue);
  log('═'.repeat(70), colors.blue);
}

async function checkWiseBalance() {
  try {
    section('WISE ACCOUNT BALANCE CHECK');

    // Validate environment variables
    if (!WISE_API_TOKEN) {
      error('WISE_API_TOKEN not found in .env file');
      process.exit(1);
    }

    if (!WISE_PROFILE_ID) {
      error('WISE_PROFILE_ID not found in .env file');
      process.exit(1);
    }

    info(`Profile ID: ${WISE_PROFILE_ID}`);
    info(`Checking balances...\n`);

    // Fetch balances
    const response = await fetch(
      `https://api.wise.com/v3/profiles/${WISE_PROFILE_ID}/balances?types=STANDARD`,
      {
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      error(`Failed to fetch balances: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        error('Invalid API token. Please check WISE_API_TOKEN in .env');
      } else if (response.status === 404) {
        error('Profile not found. Please check WISE_PROFILE_ID in .env');
      }

      process.exit(1);
    }

    const balances = await response.json();

    section('CURRENT BALANCES');

    let hasLowBalance = false;
    const lowBalances = [];

    balances.forEach((balance) => {
      const currency = balance.currency;
      const amount = balance.amount.value;
      const threshold = BALANCE_THRESHOLDS[currency];

      // Format amount with commas
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

      // Check if below threshold
      const isBelowThreshold = threshold && amount < threshold;

      if (isBelowThreshold) {
        hasLowBalance = true;
        lowBalances.push({
          currency,
          amount,
          threshold,
          difference: threshold - amount,
        });
        warning(`${currency}: ${formattedAmount} (BELOW THRESHOLD: ${threshold})`);
      } else {
        success(`${currency}: ${formattedAmount}`);
      }
    });

    // Summary
    section('SUMMARY');

    if (hasLowBalance) {
      warning(`${lowBalances.length} currency balance(s) below threshold!\n`);

      lowBalances.forEach((bal) => {
        const formattedDiff = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(bal.difference);

        warning(`${bal.currency}: Need to add ${formattedDiff} to reach threshold`);
      });

      info('\n💡 Action Required:');
      info('1. Top up your Wise account');
      info('2. Go to: https://wise.com/');
      info('3. Add funds to the low balance currencies\n');

      // Send alert (implement your notification method)
      sendLowBalanceAlert(lowBalances);

    } else {
      success('All balances are above threshold! ✨\n');
    }

    // Calculate total balance in USD equivalent (if needed)
    section('TOTAL VALUE (USD EQUIVALENT)');
    info('Note: Exchange rates may vary. This is an approximation.\n');

    // Simple exchange rate estimates (update regularly)
    const exchangeRates = {
      USD: 1.0,
      EUR: 1.1,
      GBP: 1.27,
      NGN: 0.0007,
      GHS: 0.07,
      KES: 0.0077,
    };

    let totalUSD = 0;
    balances.forEach((balance) => {
      const rate = exchangeRates[balance.currency] || 0;
      const usdValue = balance.amount.value * rate;
      totalUSD += usdValue;

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(usdValue);

      info(`${balance.currency}: ${formatted}`);
    });

    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(totalUSD);

    log(`\n${colors.bold}Total: ${formattedTotal}${colors.reset}`, colors.cyan);

    section('BALANCE CHECK COMPLETE');

    if (hasLowBalance) {
      warning('Action required: Top up low balances');
      process.exit(1); // Exit with error code for CI/CD alerting
    } else {
      success('All balances are healthy!');
    }

  } catch (err) {
    error(`\nError checking balance: ${err.message}`);
    console.error('\nStack trace:');
    console.error(err.stack);
    process.exit(1);
  }
}

function sendLowBalanceAlert(lowBalances) {
  // Implement your alert notification here
  // Examples:
  // - Send email via SendGrid/Mailgun
  // - Post to Slack webhook
  // - Send SMS via Twilio
  // - Create ticket in issue tracker

  console.log('\n📧 Alert Notification:');
  console.log('   Implement sendLowBalanceAlert() to send notifications');
  console.log('   Examples: Email, Slack, SMS, etc.\n');

  // Example Slack webhook (uncomment and configure)
  /*
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    const message = {
      text: '⚠️ Wise Balance Alert',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Wise Balance Below Threshold*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: lowBalances.map(b => `• ${b.currency}: ${b.amount} (threshold: ${b.threshold})`).join('\n'),
          },
        },
      ],
    };

    fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
  */
}

// Run the script
checkWiseBalance();
