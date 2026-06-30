import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, CountryBankingInfo, Country } from '../services/WalletService';
import { locationService, LocationDetectionResult } from '../services/LocationService';
import { currencyService } from '../services/CurrencyService';
import { config } from '../config/environment';

// Currencies where Fincra provides a bank picker via /api/payouts/bank-options.
// Backend only supports NGN, GHS, KES on Fincra rails — other African currencies
// (ZAR, TZS, UGX, etc.) fall back to free-text / Stripe Connect flow.
const FINCRA_BANK_DROPDOWN_CURRENCIES = new Set(['NGN', 'GHS', 'KES']);


// Built-in bank lists used as fallback when the /api/banks endpoint returns nothing.
// Covers major countries where users need a picker rather than free-text.
// GB/GH: BIC/SWIFT codes. NG: CBN bank codes. CA: institution numbers. US: SWIFT codes.
// Code field may be empty for institutions without a published BIC — keyExtractor handles this.
const BUILTIN_BANKS: Record<string, { name: string; code: string }[]> = {
  GB: [
    { name: 'Barclays', code: 'BUKBGB22' },
    { name: 'Lloyds Bank', code: 'LOYDGB21' },
    { name: 'HSBC UK', code: 'HBUKGB4B' },
    { name: 'NatWest', code: 'NWBKGB2L' },
    { name: 'Santander UK', code: 'ABBYGB2L' },
    { name: 'Halifax', code: 'HLFXGB21' },
    { name: 'Nationwide Building Society', code: 'NAIAGB21' },
    { name: 'TSB Bank', code: 'TSBSGB2A' },
    { name: 'Monzo', code: 'MONZGB2L' },
    { name: 'Starling Bank', code: 'SRLGGB3L' },
    { name: 'First Direct', code: 'MIDLGB22' },
    { name: 'Metro Bank', code: 'MYMBGB2L' },
    { name: 'Co-operative Bank', code: 'CPBKGB22' },
    { name: 'Virgin Money', code: 'NRNBGB21' },
    { name: 'Bank of Scotland', code: 'BOFSGB21' },
    { name: 'Royal Bank of Scotland', code: 'RBSSGB2L' },
    { name: 'Revolut', code: 'REVOGB21' },
    { name: 'Monzo', code: 'MONZGB2L' },
    { name: 'Chase UK', code: 'CHASDEFX' },
    { name: 'Clydesdale Bank', code: 'CLYDGB21' },
    { name: 'Standard Chartered UK', code: 'SCBLGB2L' },
    { name: 'Investec Bank UK', code: 'INVSGB2X' },
    { name: 'Handelsbanken UK', code: 'HANSGB22' },
    { name: 'Triodos Bank UK', code: 'TRIOGB21' },
    { name: 'Yorkshire Building Society', code: '' },
    { name: 'Skipton Building Society', code: '' },
    { name: 'Coventry Building Society', code: '' },
    { name: 'Leeds Building Society', code: '' },
    { name: 'Atom Bank', code: '' },
    { name: 'Tandem Bank', code: '' },
    { name: 'Marcus by Goldman Sachs', code: '' },
    { name: 'Aldermore Bank', code: '' },
    { name: 'Shawbrook Bank', code: '' },
    { name: 'OakNorth Bank', code: '' },
    { name: 'Paragon Bank', code: '' },
    { name: 'Tesco Bank', code: '' },
  ],
  NG: [
    // Heritage Bank removed — CBN revoked licence June 2024
    { name: 'Access Bank', code: '044' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'GTBank (Guaranty Trust)', code: '058' },
    { name: 'First Bank of Nigeria', code: '011' },
    { name: 'UBA (United Bank for Africa)', code: '033' },
    { name: 'Fidelity Bank', code: '070' },
    { name: 'FCMB (First City Monument Bank)', code: '214' },
    { name: 'Union Bank', code: '032' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'Stanbic IBTC Bank', code: '221' },
    { name: 'Ecobank Nigeria', code: '050' },
    { name: 'Keystone Bank', code: '082' },
    { name: 'Polaris Bank', code: '076' },
    { name: 'Wema Bank', code: '035' },
    { name: 'Unity Bank', code: '215' },
    { name: 'Citibank Nigeria', code: '023' },
    { name: 'Standard Chartered Nigeria', code: '068' },
    { name: 'JAIZ Bank', code: '301' },
    { name: 'SunTrust Bank', code: '100' },
    { name: 'Providus Bank', code: '101' },
    { name: 'Titan Trust Bank', code: '102' },
    { name: 'Globus Bank', code: '103' },
    { name: 'Lotus Bank', code: '303' },
    { name: 'Opay', code: '304' },
    { name: 'Kuda Bank', code: '090267' },
    { name: 'Moniepoint', code: '090405' },
    { name: 'PalmPay', code: '999991' },
  ],
  GH: [
    { name: 'Ghana Commercial Bank', code: 'GHCBGHAC' },
    { name: 'Ecobank Ghana', code: 'ECOCGHAC' },
    { name: 'Absa Bank Ghana', code: 'BARCGHAC' },
    { name: 'Standard Chartered Ghana', code: 'SCBLGHAC' },
    { name: 'Fidelity Bank Ghana', code: 'FBLIGHAC' },
    { name: 'Stanbic Bank Ghana', code: 'SBICGHAC' },
    { name: 'Zenith Bank Ghana', code: 'ZEBLGHAC' },
    { name: 'Access Bank Ghana', code: 'ABNGGHAC' },
    { name: 'Prudential Bank Ghana', code: 'PBGHGHAC' },
    { name: 'UBA Ghana', code: 'UNAFGHAC' },
    { name: 'CalBank Ghana', code: 'CALBGHAC' },
    { name: 'Societe Generale Ghana', code: 'SGBFGHAC' },
    { name: 'GTBank Ghana', code: 'GTBIGHAC' },
    { name: 'Bank of Africa Ghana', code: 'BOAFGHAC' },
    { name: 'Republic Bank Ghana', code: '' },
    { name: 'Agricultural Development Bank (ADB)', code: '' },
    { name: 'National Investment Bank (NIB)', code: '' },
    { name: 'OmniBSIC Bank Ghana', code: '' },
    { name: 'First Atlantic Bank Ghana', code: '' },
    { name: 'Consolidated Bank Ghana', code: '' },
    { name: 'ARB Apex Bank', code: '' },
  ],
  IN: [
    { name: 'State Bank of India', code: 'SBIN' },
    { name: 'HDFC Bank', code: 'HDFC' },
    { name: 'ICICI Bank', code: 'ICIC' },
    { name: 'Punjab National Bank', code: 'PUNB' },
    { name: 'Bank of Baroda', code: 'BARB' },
    { name: 'Canara Bank', code: 'CNRB' },
    { name: 'Axis Bank', code: 'UTIB' },
    { name: 'Kotak Mahindra Bank', code: 'KKBK' },
    { name: 'IndusInd Bank', code: 'INDB' },
    { name: 'Yes Bank', code: 'YESB' },
    { name: 'Paytm Payments Bank', code: 'PYTM' },
  ],
  CA: [
    // Institution numbers (3-digit) used by Canadian Payments Association
    { name: 'Royal Bank of Canada (RBC)', code: '003' },
    { name: 'TD Canada Trust', code: '004' },
    { name: 'Scotiabank', code: '002' },
    { name: 'Bank of Montreal (BMO)', code: '001' },
    { name: 'CIBC', code: '010' },
    { name: 'National Bank of Canada', code: '006' },
    { name: 'Laurentian Bank', code: '039' },
    { name: 'Canadian Western Bank', code: '030' },
    { name: 'Desjardins Group', code: '815' },
    { name: 'ATB Financial', code: '219' },
    { name: 'Manulife Bank', code: '540' },
    { name: 'EQ Bank (Equitable)', code: '623' },
    { name: 'Tangerine Bank', code: '614' },
    { name: 'Coast Capital Savings', code: '809' },
    { name: 'Meridian Credit Union', code: '837' },
  ],
  US: [
    { name: 'JPMorgan Chase', code: 'CHASUS33' },
    { name: 'Bank of America', code: 'BOFAUS3N' },
    { name: 'Wells Fargo', code: 'WFBIUS6S' },
    { name: 'Citibank', code: 'CITIUS33' },
    { name: 'U.S. Bancorp (US Bank)', code: 'USBKUS44' },
    { name: 'Truist Bank', code: 'BRBTUS33' },
    { name: 'Goldman Sachs Bank', code: 'GSUSUS33' },
    { name: 'TD Bank US', code: 'NRTHUS33' },
    { name: 'PNC Bank', code: 'PNCCUS33' },
    { name: 'Capital One', code: 'HIBKUS44' },
    { name: 'Charles Schwab Bank', code: 'SWIBUS33' },
    { name: 'Ally Bank', code: 'ALLBUS33' },
    { name: 'Citizens Bank', code: 'CTZNUS33' },
    { name: 'Fifth Third Bank', code: 'FTBCUS3C' },
    { name: 'KeyBank', code: 'KEYCUS33' },
    { name: 'Huntington Bank', code: 'HUNTUS33' },
    { name: 'Regions Bank', code: '' },
    { name: 'BMO Bank (BMO Harris)', code: '' },
    { name: 'Comerica Bank', code: '' },
    { name: 'Navy Federal Credit Union', code: '' },
    { name: 'USAA Bank', code: '' },
    { name: 'SoFi Bank', code: '' },
    { name: 'Discover Bank', code: '' },
    { name: 'Chime', code: '' },
  ],
};

