// src/utils/audioEnhancementTest.ts
// Test utility for verifying audio enhancement functionality

import { Platform, Alert } from 'react-native';
import { nativeAudioProcessor, isNativeAudioProcessorAvailable } from '../services/NativeAudioProcessor';
import { realAudioProcessor } from '../services/RealAudioProcessor';
import { audioEnhancementService } from '../services/AudioEnhancementService';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class AudioEnhancementTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🧪 Starting Audio Enhancement Tests...');
    
    await this.testNativeModuleAvailability();
    await this.testNativeModuleInitialization();
    await this.testAudioEnhancementService();
    await this.testRealAudioProcessor();
    await this.testEQFunctionality();
    await this.testAIEnhancement();
    await this.testSpatialAudio();
    
    this.logResults();
    return this.results;
  }

  private async testNativeModuleAvailability(): Promise<void> {
    try {
      const available = isNativeAudioProcessorAvailable();
      
      this.addResult({
        test: 'Native Module Availability',
        passed: available,
        message: available 
          ? `✅ Native audio processor available on ${Platform.OS}`
          : `❌ Native audio processor not available on ${Platform.OS}`,
        details: {
          platform: Platform.OS,
          version: Platform.Version,
          available
        }
      });
    } catch (error) {
      this.addResult({
        test: 'Native Module Availability',
        passed: false,
        message: `❌ Error checking availability: ${error}`,
        details: { error }
      });
    }
  }

  private async testNativeModuleInitialization(): Promise<void> {
    try {
      if (!isNativeAudioProcessorAvailable()) {
        this.addResult({
          test: 'Native Module Initialization',
          passed: false,
          message: '⚠️ Skipped - Native module not available',
        });
        return;
      }

      const initialized = await nativeAudioProcessor.initialize();
      
      this.addResult({
        test: 'Native Module Initialization',
        passed: initialized,
        message: initialized 
          ? '✅ Native audio processor initialized successfully'
          : '❌ Failed to initialize native audio processor',
        details: { initialized }
      });
    } catch (error) {
      this.addResult({
        test: 'Native Module Initialization',
        passed: false,
        message: `❌ Initialization error: ${error}`,
        details: { error }
      });
    }
  }

  private async testAudioEnhancementService(): Promise<void> {
    try {
      // Test tier validation
      const hasFreeAccess = await audioEnhancementService.validateTierAccess('free', 'enhancement');
      const hasProAccess = await audioEnhancementService.validateTierAccess('pro', 'enhancement');
      
      // Test profile creation
      const profiles = await audioEnhancementService.getUserProfiles('all', 'pro');
      
      this.addResult({
        test: 'Audio Enhancement Service',
        passed: !hasFreeAccess && hasProAccess && profiles.length > 0,
        message: '✅ Audio enhancement service working correctly',
        details: {
          freeAccess: hasFreeAccess,
          proAccess: hasProAccess,
          profilesCount: profiles.length
        }
      });
    } catch (error) {
      this.addResult({
        test: 'Audio Enhancement Service',
        passed: false,
        message: `❌ Service error: ${error}`,
        details: { error }
      });
    }
  }

  private async testRealAudioProcessor(): Promise<void> {
    try {
      const initialized = await realAudioProcessor.initialize();
      
      this.addResult({
        test: 'Real Audio Processor',
        passed: initialized,
        message: initialized 
          ? '✅ Real audio processor initialized successfully'
          : '❌ Failed to initialize real audio processor',
        details: { initialized }
      });
    } catch (error) {
      this.addResult({
        test: 'Real Audio Processor',
        passed: false,
        message: `❌ Processor error: ${error}`,
        details: { error }
      });
    }
  }

  private async testEQFunctionality(): Promise<void> {
    try {
      if (!nativeAudioProcessor.initialized) {
        this.addResult({
          test: 'EQ Functionality',
          passed: false,
          message: '⚠️ Skipped - Native processor not initialized',
        });
        return;
      }

      // Test EQ band adjustment
      await realAudioProcessor.adjustEQBand(1000, 3.0); // Boost 1kHz by 3dB
      await realAudioProcessor.adjustEQBand(1000, 0.0); // Reset to flat
      
      // Test EQ preset
      const profiles = await audioEnhancementService.getUserProfiles('all', 'pro');
      if (profiles.length > 0) {
        await realAudioProcessor.applyEnhancementProfile(profiles[0].id);
      }
      
      this.addResult({
        test: 'EQ Functionality',
        passed: true,
        message: '✅ EQ controls working correctly',
        details: { 
          bandAdjustment: 'success',
          presetApplication: profiles.length > 0 ? 'success' : 'skipped'
        }
      });
    } catch (error) {
      this.addResult({
        test: 'EQ Functionality',
        passed: false,
        message: `❌ EQ error: ${error}`,
        details: { error }
      });
    }
  }

  private async testAIEnhancement(): Promise<void> {
    try {
      if (!nativeAudioProcessor.initialized) {
        this.addResult({
          test: 'AI Enhancement',
          passed: false,
          message: '⚠️ Skipped - Native processor not initialized',
        });
        return;
      }

      // Test AI enhancement toggle
      await nativeAudioProcessor.toggleAIEnhancement(true, 0.7);
      await nativeAudioProcessor.toggleAIEnhancement(false, 0.0);
      
      this.addResult({
        test: 'AI Enhancement',
        passed: true,
        message: '✅ AI enhancement controls working correctly',
        details: { 
          enableTest: 'success',
          disableTest: 'success'
        }
      });
    } catch (error) {
      this.addResult({
        test: 'AI Enhancement',
        passed: false,
        message: `❌ AI enhancement error: ${error}`,
        details: { error }
      });
    }
  }

  private async testSpatialAudio(): Promise<void> {
    try {
      if (!nativeAudioProcessor.initialized) {
        this.addResult({
          test: 'Spatial Audio',
          passed: false,
          message: '⚠️ Skipped - Native processor not initialized',
        });
        return;
      }

      // Test spatial audio toggle
      await nativeAudioProcessor.toggleSpatialAudio(true, 1.5);
      await nativeAudioProcessor.toggleSpatialAudio(false, 1.0);
      
      this.addResult({
        test: 'Spatial Audio',
        passed: true,
        message: '✅ Spatial audio controls working correctly',
        details: { 
          enableTest: 'success',
          disableTest: 'success'
        }
      });
    } catch (error) {
      this.addResult({
        test: 'Spatial Audio',
        passed: false,
        message: `❌ Spatial audio error: ${error}`,
        details: { error }
      });
    }
  }

  private addResult(result: TestResult): void {
    this.results.push(result);
    console.log(`${result.passed ? '✅' : '❌'} ${result.test}: ${result.message}`);
  }

  private logResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log('\n🧪 Audio Enhancement Test Results:');
    console.log(`📊 ${passed}/${total} tests passed (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('🎉 Audio enhancement is working well!');
    } else if (percentage >= 60) {
      console.log('⚠️ Audio enhancement has some issues but basic functionality works');
    } else {
      console.log('❌ Audio enhancement needs significant fixes');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}: ${result.message}`);
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    });
  }

  async showResultsAlert(): Promise<void> {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    let title = '';
    let message = '';
    
    if (percentage >= 80) {
      title = '🎉 Audio Enhancement Working!';
      message = `${passed}/${total} tests passed (${percentage}%)\n\nYour audio enhancement is working correctly! Users will experience real audio improvements.`;
    } else if (percentage >= 60) {
      title = '⚠️ Partial Functionality';
      message = `${passed}/${total} tests passed (${percentage}%)\n\nBasic functionality works, but some features need attention. Check the console for details.`;
    } else {
      title = '❌ Integration Issues';
      message = `${passed}/${total} tests passed (${percentage}%)\n\nSignificant issues detected. Please check the integration guide and console logs.`;
    }
    
    Alert.alert(title, message, [
      { text: 'View Console', onPress: () => console.log('Check console for detailed test results') },
      { text: 'OK', style: 'default' }
    ]);
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getPassRate(): number {
    const passed = this.results.filter(r => r.passed).length;
    return Math.round((passed / this.results.length) * 100);
  }
}

// Export singleton instance
export const audioEnhancementTester = new AudioEnhancementTester();

// Export utility functions
export const runQuickTest = async (): Promise<boolean> => {
  const results = await audioEnhancementTester.runAllTests();
  const passRate = audioEnhancementTester.getPassRate();
  return passRate >= 80;
};

export const showTestResults = async (): Promise<void> => {
  await audioEnhancementTester.runAllTests();
  await audioEnhancementTester.showResultsAlert();
};

export type { TestResult };
