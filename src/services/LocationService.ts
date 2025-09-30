import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import { currencyService } from './CurrencyService';

export interface LocationDetectionResult {
  countryCode: string;
  currency: string;
  detectionMethod: 'ip' | 'locale' | 'timezone' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

class LocationService {
  private readonly SUPPORTED_COUNTRIES = [
    // Major Markets (Tier 1)
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'JP',
    
    // European Markets (SEPA)
    'AT', 'BE', 'CH', 'DK', 'FI', 'IE', 'LU', 'NO', 'PT', 'SE',
    
    // Asian Markets
    'SG', 'HK', 'IN', 'CN', 'MY', 'TH', 'PH', 'ID', 'VN', 'KR',
    
    // Americas
    'MX', 'BR', 'AR', 'CL', 'CO', 'PE',
    
    // Middle East & Africa
    'AE', 'SA', 'ZA', 'NG', 'KE', 'EG',
    
    // Additional Stripe Connect Supported
    'NZ', 'CZ', 'PL', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE'
  ];

  /**
   * Detect user's country using multiple methods
   */
  async detectCountry(): Promise<LocationDetectionResult> {
    console.log('🌍 LocationService: Starting country detection...');

    // Method 1: IP-based geolocation (most accurate)
    try {
      const ipResult = await this.detectByIP();
      if (ipResult) {
        console.log('✅ LocationService: IP detection successful:', ipResult.countryCode);
        return ipResult;
      }
    } catch (error) {
      console.log('❌ LocationService: IP detection failed:', error);
    }

    // Method 2: Device locale detection (fallback)
    try {
      const localeResult = this.detectByLocale();
      if (localeResult) {
        console.log('✅ LocationService: Locale detection successful:', localeResult.countryCode);
        return localeResult;
      }
    } catch (error) {
      console.log('❌ LocationService: Locale detection failed:', error);
    }

    // Method 3: Timezone mapping (secondary fallback)
    try {
      const timezoneResult = this.detectByTimezone();
      if (timezoneResult) {
        console.log('✅ LocationService: Timezone detection successful:', timezoneResult.countryCode);
        return timezoneResult;
      }
    } catch (error) {
      console.log('❌ LocationService: Timezone detection failed:', error);
    }

    // Method 4: Ultimate fallback
    console.log('🔄 LocationService: Using fallback (GB)');
    const fallbackCountry = 'GB';
    return {
      countryCode: fallbackCountry,
      currency: currencyService.getCurrencyForCountry(fallbackCountry),
      detectionMethod: 'fallback',
      confidence: 'low'
    };
  }