interface CountryAwareBankFormProps {
  session: Session;
  onSubmit: (methodData: any) => Promise<void>;
  setAsDefault?: boolean;
  // Edit-mode / country-lock props (web parity: cc5e3e58, 9149f295)
  initialCountryCode?: string;   // Pin the form to a saved payout country; skips IP detection
  lockedCountry?: boolean;       // When true, hides the country picker (Fincra edit flow)
  initialData?: Record<string, string>; // Pre-fill bank fields (account_holder_name, etc.)
}

const CountryAwareBankForm: React.FC<CountryAwareBankFormProps> = ({
  session,
  onSubmit,
  setAsDefault = false,
  initialCountryCode,
  lockedCountry = false,
  initialData,
}) => {
  const { theme } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState(initialCountryCode || 'GB');
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryInfo, setCountryInfo] = useState<CountryBankingInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationDetection, setLocationDetection] = useState<LocationDetectionResult | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(!initialCountryCode);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [availableBanks, setAvailableBanks] = useState<{ name: string; code: string }[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);

  useEffect(() => {
    loadSupportedCountries();
    // Skip IP geolocation when the payout country is already known (e.g. editing
    // an existing NGN account from the UK — must not override with UK location).
    if (!initialCountryCode) {
      detectUserLocation();
    }
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      loadCountryBankingInfo(selectedCountry);
    }
  }, [selectedCountry]);

  // Fetch bank list for the selected country. Uses the backend API first; falls back
  // to a built-in list (BUILTIN_BANKS) so the picker always shows for supported countries.
  useEffect(() => {
    if (!selectedCountry) return;
    const currency = countries.find(c => c.country_code === selectedCountry)?.currency;
    if (!currency) return;

    setAvailableBanks([]);
    setLoadingBanks(true);

    // For Fincra-rail currencies (NGN/GHS/KES), load banks from the backend API.
    // The API returns Fincra's own bank codes required for correct payout routing.
    if (FINCRA_BANK_DROPDOWN_CURRENCIES.has(currency)) {
      fetch(`${config.apiUrl}/payouts/bank-options?currency=${currency}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.banks?.length > 0) {
            setAvailableBanks(data.banks); // { name, code } — Fincra bank codes
            return;
          }
          // Fallback to built-in if endpoint not ready yet
          const curated = BUILTIN_BANKS[selectedCountry];
          if (curated) setAvailableBanks(curated);
        })
        .catch(() => {
          const curated = BUILTIN_BANKS[selectedCountry];
          if (curated) setAvailableBanks(curated);
        })
        .finally(() => setLoadingBanks(false));
      return;
    }

    // For non-Fincra currencies, use curated built-in list first, then API fallback.
    const curated = BUILTIN_BANKS[selectedCountry];
    if (curated) {
      setAvailableBanks(curated);
      setLoadingBanks(false);
      return;
    }
    walletService.getCountryBanksSafe(session, selectedCountry, currency)
      .then(banks => {
        if (banks.length > 0) {
          setAvailableBanks(banks);
        }
      })
      .finally(() => setLoadingBanks(false));
  }, [selectedCountry, countries]);

  const loadSupportedCountries = async () => {
    try {
      setLoading(true);
      const result = await walletService.getSupportedCountriesSafe(session);
      // Always use the comprehensive built-in country list so all countries (Nigeria, Ghana,
      // Kenya, etc.) are always available regardless of what the backend returns.
      // Any backend countries not in the built-in list are merged in at the end.
      {
        const allBuiltin = [
          // ✅ All supported countries (Stripe Connect + Fincra)

          // Major Markets (Tier 1) - Fully Supported
          { country_code: 'US', country_name: 'United States', currency: 'USD', banking_system: 'ACH' },
          { country_code: 'GB', country_name: 'United Kingdom', currency: 'GBP', banking_system: 'Faster Payments' },
          { country_code: 'CA', country_name: 'Canada', currency: 'CAD', banking_system: 'Interac' },
          { country_code: 'AU', country_name: 'Australia', currency: 'AUD', banking_system: 'NPP' },
          { country_code: 'NZ', country_name: 'New Zealand', currency: 'NZD', banking_system: 'ESAS' },
          { country_code: 'JP', country_name: 'Japan', currency: 'JPY', banking_system: 'Zengin' },
          { country_code: 'SG', country_name: 'Singapore', currency: 'SGD', banking_system: 'FAST' },
          { country_code: 'HK', country_name: 'Hong Kong', currency: 'HKD', banking_system: 'RTGS' },

          // European Union + EEA (SEPA) - Fully Supported
          { country_code: 'AT', country_name: 'Austria', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'BE', country_name: 'Belgium', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'BG', country_name: 'Bulgaria', currency: 'BGN', banking_system: 'SEPA' },
          { country_code: 'HR', country_name: 'Croatia', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'CY', country_name: 'Cyprus', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'CZ', country_name: 'Czech Republic', currency: 'CZK', banking_system: 'SEPA' },
          { country_code: 'DK', country_name: 'Denmark', currency: 'DKK', banking_system: 'SEPA' },
          { country_code: 'EE', country_name: 'Estonia', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'FI', country_name: 'Finland', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'FR', country_name: 'France', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'DE', country_name: 'Germany', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'GR', country_name: 'Greece', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'HU', country_name: 'Hungary', currency: 'HUF', banking_system: 'SEPA' },
          { country_code: 'IE', country_name: 'Ireland', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'IT', country_name: 'Italy', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'LV', country_name: 'Latvia', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'LT', country_name: 'Lithuania', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'LU', country_name: 'Luxembourg', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'MT', country_name: 'Malta', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'NL', country_name: 'Netherlands', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'NO', country_name: 'Norway', currency: 'NOK', banking_system: 'SEPA' },
          { country_code: 'PL', country_name: 'Poland', currency: 'PLN', banking_system: 'SEPA' },
          { country_code: 'PT', country_name: 'Portugal', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'RO', country_name: 'Romania', currency: 'RON', banking_system: 'SEPA' },
          { country_code: 'SK', country_name: 'Slovakia', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'SI', country_name: 'Slovenia', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'ES', country_name: 'Spain', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'SE', country_name: 'Sweden', currency: 'SEK', banking_system: 'SEPA' },
          { country_code: 'CH', country_name: 'Switzerland', currency: 'CHF', banking_system: 'SEPA' },

          // ✅ Fincra (Africa: NGN/GHS/KES) + additional payout destinations

          // Middle East & North Africa
          { country_code: 'AE', country_name: 'United Arab Emirates', currency: 'AED', banking_system: 'UAEFTS' },
          { country_code: 'EG', country_name: 'Egypt', currency: 'EGP', banking_system: 'Egyptian Banks' },
          { country_code: 'IL', country_name: 'Israel', currency: 'ILS', banking_system: 'Israeli Banks' },
          { country_code: 'MA', country_name: 'Morocco', currency: 'MAD', banking_system: 'Moroccan Banks' },
          { country_code: 'TR', country_name: 'Turkey', currency: 'TRY', banking_system: 'Turkish Banks' },

          // Sub-Saharan Africa
          { country_code: 'GH', country_name: 'Ghana', currency: 'GHS', banking_system: 'GhIPSS' },
          { country_code: 'KE', country_name: 'Kenya', currency: 'KES', banking_system: 'KEPSS' },
          { country_code: 'NG', country_name: 'Nigeria', currency: 'NGN', banking_system: 'NIBSS' },
          { country_code: 'TZ', country_name: 'Tanzania', currency: 'TZS', banking_system: 'Tanzanian Banks' },
          { country_code: 'UG', country_name: 'Uganda', currency: 'UGX', banking_system: 'Ugandan Banks' },
          { country_code: 'ZA', country_name: 'South Africa', currency: 'ZAR', banking_system: 'SAMOS' },

          // Asia (East & Southeast)
          { country_code: 'BD', country_name: 'Bangladesh', currency: 'BDT', banking_system: 'Bangladeshi Banks' },
          { country_code: 'CN', country_name: 'China', currency: 'CNY', banking_system: 'Chinese Banks' },
          { country_code: 'ID', country_name: 'Indonesia', currency: 'IDR', banking_system: 'Indonesian Banks' },
          { country_code: 'IN', country_name: 'India', currency: 'INR', banking_system: 'NEFT/RTGS' },
          { country_code: 'KR', country_name: 'South Korea', currency: 'KRW', banking_system: 'Korean Banks' },
          { country_code: 'LK', country_name: 'Sri Lanka', currency: 'LKR', banking_system: 'Sri Lankan Banks' },
          { country_code: 'MY', country_name: 'Malaysia', currency: 'MYR', banking_system: 'Malaysian Banks' },
          { country_code: 'NP', country_name: 'Nepal', currency: 'NPR', banking_system: 'Nepalese Banks' },
          { country_code: 'PH', country_name: 'Philippines', currency: 'PHP', banking_system: 'Philippine Banks' },
          { country_code: 'PK', country_name: 'Pakistan', currency: 'PKR', banking_system: 'Pakistani Banks' },
          { country_code: 'TH', country_name: 'Thailand', currency: 'THB', banking_system: 'Thai Banks' },
          { country_code: 'VN', country_name: 'Vietnam', currency: 'VND', banking_system: 'Vietnamese Banks' },

          // Asia (Caucasus & Central)
          { country_code: 'GE', country_name: 'Georgia', currency: 'GEL', banking_system: 'Georgian Banks' },

          // Latin America & Caribbean
          { country_code: 'AR', country_name: 'Argentina', currency: 'ARS', banking_system: 'Argentine Banks' },
          { country_code: 'BR', country_name: 'Brazil', currency: 'BRL', banking_system: 'PIX' },
          { country_code: 'CL', country_name: 'Chile', currency: 'CLP', banking_system: 'Chilean Banks' },
          { country_code: 'CO', country_name: 'Colombia', currency: 'COP', banking_system: 'Colombian Banks' },
          { country_code: 'CR', country_name: 'Costa Rica', currency: 'CRC', banking_system: 'Costa Rican Banks' },
          { country_code: 'MX', country_name: 'Mexico', currency: 'MXN', banking_system: 'SPEI' },
          { country_code: 'UY', country_name: 'Uruguay', currency: 'UYU', banking_system: 'Uruguayan Banks' },

          // Europe (Non-EU/EEA - already covered above)
          { country_code: 'UA', country_name: 'Ukraine', currency: 'UAH', banking_system: 'Ukrainian Banks' },
        ];
        const builtinCodes = new Set(allBuiltin.map(c => c.country_code));
        const extras = (result.countries || []).filter((c: any) => !builtinCodes.has(c.country_code));
        setCountries([...allBuiltin, ...extras].sort((a, b) => a.country_name.localeCompare(b.country_name)));
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCountryBankingInfo = async (countryCode: string) => {
    try {
      setLoading(true);
      const result = await walletService.getCountryBankingInfoSafe(session, countryCode);
      
      if (result) {
        setCountryInfo(result);
      } else {
        // Provide fallback country info based on country code
        setCountryInfo(getFallbackCountryInfo(countryCode));
      }
      
      // Reset form data when country changes, but keep initialData on first render.
      setFormData(prev => (Object.keys(prev).length === 0 ? initialData || {} : {}));
    } catch (error) {
      console.error('Error loading country info:', error);
      setCountryInfo(getFallbackCountryInfo(countryCode));
    } finally {
      setLoading(false);
    }
  };

  const detectUserLocation = async () => {
    try {
      setDetectingLocation(true);
      console.log('🌍 CountryAwareBankForm: Starting location detection...');
      
      const result = await locationService.detectCountry();
      setLocationDetection(result);
      
      // Update selected country if detection was successful and confident
      if (result.confidence === 'high' || result.confidence === 'medium') {
        console.log(`✅ CountryAwareBankForm: Setting country to ${result.countryCode} (${result.detectionMethod})`);
        setSelectedCountry(result.countryCode);
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      // Keep default country (GB)
      setLocationDetection({
        countryCode: 'GB',
        detectionMethod: 'fallback',
        confidence: 'low'
      });
    } finally {
      setDetectingLocation(false);
    }
  };

  const getFallbackCountryInfo = (countryCode: string): CountryBankingInfo => {
    const fallbackData: Record<string, CountryBankingInfo> = {
      // IBAN Countries (European + UAE)
      AE: {
        country_code: 'AE', country_name: 'United Arab Emirates', currency: 'AED', banking_system: 'IBAN',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'AE070331234567890123456' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^AE\\d{2}\\d{19}$' },
      },
      CH: {
        country_code: 'CH', country_name: 'Switzerland', currency: 'CHF', banking_system: 'SEPA',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'CH9300762011623852957' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^CH\\d{2}\\d{17}$' },
      },
      DE: {
        country_code: 'DE', country_name: 'Germany', currency: 'EUR', banking_system: 'SEPA',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'DE89370400440532013000' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^DE\\d{2}\\d{18}$' },
      },
      ES: {
        country_code: 'ES', country_name: 'Spain', currency: 'EUR', banking_system: 'SEPA',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'ES9121000418450200051332' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^ES\\d{2}\\d{20}$' },
      },
      FR: {
        country_code: 'FR', country_name: 'France', currency: 'EUR', banking_system: 'SEPA',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'FR1420041010050500013M02606' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^FR\\d{2}\\d{10}[A-Z0-9]{11}\\d{2}$' },
      },
      IT: {
        country_code: 'IT', country_name: 'Italy', currency: 'EUR', banking_system: 'SEPA',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'IT60X0542811101000000123456' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^IT\\d{2}[A-Z]\\d{10}\\d{12}$' },
      },
      NL: {
        country_code: 'NL', country_name: 'Netherlands', currency: 'EUR', banking_system: 'SEPA',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          iban: { required: true, label: 'IBAN', placeholder: 'NL91ABNA0417164300' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^NL\\d{2}[A-Z]{4}\\d{10}$' },
      },

      // North American Systems
      US: {
        country_code: 'US', country_name: 'United States', currency: 'USD', banking_system: 'ACH',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          routing_number: { required: true, label: 'Routing Number', placeholder: '123456789' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { account_number: '^\\d{4,17}$', routing_number: '^\\d{9}$' },
      },
      CA: {
        country_code: 'CA', country_name: 'Canada', currency: 'CAD', banking_system: 'Interac',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          transit_number: { required: true, label: 'Transit Number', placeholder: '12345' },
          institution_number: { required: true, label: 'Institution Number', placeholder: '123' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { transit_number: '^\\d{5}$', institution_number: '^\\d{3}$' },
      },
      // Asian Pacific Systems (Stripe Connect Supported)
      JP: {
        country_code: 'JP', country_name: 'Japan', currency: 'JPY', banking_system: 'Zengin',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567' },
          branch_code: { required: true, label: 'Branch Code', placeholder: '123' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { branch_code: '^\\d{3}$' },
      },
      SG: {
        country_code: 'SG', country_name: 'Singapore', currency: 'SGD', banking_system: 'FAST',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          bank_code: { required: true, label: 'Bank Code', placeholder: '1234' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { bank_code: '^\\d{4}$' },
      },

      // Other Regional Systems
      GB: {
        country_code: 'GB', country_name: 'United Kingdom', currency: 'GBP', banking_system: 'Faster Payments',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '12345678' },
          sort_code: { required: true, label: 'Sort Code', placeholder: '12-34-56' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { account_number: '^\\d{8}$', sort_code: '^\\d{2}-\\d{2}-\\d{2}$' },
      },
      AU: {
        country_code: 'AU', country_name: 'Australia', currency: 'AUD', banking_system: 'NPP',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          bsb_code: { required: true, label: 'BSB Code', placeholder: '123-456' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { bsb_code: '^\\d{3}-\\d{3}$' },
      },
      NZ: {
        country_code: 'NZ', country_name: 'New Zealand', currency: 'NZD', banking_system: 'NPP',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '12-3456-7890123-00' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { account_number: '^\\d{2}-\\d{4}-\\d{7}-\\d{2,3}$' },
      },
      HK: {
        country_code: 'HK', country_name: 'Hong Kong', currency: 'HKD', banking_system: 'CHATS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123-456789-123' },
          bank_code: { required: true, label: 'Bank Code', placeholder: '123' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { bank_code: '^\\d{3}$' },
      },

      // ✅ FINCRA-SUPPORTED AFRICAN COUNTRIES (Payouts via Fincra API)
      NG: {
        country_code: 'NG', country_name: 'Nigeria', currency: 'NGN', banking_system: 'NIBSS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number (NUBAN)', placeholder: '0123456789' },
          bank_code: { required: true, label: 'Bank Code (CBN)', placeholder: 'e.g. 033 — Google "[your bank] CBN code Nigeria" (not a USSD code)' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { account_number: '^\\d{10}$', bank_code: '^\\d{3,6}$' },
      },
      GH: {
        country_code: 'GH', country_name: 'Ghana', currency: 'GHS', banking_system: 'GhIPSS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789012' },
          swift_code: { required: true, label: 'SWIFT/BIC Code', placeholder: 'ABCDGHAC' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { swift_code: '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$' },
      },
      KE: {
        country_code: 'KE', country_name: 'Kenya', currency: 'KES', banking_system: 'KEPSS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          swift_code: { required: true, label: 'SWIFT/BIC Code', placeholder: 'ABCDKENA' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { swift_code: '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$' },
      },
      ZA: {
        country_code: 'ZA', country_name: 'South Africa', currency: 'ZAR', banking_system: 'SAMOS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '12345678' },
          branch_code: { required: true, label: 'Branch Code', placeholder: '123456' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { branch_code: '^\\d{6}$' },
      },

      // ✅ STRIPE-SUPPORTED COUNTRIES - Asia
      IN: {
        country_code: 'IN', country_name: 'India', currency: 'INR', banking_system: 'NEFT/RTGS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          ifsc_code: { required: true, label: 'IFSC Code', placeholder: 'ABCD0123456' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { ifsc_code: '^[A-Z]{4}0[A-Z0-9]{6}$' },
      },
      ID: {
        country_code: 'ID', country_name: 'Indonesia', currency: 'IDR', banking_system: 'Indonesian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      MY: {
        country_code: 'MY', country_name: 'Malaysia', currency: 'MYR', banking_system: 'Malaysian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      PH: {
        country_code: 'PH', country_name: 'Philippines', currency: 'PHP', banking_system: 'Philippine Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      TH: {
        country_code: 'TH', country_name: 'Thailand', currency: 'THB', banking_system: 'Thai Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      VN: {
        country_code: 'VN', country_name: 'Vietnam', currency: 'VND', banking_system: 'Vietnamese Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      BD: {
        country_code: 'BD', country_name: 'Bangladesh', currency: 'BDT', banking_system: 'Bangladeshi Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      PK: {
        country_code: 'PK', country_name: 'Pakistan', currency: 'PKR', banking_system: 'Pakistani Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      LK: {
        country_code: 'LK', country_name: 'Sri Lanka', currency: 'LKR', banking_system: 'Sri Lankan Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      NP: {
        country_code: 'NP', country_name: 'Nepal', currency: 'NPR', banking_system: 'Nepalese Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      CN: {
        country_code: 'CN', country_name: 'China', currency: 'CNY', banking_system: 'Chinese Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      KR: {
        country_code: 'KR', country_name: 'South Korea', currency: 'KRW', banking_system: 'Korean Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },

      // ✅ STRIPE-SUPPORTED COUNTRIES - Latin America
      BR: {
        country_code: 'BR', country_name: 'Brazil', currency: 'BRL', banking_system: 'PIX',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '12345678' },
          branch_code: { required: true, label: 'Agency/Branch Code', placeholder: '1234' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { branch_code: '^\\d{4}$' },
      },
      MX: {
        country_code: 'MX', country_name: 'Mexico', currency: 'MXN', banking_system: 'SPEI',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'CLABE Number', placeholder: '012345678901234567' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { account_number: '^\\d{18}$' },
      },
      AR: {
        country_code: 'AR', country_name: 'Argentina', currency: 'ARS', banking_system: 'Argentine Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      CL: {
        country_code: 'CL', country_name: 'Chile', currency: 'CLP', banking_system: 'Chilean Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      CO: {
        country_code: 'CO', country_name: 'Colombia', currency: 'COP', banking_system: 'Colombian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      CR: {
        country_code: 'CR', country_name: 'Costa Rica', currency: 'CRC', banking_system: 'Costa Rican Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      UY: {
        country_code: 'UY', country_name: 'Uruguay', currency: 'UYU', banking_system: 'Uruguayan Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },

      // ✅ STRIPE-SUPPORTED COUNTRIES - Middle East & Africa
      EG: {
        country_code: 'EG', country_name: 'Egypt', currency: 'EGP', banking_system: 'Egyptian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      MA: {
        country_code: 'MA', country_name: 'Morocco', currency: 'MAD', banking_system: 'Moroccan Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      TZ: {
        country_code: 'TZ', country_name: 'Tanzania', currency: 'TZS', banking_system: 'Tanzanian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      UG: {
        country_code: 'UG', country_name: 'Uganda', currency: 'UGX', banking_system: 'Ugandan Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },

      // ✅ STRIPE-SUPPORTED COUNTRIES - Europe & Caucasus
      TR: {
        country_code: 'TR', country_name: 'Turkey', currency: 'TRY', banking_system: 'Turkish Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          iban: { required: true, label: 'IBAN', placeholder: 'TR330006100519786457841326' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { iban: '^TR\\d{2}\\d{22}$' },
      },
      UA: {
        country_code: 'UA', country_name: 'Ukraine', currency: 'UAH', banking_system: 'Ukrainian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },
      GE: {
        country_code: 'GE', country_name: 'Georgia', currency: 'GEL', banking_system: 'Georgian Banks',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: {},
      },

      // ⚠️ NOTE: Dual payment provider system (Stripe + Fincra)
      // Stripe: US, UK, EU, Canada, Australia, Singapore, Japan, Hong Kong, NZ, etc.
      // Fincra: African countries (NGN, GHS, KES) — direct local bank payouts
      // Backend automatically determines provider based on creator's bank currency
    };

    return fallbackData[countryCode] || fallbackData.GB;
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setFormData({});
  };

  const handleFieldChange = (fieldName: string, text: string) => {
    let formatted = text;

    // Auto-format sort_code → XX-XX-XX (UK)
    if (fieldName === 'sort_code') {
      const digits = text.replace(/\D/g, '').slice(0, 6);
      const prevDigits = (formData.sort_code || '').replace(/\D/g, '');
      // If user deleted a char and digit count is unchanged, they hit backspace on
      // an auto-inserted dash — remove the preceding digit too
      const final = (text.length < (formData.sort_code || '').length && digits.length === prevDigits.length)
        ? digits.slice(0, -1)
        : digits;
      if (final.length <= 2) formatted = final;
      else if (final.length <= 4) formatted = `${final.slice(0, 2)}-${final.slice(2)}`;
      else formatted = `${final.slice(0, 2)}-${final.slice(2, 4)}-${final.slice(4)}`;
    }

    // Auto-format bsb_code → XXX-XXX (Australia)
    if (fieldName === 'bsb_code') {
      const digits = text.replace(/\D/g, '').slice(0, 6);
      const prevDigits = (formData.bsb_code || '').replace(/\D/g, '');
      const final = (text.length < (formData.bsb_code || '').length && digits.length === prevDigits.length)
        ? digits.slice(0, -1)
        : digits;
      if (final.length <= 3) formatted = final;
      else formatted = `${final.slice(0, 3)}-${final.slice(3)}`;
    }

    setFormData(prev => ({
      ...prev,
      [fieldName]: formatted,
    }));
  };

  const validateForm = (): boolean => {
    if (!countryInfo) return false;
    
    const requiredFields = countryInfo.required_fields;
    for (const [fieldName, fieldInfo] of Object.entries(requiredFields)) {
      if (fieldInfo.required && !formData[fieldName]?.trim()) {
        Alert.alert('Error', `${fieldInfo.label} is required`);
        return false;
      }

      // Validate field format if validation rule exists
      const validationRule = countryInfo.field_validation[fieldName];
      if (validationRule && formData[fieldName]) {
        const regex = new RegExp(validationRule);
        if (!regex.test(formData[fieldName])) {
          Alert.alert('Error', `${fieldInfo.label} format is invalid`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const methodData = {
        method_type: 'bank_transfer',
        method_name: `${formData.account_holder_name}'s ${countryInfo?.country_name} Account`,
        // Top-level fields expected by creator_bank_accounts columns
        account_holder_name: formData.account_holder_name || '',
        bank_name: formData.bank_name || '',
        account_number: formData.account_number || formData.iban || '',
        account_type: formData.account_type || 'checking',
        bank_code: formData.bank_code || formData.swift_code || formData.branch_code || formData.routing_number || '',
        country: selectedCountry,
        currency: countryInfo?.currency || '',
        // Full form data also sent for backend flexibility
        bank_details: formData,
        is_default: setAsDefault,
      };

      await onSubmit(methodData);
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to add bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (fieldName: string, fieldInfo: any) => {
    const value = formData[fieldName] || '';

    // If we have a bank list for this country, bank_name becomes a searchable picker
    // that also auto-fills bank_code (or branch_code / swift_code depending on country schema).
    // This works for ANY country once the backend returns banks from /api/banks.
    if (fieldName === 'bank_name' && availableBanks.length > 0) {
      const filteredBanks = availableBanks.filter(b =>
        b.name.toLowerCase().includes(bankSearch.toLowerCase())
      );
      return (
        <View key={fieldName} style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            {fieldInfo.label} {fieldInfo.required && <Text style={styles.required}>*</Text>}
          </Text>
          <TouchableOpacity
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: value ? theme.colors.primary : theme.colors.border,
                justifyContent: 'center',
              }
            ]}
            onPress={() => { setBankSearch(''); setShowBankModal(true); }}
          >
            {loadingBanks ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={{ color: value ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
                {value || 'Select your bank...'}
              </Text>
            )}
          </TouchableOpacity>

          <Modal visible={showBankModal} transparent animationType="slide">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Bank</Text>
                    <TouchableOpacity onPress={() => setShowBankModal(false)}>
                      <Text style={[styles.modalClose, { color: theme.colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    placeholder="Search banks..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={bankSearch}
                    onChangeText={setBankSearch}
                    style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    autoFocus
                  />
                  <FlatList
                    data={filteredBanks}
                    keyExtractor={(item, index) => item.code || `${item.name}-${index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.countryItem,
                          { borderBottomColor: theme.colors.border },
                          formData.bank_name === item.name && { backgroundColor: theme.colors.primary + '20' },
                        ]}
                        onPress={() => {
                          // Select bank name AND auto-fill the associated code field
                          const codeField = countryInfo?.required_fields.bank_code ? 'bank_code'
                            : countryInfo?.required_fields.branch_code ? 'branch_code'
                            : countryInfo?.required_fields.swift_code ? 'swift_code'
                            : null;
                          setFormData(prev => ({
                            ...prev,
                            bank_name: item.name,
                            ...(codeField ? { [codeField]: item.code } : {}),
                          }));
                          setShowBankModal(false);
                        }}
                      >
                        <Text style={[styles.countryName, { color: theme.colors.text }]}>{item.name}</Text>
                        {item.code ? (
                          <Text style={[styles.countryCode, { color: theme.colors.textSecondary }]}>Code: {item.code}</Text>
                        ) : null}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No banks found</Text>
                    }
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      );
    }

    // If a bank was chosen from the picker, the code field is auto-filled — show it read-only
    const codeFieldAutoFilled =
      availableBanks.length > 0 &&
      (fieldName === 'bank_code' || fieldName === 'branch_code' || fieldName === 'swift_code') &&
      !!formData.bank_name;

    if (codeFieldAutoFilled) {
      return (
        <View key={fieldName} style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            {fieldInfo.label}
            <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}> (auto-filled)</Text>
          </Text>
          <View style={[styles.input, { backgroundColor: theme.colors.surface + '80', borderColor: theme.colors.border, justifyContent: 'center' }]}>
            <Text style={{ color: value ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
              {value || 'Select a bank above to fill this'}
            </Text>
          </View>
        </View>
      );
    }

    if (fieldName === 'account_type') {
      const accountTypes = [
        { label: 'Checking', value: 'checking' },
        { label: 'Savings', value: 'savings' },
        { label: 'Business', value: 'business' },
      ];
      const selectedLabel = accountTypes.find(t => t.value === value)?.label;
      return (
        <View key={fieldName} style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            {fieldInfo.label} {fieldInfo.required && <Text style={styles.required}>*</Text>}
          </Text>
          <TouchableOpacity
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: value ? theme.colors.primary : theme.colors.border,
                justifyContent: 'space-between',
                flexDirection: 'row',
                alignItems: 'center',
              }
            ]}
            onPress={() => setShowAccountTypeModal(true)}
          >
            <Text style={{ color: selectedLabel ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
              {selectedLabel || 'Select account type...'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>▼</Text>
          </TouchableOpacity>

          <Modal visible={showAccountTypeModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Account Type</Text>
                  <TouchableOpacity onPress={() => setShowAccountTypeModal(false)}>
                    <Text style={[styles.modalClose, { color: theme.colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                {accountTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.countryItem,
                      { borderBottomColor: theme.colors.border },
                      value === type.value && { backgroundColor: theme.colors.primary + '20' },
                    ]}
                    onPress={() => {
                      handleFieldChange(fieldName, type.value);
                      setShowAccountTypeModal(false);
                    }}
                  >
                    <Text style={[styles.countryName, { color: theme.colors.text }]}>{type.label}</Text>
                    {value === type.value && (
                      <Text style={{ color: theme.colors.primary, fontSize: 16 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </View>
      );
    }

    return (
      <View key={fieldName} style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
          {fieldInfo.label} {fieldInfo.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          placeholder={fieldInfo.placeholder || fieldInfo.label}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={(text) => handleFieldChange(fieldName, text)}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }
          ]}
          keyboardType={fieldName.includes('number') || fieldName.includes('code') ? 'numeric' : 'default'}
          autoCapitalize={fieldName === 'account_holder_name' || fieldName === 'bank_name' ? 'words' : 'none'}
        />
      </View>
    );
  };

  const getBankingInfoText = (countryCode: string): string => {
    const infoTexts: Record<string, string> = {
      // IBAN Countries (EU + Switzerland + UAE)
      AE: 'UAE banks use IBAN for international transfers. IBAN format: AE + 2 digits + 19 digits.',
      CH: 'Swiss banks use IBAN for international transfers. IBAN format: CH + 2 digits + 17 digits.',
      DE: 'German banks use IBAN for international transfers. IBAN format: DE + 2 digits + 18 digits.',
      ES: 'Spanish banks use IBAN for international transfers. IBAN format: ES + 2 digits + 20 digits.',
      FR: 'French banks use IBAN for international transfers. IBAN format: FR + 2 digits + 23 characters.',
      IT: 'Italian banks use IBAN for international transfers. IBAN format: IT + 2 digits + 1 letter + 22 digits.',
      NL: 'Dutch banks use IBAN for international transfers. IBAN format: NL + 2 digits + 4 letters + 10 digits.',

      // North American Systems (US, Canada only)
      US: 'US banks use Routing Number for transfers. Routing numbers are 9 digits.',
      CA: 'Canadian banks use Transit Number (5 digits) and Institution Number (3 digits).',

      // Asia-Pacific Systems (Stripe Connect Supported)
      JP: 'Japanese banks use Branch Code for transfers. Branch codes are 3 digits.',
      SG: 'Singapore banks use Bank Code for transfers. Bank codes are 4 digits.',
      HK: 'Hong Kong banks use Bank Code for transfers. Bank codes are 3 digits.',

      // Other Stripe Connect Supported Systems
      GB: 'UK banks use Sort Code instead of Routing Number. Sort codes are 6 digits in XX-XX-XX format.',
      AU: 'Australian banks use BSB Code for transfers. BSB codes are 6 digits in XXX-XXX format.',
      NZ: 'New Zealand banks use standardized account numbers in XX-XXXX-XXXXXXX-XX format.',
    };
    return infoTexts[countryCode] || 'Please enter your bank account details.';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading banking information...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Location Detection Status */}
      {(detectingLocation || locationDetection) && (
        <View style={[styles.detectionContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {detectingLocation ? (
            <View style={styles.detectionRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.detectionText, { color: theme.colors.text }]}>
                Detecting your location...
              </Text>
            </View>
          ) : locationDetection && (
            <View style={styles.detectionRow}>
              <Text style={[styles.detectionIcon, { color: locationDetection.confidence === 'high' ? theme.colors.success : theme.colors.warning }]}>
                {locationDetection.confidence === 'high' ? '✓' : locationDetection.confidence === 'medium' ? '~' : '?'}
              </Text>
              <View style={styles.detectionInfo}>
                <Text style={[styles.detectionText, { color: theme.colors.text }]}>
                  {locationService.getCountryName(locationDetection.countryCode)}
                </Text>
                <Text style={[styles.detectionSubtext, { color: theme.colors.textSecondary }]}>
                  {locationService.getDetectionMethodText(locationDetection.detectionMethod)} • {locationDetection.currency}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Country Selection */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
          Country <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.pickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: lockedCountry ? 0.6 : 1 }]}
          onPress={() => !lockedCountry && setShowCountryModal(true)}
          disabled={lockedCountry}
        >
          <Text style={[styles.pickerText, { color: theme.colors.text }]}>
            {countries.find(c => c.country_code === selectedCountry)?.country_name || 'Select Country'}
            {selectedCountry && ` (${countries.find(c => c.country_code === selectedCountry)?.currency})`}
          </Text>
          {lockedCountry && (
            <Ionicons name="lock-closed" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>
        {lockedCountry && (
          <Text style={[styles.detectionSubtext, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Using your saved payout country ({countries.find(c => c.country_code === selectedCountry)?.country_name || selectedCountry}), not your current location.
          </Text>
        )}
      </View>

      {/* Country Selection Modal - SAFE REPLACEMENT FOR PICKER */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                  <Text style={[styles.modalClose, { color: theme.colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.searchInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Search countries..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="words"
              />

              <FlatList
                data={countries.filter(c =>
                  c.country_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.currency.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.country_code}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryItem,
                      selectedCountry === item.country_code && { backgroundColor: theme.colors.surface }
                    ]}
                    onPress={() => {
                      setSelectedCountry(item.country_code);
                      setShowCountryModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <Text style={[styles.countryName, { color: theme.colors.text }]}>
                      {item.country_name}
                    </Text>
                    <Text style={[styles.countryCurrency, { color: theme.colors.textSecondary }]}>
                      {item.currency}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Country-specific banking info */}
      {countryInfo && (
        <View style={[styles.infoContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Banking Information for {countryInfo.country_name}
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {getBankingInfoText(selectedCountry)}
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Currency: {countryInfo.currency} ({currencyService.getCurrencySymbol(countryInfo.currency)}) • System: {countryInfo.banking_system}
          </Text>
        </View>
      )}

      {/* Dynamic Form Fields */}
      {countryInfo && (
        <View style={styles.fieldsContainer}>
          {Object.entries(countryInfo.required_fields).map(([fieldName, fieldInfo]) => (
            renderField(fieldName, fieldInfo)
          ))}
        </View>
      )}

      {/* Submit Button */}
      {countryInfo && (
        <View style={styles.submitContainer}>
          <Text style={[styles.submitButton, { backgroundColor: theme.colors.primary }]} onPress={handleSubmit}>
            <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
              {submitting ? 'Adding Bank Account...' : 'Add Bank Account'}
            </Text>
          </Text>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
infoContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  fieldsContainer: {
    marginBottom: 20,
  },
  submitContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  detectionContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectionIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  detectionInfo: {
    flex: 1,
    marginLeft: 8,
  },
  detectionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  detectionSubtext: {
    fontSize: 14,
    lineHeight: 18,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
  },
  pickerText: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    margin: 20,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  countryItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  countryCurrency: {
    fontSize: 14,
  },
  // Nigerian bank picker modal
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  countryCode: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    paddingVertical: 32,
  },
});

export default CountryAwareBankForm;
