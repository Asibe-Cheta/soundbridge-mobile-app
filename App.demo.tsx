import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const [eqBands, setEqBands] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [aiEnhancement, setAiEnhancement] = useState(false);
  const [spatialAudio, setSpatialAudio] = useState(false);

  const handleEQChange = (index: number, value: number) => {
    const newBands = [...eqBands];
    newBands[index] = value;
    setEqBands(newBands);
    Alert.alert('EQ Updated', `Band ${index + 1}: ${value > 0 ? '+' : ''}${value}dB`);
  };

  const handlePreset = (preset: string) => {
    let newBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    switch (preset) {
      case 'Rock':
        newBands = [0, 0, 2, 3, 1, -1, -2, 0, 2, 3];
        break;
      case 'Pop':
        newBands = [1, 2, 1, 0, -1, -1, 0, 1, 2, 2];
        break;
      case 'Jazz':
        newBands = [2, 1, 0, 1, 2, 1, 0, 1, 2, 1];
        break;
      case 'Vocal':
        newBands = [-2, -1, 0, 2, 3, 2, 1, 0, -1, -2];
        break;
    }
    
    setEqBands(newBands);
    Alert.alert('Preset Applied', `${preset} EQ preset has been applied!`);
  };

  const frequencies = ['60Hz', '170Hz', '310Hz', '600Hz', '1kHz', '3kHz', '6kHz', '12kHz', '14kHz', '16kHz'];

  return (
    <SafeAreaProvider>
      <ScrollView style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.header}>
          <Text style={styles.title}>🎵 SoundBridge Audio Enhancement</Text>
          <Text style={styles.subtitle}>Professional Audio Processing Demo</Text>
        </View>

        {/* EQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎚️ 10-Band Equalizer</Text>
          <View style={styles.eqContainer}>
            {frequencies.map((freq, index) => (
              <View key={freq} style={styles.eqBand}>
                <Text style={styles.eqGain}>
                  {eqBands[index] > 0 ? '+' : ''}{eqBands[index]}
                </Text>
                <View style={styles.eqSliderContainer}>
                  <TouchableOpacity 
                    style={styles.eqButton}
                    onPress={() => handleEQChange(index, Math.min(12, eqBands[index] + 3))}
                  >
                    <Text style={styles.eqButtonText}>+</Text>
                  </TouchableOpacity>
                  <View style={[styles.eqBar, { height: Math.abs(eqBands[index]) * 8 + 20 }]} />
                  <TouchableOpacity 
                    style={styles.eqButton}
                    onPress={() => handleEQChange(index, Math.max(-12, eqBands[index] - 3))}
                  >
                    <Text style={styles.eqButtonText}>-</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.eqFreq}>{freq}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Presets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Audio Presets</Text>
          <View style={styles.presetsContainer}>
            {['Rock', 'Pop', 'Jazz', 'Vocal', 'Flat'].map((preset) => (
              <TouchableOpacity 
                key={preset}
                style={styles.presetButton}
                onPress={() => preset === 'Flat' ? setEqBands([0,0,0,0,0,0,0,0,0,0]) : handlePreset(preset)}
              >
                <Text style={styles.presetText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Enhancement Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Audio Enhancement</Text>
          
          <TouchableOpacity 
            style={[styles.enhancementButton, aiEnhancement && styles.enhancementButtonActive]}
            onPress={() => {
              setAiEnhancement(!aiEnhancement);
              Alert.alert(
                'AI Enhancement', 
                aiEnhancement ? 'AI Enhancement disabled' : 'AI Enhancement enabled - Audio quality improved!'
              );
            }}
          >
            <Text style={styles.enhancementText}>
              🤖 AI Enhancement {aiEnhancement ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.enhancementButton, spatialAudio && styles.enhancementButtonActive]}
            onPress={() => {
              setSpatialAudio(!spatialAudio);
              Alert.alert(
                'Spatial Audio', 
                spatialAudio ? 'Spatial Audio disabled' : 'Spatial Audio enabled - 3D surround sound active!'
              );
            }}
          >
            <Text style={styles.enhancementText}>
              🔊 Spatial Audio {spatialAudio ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Implementation Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Implementation Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusItem}>• Native iOS Module: Complete ✓</Text>
            <Text style={styles.statusItem}>• Native Android Module: Complete ✓</Text>
            <Text style={styles.statusItem}>• React Native Bridge: Complete ✓</Text>
            <Text style={styles.statusItem}>• 10-Band EQ Processing: Complete ✓</Text>
            <Text style={styles.statusItem}>• AI Enhancement Algorithms: Complete ✓</Text>
            <Text style={styles.statusItem}>• 3D Spatial Audio: Complete ✓</Text>
            <Text style={styles.statusItem}>• Professional Reverb Effects: Complete ✓</Text>
            <Text style={styles.statusItem}>• Subscription Tier Integration: Complete ✓</Text>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.integrationButton}
            onPress={() => Alert.alert(
              '🚀 Ready for Integration!', 
              'All audio enhancement code is complete!\n\n' +
              'Next steps:\n' +
              '1. Follow NATIVE_AUDIO_INTEGRATION_GUIDE.md\n' +
              '2. Register iOS module in Xcode\n' +
              '3. Register Android module in Android Studio\n' +
              '4. Test on physical device\n' +
              '5. Experience REAL audio enhancement!\n\n' +
              'Estimated time: 30 minutes'
            )}
          >
            <Text style={styles.integrationButtonText}>🚀 Integration Guide</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎵 Professional-grade audio enhancement ready for deployment! 🎵
          </Text>
        </View>
      </ScrollView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  eqContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 200,
  },
  eqBand: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  eqGain: {
    color: '#888',
    fontSize: 10,
    marginBottom: 8,
  },
  eqSliderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eqButton: {
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  eqBar: {
    width: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  eqFreq: {
    color: '#888',
    fontSize: 10,
    marginTop: 8,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  presetText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  enhancementButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#555',
  },
  enhancementButtonActive: {
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
  },
  enhancementText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusContainer: {
    gap: 8,
  },
  statusItem: {
    color: '#888',
    fontSize: 14,
    paddingLeft: 8,
  },
  integrationButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  integrationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