  /**
   * Detect country by IP geolocation
   */
  private async detectByIP(): Promise<LocationDetectionResult | null> {
    const timeout = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('IP detection timeout')), 5000)
    );

    try {
      const response = await Promise.race([
        fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SoundBridge-Mobile/1.0'
          }
        }),
        timeout
      ]);

      if (!response || !response.ok) {
        throw new Error(`HTTP ${response?.status}`);
      }

      const data = await response.json();
      const countryCode = data.country_code?.toUpperCase();

      if (countryCode && this.isSupportedCountry(countryCode)) {
        return {
          countryCode,
          currency: currencyService.getCurrencyForCountry(countryCode),
          detectionMethod: 'ip',
          confidence: 'high'
        };
      }

      // If detected country is not supported, try to map to nearest supported country
      const mappedCountry = this.mapToSupportedCountry(countryCode);
      if (mappedCountry) {
        return {
          countryCode: mappedCountry,
          currency: currencyService.getCurrencyForCountry(mappedCountry),
          detectionMethod: 'ip',
          confidence: 'medium'
        };
      }

      return null;
    } catch (error) {
      console.log('IP detection error:', error);
      return null;
    }
  }

  /**
   * Detect country by device locale
   */
  private detectByLocale(): LocationDetectionResult | null {
    try {
      const locales = Localization.getLocales();
      
      for (const locale of locales) {
        if (locale.regionCode) {
          const countryCode = locale.regionCode.toUpperCase();
          
          if (this.isSupportedCountry(countryCode)) {
            return {
              countryCode,
              currency: currencyService.getCurrencyForCountry(countryCode),
              detectionMethod: 'locale',
              confidence: 'medium'
            };
          }

          // Try to map to supported country
          const mappedCountry = this.mapToSupportedCountry(countryCode);
          if (mappedCountry) {
            return {
              countryCode: mappedCountry,
              currency: currencyService.getCurrencyForCountry(mappedCountry),
              detectionMethod: 'locale',
              confidence: 'medium'
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.log('Locale detection error:', error);
      return null;
    }
  }

  /**
   * Detect country by timezone
   */
  private detectByTimezone(): LocationDetectionResult | null {
    try {
      const timezone = Localization.getCalendars()[0]?.timeZone || 
                      Intl.DateTimeFormat().resolvedOptions().timeZone;

      const countryCode = this.timezoneToCountry(timezone);
      
      if (countryCode && this.isSupportedCountry(countryCode)) {
        return {
          countryCode,
          currency: currencyService.getCurrencyForCountry(countryCode),
          detectionMethod: 'timezone',
          confidence: 'low'
        };
      }

      return null;
    } catch (error) {
      console.log('Timezone detection error:', error);
      return null;
    }
  }

  /**
   * Check if country is supported
   */
  private isSupportedCountry(countryCode: string): boolean {
    return this.SUPPORTED_COUNTRIES.includes(countryCode.toUpperCase());
  }

  /**
   * Map unsupported countries to nearest supported country
   */
  private mapToSupportedCountry(countryCode: string): string | null {
    const countryMappings: Record<string, string> = {
      // European countries to nearest IBAN country
      'AT': 'DE', // Austria -> Germany
      'BE': 'NL', // Belgium -> Netherlands
      'DK': 'DE', // Denmark -> Germany
      'FI': 'DE', // Finland -> Germany
      'GR': 'IT', // Greece -> Italy
      'IE': 'GB', // Ireland -> UK
      'LU': 'FR', // Luxembourg -> France
      'NO': 'DE', // Norway -> Germany
      'PT': 'ES', // Portugal -> Spain
      'SE': 'DE', // Sweden -> Germany
      
      // North American
      'PR': 'US', // Puerto Rico -> US
      'VI': 'US', // US Virgin Islands -> US
      
      // Asian countries
      'HK': 'CN', // Hong Kong -> China
      'MO': 'CN', // Macau -> China
      'TW': 'CN', // Taiwan -> China
      'KR': 'JP', // South Korea -> Japan
      'MY': 'SG', // Malaysia -> Singapore
      'TH': 'SG', // Thailand -> Singapore
      'PH': 'SG', // Philippines -> Singapore
      'ID': 'SG', // Indonesia -> Singapore
      'VN': 'SG', // Vietnam -> Singapore
      
      // African countries
      'KE': 'ZA', // Kenya -> South Africa
      'GH': 'NG', // Ghana -> Nigeria
      'EG': 'AE', // Egypt -> UAE
      
      // South American
      'CL': 'AR', // Chile -> Argentina
      'PE': 'BR', // Peru -> Brazil
      'CO': 'BR', // Colombia -> Brazil
      'VE': 'BR', // Venezuela -> Brazil
      'UY': 'AR', // Uruguay -> Argentina
      
      // Oceania
      'NZ': 'AU', // New Zealand -> Australia
      'FJ': 'AU', // Fiji -> Australia
    };

    return countryMappings[countryCode.toUpperCase()] || null;
  }

  /**
   * Map timezone to country code
   */
  private timezoneToCountry(timezone: string): string | null {
    const timezoneMap: Record<string, string> = {
      // Major timezone mappings
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Mexico_City': 'MX',
      'America/Sao_Paulo': 'BR',
      'America/Argentina/Buenos_Aires': 'AR',
      
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Madrid': 'ES',
      'Europe/Rome': 'IT',
      'Europe/Amsterdam': 'NL',
      'Europe/Zurich': 'CH',
      
      'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN',
      'Asia/Kolkata': 'IN',
      'Asia/Singapore': 'SG',
      'Asia/Dubai': 'AE',
      
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Australia/Perth': 'AU',
      
      'Africa/Lagos': 'NG',
      'Africa/Johannesburg': 'ZA',
    };

    return timezoneMap[timezone] || null;
  }

  /**
   * Get country display name
   */
  getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      // Major Markets
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
      'NL': 'Netherlands',
      'JP': 'Japan',
      
      // European Markets
      'AT': 'Austria',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'DK': 'Denmark',
      'FI': 'Finland',
      'IE': 'Ireland',
      'LU': 'Luxembourg',
      'NO': 'Norway',
      'PT': 'Portugal',
      'SE': 'Sweden',
      
      // Asian Markets
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'IN': 'India',
      'CN': 'China',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'KR': 'South Korea',
      
      // Americas
      'MX': 'Mexico',
      'BR': 'Brazil',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      
      // Middle East & Africa
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'ZA': 'South Africa',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'EG': 'Egypt',
      
      // Additional European
      'NZ': 'New Zealand',
      'CZ': 'Czech Republic',
      'PL': 'Poland',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'SI': 'Slovenia',
      'SK': 'Slovakia',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
    };

    return countryNames[countryCode.toUpperCase()] || countryCode;
  }

  /**
   * Get detection method display text
   */
  getDetectionMethodText(method: string): string {
    const methodTexts: Record<string, string> = {
      'ip': 'Detected by IP location',
      'locale': 'Detected from device settings',
      'timezone': 'Detected from timezone',
      'fallback': 'Using default location'
    };

    return methodTexts[method] || 'Unknown detection method';
  }
}

export const locationService = new LocationService();
