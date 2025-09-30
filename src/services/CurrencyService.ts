/**
 * CurrencyService - Handles dynamic currency mapping and formatting
 * Fixes the critical hardcoded USD issue by providing country-based currencies
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

class CurrencyService {
  private readonly COUNTRY_CURRENCY_MAP: Record<string, string> = {
    // Major Markets
    'US': 'USD',
    'GB': 'GBP', 
    'CA': 'CAD',
    'AU': 'AUD',
    
    // European Union (EUR)
    'DE': 'EUR',
    'FR': 'EUR',
    'ES': 'EUR',
    'IT': 'EUR',
    'NL': 'EUR',
    'AT': 'EUR',
    'BE': 'EUR',
    'FI': 'EUR',
    'IE': 'EUR',
    'LU': 'EUR',
    'PT': 'EUR',
    
    // Asian Markets
    'JP': 'JPY',
    'SG': 'SGD',
    'HK': 'HKD',
    'MY': 'MYR',
    'TH': 'THB',
    'PH': 'PHP',
    'ID': 'IDR',
    'VN': 'VND',
    'KR': 'KRW',
    'IN': 'INR',
    'CN': 'CNY',
    
    // Other Major Currencies
    'CH': 'CHF', // Switzerland
    'SE': 'SEK', // Sweden
    'NO': 'NOK', // Norway
    'DK': 'DKK', // Denmark
    'NZ': 'NZD', // New Zealand
    'BR': 'BRL', // Brazil
    'MX': 'MXN', // Mexico
    'AR': 'ARS', // Argentina
    'CL': 'CLP', // Chile
    'CO': 'COP', // Colombia
    'PE': 'PEN', // Peru
    
    // Middle East & Africa
    'AE': 'AED', // UAE
    'SA': 'SAR', // Saudi Arabia
    'ZA': 'ZAR', // South Africa
    'NG': 'NGN', // Nigeria
    'KE': 'KES', // Kenya
    'EG': 'EGP', // Egypt
    
    // Additional European
    'CZ': 'CZK', // Czech Republic
    'PL': 'PLN', // Poland
    'HU': 'HUF', // Hungary
    'RO': 'RON', // Romania
    'BG': 'BGN', // Bulgaria
    'HR': 'HRK', // Croatia
    'SI': 'EUR', // Slovenia (uses EUR)
    'SK': 'EUR', // Slovakia (uses EUR)
    'LT': 'EUR', // Lithuania (uses EUR)
    'LV': 'EUR', // Latvia (uses EUR)
    'EE': 'EUR', // Estonia (uses EUR)
  };

  private readonly CURRENCY_INFO: Record<string, CurrencyInfo> = {
    'USD': { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
    'GBP': { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
    'EUR': { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
    'CAD': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
    'AUD': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
    'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
    'CHF': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalPlaces: 2 },
    'SEK': { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimalPlaces: 2 },
    'NOK': { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimalPlaces: 2 },
    'DKK': { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimalPlaces: 2 },
    'SGD': { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2 },
    'HKD': { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimalPlaces: 2 },
    'NZD': { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimalPlaces: 2 },
    'MYR': { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimalPlaces: 2 },
    'THB': { code: 'THB', symbol: '฿', name: 'Thai Baht', decimalPlaces: 2 },
    'PHP': { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimalPlaces: 2 },
    'IDR': { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimalPlaces: 0 },
    'VND': { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimalPlaces: 0 },
    'KRW': { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimalPlaces: 0 },
    'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
    'CNY': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalPlaces: 2 },
    'BRL': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalPlaces: 2 },
    'MXN': { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimalPlaces: 2 },
    'ARS': { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimalPlaces: 2 },
    'CLP': { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimalPlaces: 0 },
    'COP': { code: 'COP', symbol: '$', name: 'Colombian Peso', decimalPlaces: 0 },
    'PEN': { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimalPlaces: 2 },
    'AED': { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimalPlaces: 2 },
    'SAR': { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimalPlaces: 2 },
    'ZAR': { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimalPlaces: 2 },
    'NGN': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimalPlaces: 2 },
    'KES': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimalPlaces: 2 },
    'EGP': { code: 'EGP', symbol: '£', name: 'Egyptian Pound', decimalPlaces: 2 },
    'CZK': { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimalPlaces: 2 },
    'PLN': { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimalPlaces: 2 },
    'HUF': { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimalPlaces: 0 },
    'RON': { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimalPlaces: 2 },
    'BGN': { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', decimalPlaces: 2 },
    'HRK': { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', decimalPlaces: 2 },
  };

  /**
   * Get currency code for a country
   * CRITICAL: This fixes the hardcoded USD issue
   */
  getCurrencyForCountry(countryCode: string): string {
    const currency = this.COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()];
    if (!currency) {
      console.warn(`⚠️ CurrencyService: No currency mapping for country ${countryCode}, using USD fallback`);
      return 'USD';
    }
    console.log(`💰 CurrencyService: ${countryCode} → ${currency}`);
    return currency;
  }

  /**
   * Get currency information
   */
  getCurrencyInfo(currencyCode: string): CurrencyInfo {
    return this.CURRENCY_INFO[currencyCode.toUpperCase()] || this.CURRENCY_INFO['USD'];
  }

  /**
   * Format amount with proper currency symbol and formatting
   */
  formatAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencyInfo(currencyCode);
    
    try {
      // Use Intl.NumberFormat for proper localization
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces,
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      console.warn(`⚠️ CurrencyService: Intl.NumberFormat failed for ${currencyCode}, using fallback`);
      const formattedAmount = currency.decimalPlaces > 0 
        ? amount.toFixed(currency.decimalPlaces)
        : Math.round(amount).toString();
      return `${currency.symbol}${formattedAmount}`;
    }
  }

  /**
   * Get currency symbol only
   */
  getCurrencySymbol(currencyCode: string): string {
    return this.getCurrencyInfo(currencyCode).symbol;
  }

  /**
   * Get currency name
   */
  getCurrencyName(currencyCode: string): string {
    return this.getCurrencyInfo(currencyCode).name;
  }

  /**
   * Check if currency uses decimal places
   */
  hasDecimalPlaces(currencyCode: string): boolean {
    return this.getCurrencyInfo(currencyCode).decimalPlaces > 0;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(this.CURRENCY_INFO);
  }

  /**
   * Get all country-currency mappings
   */
  getCountryCurrencyMappings(): Record<string, string> {
    return { ...this.COUNTRY_CURRENCY_MAP };
  }

  /**
   * Validate currency code
   */
  isValidCurrency(currencyCode: string): boolean {
    return currencyCode.toUpperCase() in this.CURRENCY_INFO;
  }

  /**
   * Get countries that use a specific currency
   */
  getCountriesForCurrency(currencyCode: string): string[] {
    const countries: string[] = [];
    const upperCurrency = currencyCode.toUpperCase();
    
    for (const [country, currency] of Object.entries(this.COUNTRY_CURRENCY_MAP)) {
      if (currency === upperCurrency) {
        countries.push(country);
      }
    }
    
    return countries;
  }

  /**
   * Format amount for display in UI components
   */
  formatForDisplay(amount: number, currencyCode: string, compact: boolean = false): string {
    if (compact && amount >= 1000) {
      // For large amounts, show compact format (e.g., £1.2K, $5.5M)
      const currency = this.getCurrencyInfo(currencyCode);
      let compactAmount: string;
      let suffix: string;

      if (amount >= 1000000) {
        compactAmount = (amount / 1000000).toFixed(1);
        suffix = 'M';
      } else if (amount >= 1000) {
        compactAmount = (amount / 1000).toFixed(1);
        suffix = 'K';
      } else {
        return this.formatAmount(amount, currencyCode);
      }

      return `${currency.symbol}${compactAmount}${suffix}`;
    }

    return this.formatAmount(amount, currencyCode);
  }
}

export const currencyService = new CurrencyService();
