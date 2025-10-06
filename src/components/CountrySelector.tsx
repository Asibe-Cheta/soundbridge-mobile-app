import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Country {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  language: string;
}

interface CountrySelectorProps {
  value: string;
  onChange: (country: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ value, onChange }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [searchTerm, countries]);

  const loadCountries = () => {
    // Comprehensive country list from the guide
    const countryList: Country[] = [
      // Popular countries first
      { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', language: 'en' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', language: 'en' },
      { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto', language: 'en' },
      { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos', language: 'en' },
      { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney', language: 'en' },
      
      // Africa
      { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', language: 'en' },
      { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi', language: 'en' },
      { code: 'GH', name: 'Ghana', currency: 'GHS', timezone: 'Africa/Accra', language: 'en' },
      { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo', language: 'ar' },
      { code: 'MA', name: 'Morocco', currency: 'MAD', timezone: 'Africa/Casablanca', language: 'ar' },
      { code: 'TN', name: 'Tunisia', currency: 'TND', timezone: 'Africa/Tunis', language: 'ar' },
      { code: 'DZ', name: 'Algeria', currency: 'DZD', timezone: 'Africa/Algiers', language: 'ar' },
      { code: 'ET', name: 'Ethiopia', currency: 'ETB', timezone: 'Africa/Addis_Ababa', language: 'am' },
      { code: 'UG', name: 'Uganda', currency: 'UGX', timezone: 'Africa/Kampala', language: 'en' },
      { code: 'TZ', name: 'Tanzania', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam', language: 'sw' },
      { code: 'RW', name: 'Rwanda', currency: 'RWF', timezone: 'Africa/Kigali', language: 'rw' },
      { code: 'ZM', name: 'Zambia', currency: 'ZMW', timezone: 'Africa/Lusaka', language: 'en' },
      { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL', timezone: 'Africa/Harare', language: 'en' },
      { code: 'BW', name: 'Botswana', currency: 'BWP', timezone: 'Africa/Gaborone', language: 'en' },
      { code: 'NA', name: 'Namibia', currency: 'NAD', timezone: 'Africa/Windhoek', language: 'en' },
      { code: 'MZ', name: 'Mozambique', currency: 'MZN', timezone: 'Africa/Maputo', language: 'pt' },
      { code: 'AO', name: 'Angola', currency: 'AOA', timezone: 'Africa/Luanda', language: 'pt' },
      { code: 'CM', name: 'Cameroon', currency: 'XAF', timezone: 'Africa/Douala', language: 'fr' },
      { code: 'CI', name: 'Ivory Coast', currency: 'XOF', timezone: 'Africa/Abidjan', language: 'fr' },
      { code: 'SN', name: 'Senegal', currency: 'XOF', timezone: 'Africa/Dakar', language: 'fr' },
      { code: 'ML', name: 'Mali', currency: 'XOF', timezone: 'Africa/Bamako', language: 'fr' },

      // Europe
      { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin', language: 'de' },
      { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris', language: 'fr' },
      { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid', language: 'es' },
      { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome', language: 'it' },
      { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam', language: 'nl' },
      { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich', language: 'de' },
      { code: 'SE', name: 'Sweden', currency: 'SEK', timezone: 'Europe/Stockholm', language: 'sv' },
      { code: 'NO', name: 'Norway', currency: 'NOK', timezone: 'Europe/Oslo', language: 'no' },
      { code: 'DK', name: 'Denmark', currency: 'DKK', timezone: 'Europe/Copenhagen', language: 'da' },
      { code: 'PT', name: 'Portugal', currency: 'EUR', timezone: 'Europe/Lisbon', language: 'pt' },
      { code: 'IE', name: 'Ireland', currency: 'EUR', timezone: 'Europe/Dublin', language: 'en' },
      { code: 'PL', name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw', language: 'pl' },
      { code: 'CZ', name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague', language: 'cs' },
      { code: 'AT', name: 'Austria', currency: 'EUR', timezone: 'Europe/Vienna', language: 'de' },
      { code: 'BE', name: 'Belgium', currency: 'EUR', timezone: 'Europe/Brussels', language: 'nl' },
      { code: 'GR', name: 'Greece', currency: 'EUR', timezone: 'Europe/Athens', language: 'el' },

      // Americas
      { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo', language: 'pt' },
      { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City', language: 'es' },
      { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', language: 'es' },
      { code: 'CL', name: 'Chile', currency: 'CLP', timezone: 'America/Santiago', language: 'es' },
      { code: 'CO', name: 'Colombia', currency: 'COP', timezone: 'America/Bogota', language: 'es' },
      { code: 'PE', name: 'Peru', currency: 'PEN', timezone: 'America/Lima', language: 'es' },
      { code: 'VE', name: 'Venezuela', currency: 'VES', timezone: 'America/Caracas', language: 'es' },
      { code: 'EC', name: 'Ecuador', currency: 'USD', timezone: 'America/Guayaquil', language: 'es' },
      { code: 'JM', name: 'Jamaica', currency: 'JMD', timezone: 'America/Jamaica', language: 'en' },
      { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', timezone: 'America/Port_of_Spain', language: 'en' },
      { code: 'CR', name: 'Costa Rica', currency: 'CRC', timezone: 'America/Costa_Rica', language: 'es' },
      { code: 'PA', name: 'Panama', currency: 'PAB', timezone: 'America/Panama', language: 'es' },

      // Asia
      { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo', language: 'ja' },
      { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', language: 'en' },
      { code: 'HK', name: 'Hong Kong', currency: 'HKD', timezone: 'Asia/Hong_Kong', language: 'en' },
      { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', language: 'en' },
      { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok', language: 'th' },
      { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', language: 'hi' },
      { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai', language: 'zh' },
      { code: 'KR', name: 'South Korea', currency: 'KRW', timezone: 'Asia/Seoul', language: 'ko' },
      { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta', language: 'id' },
      { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila', language: 'en' },
      { code: 'VN', name: 'Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' },
      { code: 'BD', name: 'Bangladesh', currency: 'BDT', timezone: 'Asia/Dhaka', language: 'bn' },
      { code: 'PK', name: 'Pakistan', currency: 'PKR', timezone: 'Asia/Karachi', language: 'ur' },
      { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo', language: 'si' },
      { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', language: 'ar' },
      { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh', language: 'ar' },
      { code: 'QA', name: 'Qatar', currency: 'QAR', timezone: 'Asia/Qatar', language: 'ar' },
      { code: 'KW', name: 'Kuwait', currency: 'KWD', timezone: 'Asia/Kuwait', language: 'ar' },
      { code: 'TR', name: 'Turkey', currency: 'TRY', timezone: 'Europe/Istanbul', language: 'tr' },
      { code: 'IL', name: 'Israel', currency: 'ILS', timezone: 'Asia/Jerusalem', language: 'he' },

      // Oceania
      { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland', language: 'en' },
      { code: 'FJ', name: 'Fiji', currency: 'FJD', timezone: 'Pacific/Fiji', language: 'en' },
      { code: 'PG', name: 'Papua New Guinea', currency: 'PGK', timezone: 'Pacific/Port_Moresby', language: 'en' },
      { code: 'SB', name: 'Solomon Islands', currency: 'SBD', timezone: 'Pacific/Guadalcanal', language: 'en' },
      { code: 'WS', name: 'Samoa', currency: 'WST', timezone: 'Pacific/Apia', language: 'sm' },
      { code: 'TO', name: 'Tonga', currency: 'TOP', timezone: 'Pacific/Tongatapu', language: 'to' },
    ];
    
    setCountries(countryList);
    setFilteredCountries(countryList);
  };

  const handleCountrySelect = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedCountry = countries.find(c => c.name === value);

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      key={item.code}
      style={[styles.countryItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleCountrySelect(item)}
    >
      <View>
        <Text style={[styles.countryName, { color: theme.colors.text }]}>{item.name}</Text>
        <Text style={[styles.countryDetails, { color: theme.colors.textSecondary }]}>
          {item.code} • {item.currency}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.triggerButton, { 
          backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        }]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.triggerText, { color: theme.colors.text }]}>
          {selectedCountry ? selectedCountry.name : 'Select your country'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Modal with Search */}
      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Country</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchContainer, { 
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
            }]}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search countries..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            {/* Country List */}
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {filteredCountries.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No countries found
                </Text>
              ) : (
                filteredCountries.map((item) => renderCountryItem({ item }))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginVertical: 8,
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  countryItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  countryDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
});

export default CountrySelector;
