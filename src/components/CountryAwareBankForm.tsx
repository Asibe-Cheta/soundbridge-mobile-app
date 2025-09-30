import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, CountryBankingInfo, Country } from '../services/WalletService';
import { locationService, LocationDetectionResult } from '../services/LocationService';
import { currencyService } from '../services/CurrencyService';

interface CountryAwareBankFormProps {
  session: Session;
  onSubmit: (methodData: any) => Promise<void>;
  setAsDefault?: boolean;
}

const CountryAwareBankForm: React.FC<CountryAwareBankFormProps> = ({
  session,
  onSubmit,
  setAsDefault = false,
}) => {
  const { theme } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState('GB'); // Default to UK
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryInfo, setCountryInfo] = useState<CountryBankingInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationDetection, setLocationDetection] = useState<LocationDetectionResult | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(true);

  useEffect(() => {
    loadSupportedCountries();
    detectUserLocation();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      loadCountryBankingInfo(selectedCountry);
    }
  }, [selectedCountry]);

  const loadSupportedCountries = async () => {
    try {
      setLoading(true);
      const result = await walletService.getSupportedCountriesSafe(session);
      setCountries(result.countries || []);
      
      // If no countries loaded, provide fallback with all 30+ Stripe Connect supported countries
      if (result.countries.length === 0) {
        setCountries([
          // Major Markets (Tier 1)
          { country_code: 'US', country_name: 'United States', currency: 'USD', banking_system: 'ACH' },
          { country_code: 'GB', country_name: 'United Kingdom', currency: 'GBP', banking_system: 'Faster Payments' },
          { country_code: 'CA', country_name: 'Canada', currency: 'CAD', banking_system: 'Interac' },
          { country_code: 'AU', country_name: 'Australia', currency: 'AUD', banking_system: 'NPP' },
          { country_code: 'DE', country_name: 'Germany', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'FR', country_name: 'France', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'ES', country_name: 'Spain', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'IT', country_name: 'Italy', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'NL', country_name: 'Netherlands', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'JP', country_name: 'Japan', currency: 'JPY', banking_system: 'Zengin' },
          
          // European Markets (SEPA)
          { country_code: 'AT', country_name: 'Austria', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'BE', country_name: 'Belgium', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'CH', country_name: 'Switzerland', currency: 'CHF', banking_system: 'SEPA' },
          { country_code: 'DK', country_name: 'Denmark', currency: 'DKK', banking_system: 'SEPA' },
          { country_code: 'FI', country_name: 'Finland', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'IE', country_name: 'Ireland', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'LU', country_name: 'Luxembourg', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'NO', country_name: 'Norway', currency: 'NOK', banking_system: 'SEPA' },
          { country_code: 'PT', country_name: 'Portugal', currency: 'EUR', banking_system: 'SEPA' },
          { country_code: 'SE', country_name: 'Sweden', currency: 'SEK', banking_system: 'SEPA' },
          
          // Asian Markets
          { country_code: 'SG', country_name: 'Singapore', currency: 'SGD', banking_system: 'FAST' },
          { country_code: 'HK', country_name: 'Hong Kong', currency: 'HKD', banking_system: 'RTGS' },
          { country_code: 'IN', country_name: 'India', currency: 'INR', banking_system: 'NEFT/RTGS' },
          { country_code: 'CN', country_name: 'China', currency: 'CNY', banking_system: 'CNAPS' },
          { country_code: 'MY', country_name: 'Malaysia', currency: 'MYR', banking_system: 'RENTAS' },
          { country_code: 'TH', country_name: 'Thailand', currency: 'THB', banking_system: 'BAHTNET' },
          { country_code: 'PH', country_name: 'Philippines', currency: 'PHP', banking_system: 'InstaPay' },
          { country_code: 'ID', country_name: 'Indonesia', currency: 'IDR', banking_system: 'BI-RTGS' },
          { country_code: 'VN', country_name: 'Vietnam', currency: 'VND', banking_system: 'VNPAY' },
          { country_code: 'KR', country_name: 'South Korea', currency: 'KRW', banking_system: 'BOK-Wire+' },
          
          // Americas
          { country_code: 'MX', country_name: 'Mexico', currency: 'MXN', banking_system: 'SPEI' },
          { country_code: 'BR', country_name: 'Brazil', currency: 'BRL', banking_system: 'PIX' },
          { country_code: 'AR', country_name: 'Argentina', currency: 'ARS', banking_system: 'CBU' },
          { country_code: 'CL', country_name: 'Chile', currency: 'CLP', banking_system: 'LBTR' },
          { country_code: 'CO', country_name: 'Colombia', currency: 'COP', banking_system: 'CUD' },
          { country_code: 'PE', country_name: 'Peru', currency: 'PEN', banking_system: 'LBTR' },
          
          // Middle East & Africa
          { country_code: 'AE', country_name: 'United Arab Emirates', currency: 'AED', banking_system: 'UAEFTS' },
          { country_code: 'SA', country_name: 'Saudi Arabia', currency: 'SAR', banking_system: 'SARIE' },
          { country_code: 'ZA', country_name: 'South Africa', currency: 'ZAR', banking_system: 'RTC' },
          { country_code: 'NG', country_name: 'Nigeria', currency: 'NGN', banking_system: 'NIP' },
          { country_code: 'KE', country_name: 'Kenya', currency: 'KES', banking_system: 'RTGS' },
          { country_code: 'EG', country_name: 'Egypt', currency: 'EGP', banking_system: 'RTGS' },
          
          // Additional
          { country_code: 'NZ', country_name: 'New Zealand', currency: 'NZD', banking_system: 'ESAS' },
          { country_code: 'CZ', country_name: 'Czech Republic', currency: 'CZK', banking_system: 'CERTIS' },
          { country_code: 'PL', country_name: 'Poland', currency: 'PLN', banking_system: 'SORBNET' },
        ]);
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
      
      // Reset form data when country changes
      setFormData({});
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
      MX: {
        country_code: 'MX', country_name: 'Mexico', currency: 'MXN', banking_system: 'SPEI',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          clabe: { required: true, label: 'CLABE', placeholder: '123456789012345678' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { clabe: '^\\d{18}$' },
      },

      // Asian Systems
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
      CN: {
        country_code: 'CN', country_name: 'China', currency: 'CNY', banking_system: 'CNAPS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789012345678' },
          bank_code: { required: true, label: 'Bank Code', placeholder: '123456789012' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { bank_code: '^\\d{12}$' },
      },
      IN: {
        country_code: 'IN', country_name: 'India', currency: 'INR', banking_system: 'NEFT/RTGS',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789012' },
          ifsc_code: { required: true, label: 'IFSC Code', placeholder: 'SBIN0001234' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { ifsc_code: '^[A-Z]{4}0[A-Z0-9]{6}$' },
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
      AR: {
        country_code: 'AR', country_name: 'Argentina', currency: 'ARS', banking_system: 'CBU',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          cbu: { required: true, label: 'CBU', placeholder: '1234567890123456789012' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { cbu: '^\\d{22}$' },
      },
      BR: {
        country_code: 'BR', country_name: 'Brazil', currency: 'BRL', banking_system: 'PIX',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456-7' },
          agency: { required: true, label: 'Agency', placeholder: '1234' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { agency: '^\\d{4}$' },
      },
      NG: {
        country_code: 'NG', country_name: 'Nigeria', currency: 'NGN', banking_system: 'NIP',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
          bank_code: { required: true, label: 'Bank Code', placeholder: '123' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { bank_code: '^\\d{3}$' },
      },
      ZA: {
        country_code: 'ZA', country_name: 'South Africa', currency: 'ZAR', banking_system: 'RTC',
        required_fields: {
          account_holder_name: { required: true, label: 'Account Holder Name' },
          bank_name: { required: true, label: 'Bank Name' },
          account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
          branch_code: { required: true, label: 'Branch Code', placeholder: '123456' },
          account_type: { required: true, label: 'Account Type' },
        },
        field_validation: { branch_code: '^\\d{6}$' },
      },
    };

    return fallbackData[countryCode] || fallbackData.GB;
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setFormData({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
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
        country: selectedCountry,
        currency: countryInfo?.currency,
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
    
    if (fieldName === 'account_type') {
      return (
        <View key={fieldName} style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
            {fieldInfo.label} {fieldInfo.required && <Text style={styles.required}>*</Text>}
          </Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => handleFieldChange(fieldName, itemValue)}
              style={[styles.picker, { color: theme.colors.text }]}
            >
              <Picker.Item label="Select account type..." value="" />
              <Picker.Item label="Checking" value="checking" />
              <Picker.Item label="Savings" value="savings" />
              <Picker.Item label="Business" value="business" />
            </Picker>
          </View>
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
      // IBAN Countries
      AE: 'UAE banks use IBAN for international transfers. IBAN format: AE + 2 digits + 19 digits.',
      CH: 'Swiss banks use IBAN for international transfers. IBAN format: CH + 2 digits + 17 digits.',
      DE: 'German banks use IBAN for international transfers. IBAN format: DE + 2 digits + 18 digits.',
      ES: 'Spanish banks use IBAN for international transfers. IBAN format: ES + 2 digits + 20 digits.',
      FR: 'French banks use IBAN for international transfers. IBAN format: FR + 2 digits + 23 characters.',
      IT: 'Italian banks use IBAN for international transfers. IBAN format: IT + 2 digits + 1 letter + 22 digits.',
      NL: 'Dutch banks use IBAN for international transfers. IBAN format: NL + 2 digits + 4 letters + 10 digits.',
      
      // North American Systems
      US: 'US banks use Routing Number for transfers. Routing numbers are 9 digits.',
      CA: 'Canadian banks use Transit Number (5 digits) and Institution Number (3 digits).',
      MX: 'Mexican banks use CLABE for transfers. CLABE is an 18-digit standardized banking number.',
      
      // Asian Systems
      JP: 'Japanese banks use Branch Code for transfers. Branch codes are 3 digits.',
      CN: 'Chinese banks use Bank Code for transfers. Bank codes are 12 digits.',
      IN: 'Indian banks use IFSC Code for transfers. Format: 4 letters + 0 + 6 alphanumeric characters.',
      SG: 'Singapore banks use Bank Code for transfers. Bank codes are 4 digits.',
      
      // Other Regional Systems
      GB: 'UK banks use Sort Code instead of Routing Number. Sort codes are 6 digits in XX-XX-XX format.',
      AU: 'Australian banks use BSB Code for transfers. BSB codes are 6 digits in XXX-XXX format.',
      AR: 'Argentine banks use CBU for transfers. CBU is a 22-digit standardized banking number.',
      BR: 'Brazilian banks use Agency for transfers. Agency codes are 4 digits.',
      NG: 'Nigerian banks use Bank Code for transfers. Bank codes are 3 digits.',
      ZA: 'South African banks use Branch Code for transfers. Branch codes are 6 digits.',
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
        <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Picker
            selectedValue={selectedCountry}
            onValueChange={handleCountryChange}
            style={[styles.picker, { color: theme.colors.text }]}
          >
            {countries.map((country) => (
              <Picker.Item 
                key={country.country_code} 
                label={`${country.country_name} (${country.currency})`} 
                value={country.country_code} 
              />
            ))}
          </Picker>
        </View>
      </View>

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
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
});

export default CountryAwareBankForm;
