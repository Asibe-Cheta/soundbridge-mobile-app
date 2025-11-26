import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logStore, type LogEntry } from '../utils/logStore';

interface LoginDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function LoginDebugPanel({ visible, onClose }: LoginDebugPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!visible) {
      // Load logs when panel opens
      setLogs(logStore.getLogs());
      return;
    }

    // Subscribe to new logs
    const unsubscribe = logStore.subscribe(() => {
      setLogs(logStore.getLogs());
    });

    // Initial load
    setLogs(logStore.getLogs());

    return unsubscribe;
  }, [visible]);

  const clearLogs = () => {
    logStore.clearLogs();
    setLogs([]);
  };

  const copyAllLogs = () => {
    const allLogsText = filteredLogs.map(log => {
      return `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
    }).join('\n');
    
    Clipboard.setString(allLogsText);
    Alert.alert('Copied!', `Copied ${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''} to clipboard`);
  };

  const copyLog = (log: LogEntry) => {
    const logText = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
    Clipboard.setString(logText);
    Alert.alert('Copied!', 'Log entry copied to clipboard');
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '#FF6B6B';
      case 'warn': return '#F59E0B';
      case 'info': return '#4ECDC4';
      default: return '#FFFFFF';
    }
  };

  const filteredLogs = filter ? logStore.getFilteredLogs(filter) : logs;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Login Debug Logs</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={copyAllLogs} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.filterInput}
            placeholder="Filter logs..."
            placeholderTextColor="#999"
            value={filter}
            onChangeText={setFilter}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <ScrollView 
          style={styles.logsContainer}
          contentContainerStyle={styles.logsContent}
        >
          {filteredLogs.length === 0 ? (
            <Text style={styles.emptyText}>
              {logs.length === 0 
                ? 'No logs yet. Try logging in to see debug information.'
                : `No logs match "${filter}"`
              }
            </Text>
          ) : (
            filteredLogs.map((log) => (
              <View key={log.id} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
                      {log.level.toUpperCase()}
                    </Text>
                    <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => copyLog(log)} 
                    style={styles.copyLogButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="copy-outline" size={16} color="#4ECDC4" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {filteredLogs.length} of {logs.length} log{logs.length !== 1 ? 's' : ''}
            {filter && ` (filtered)`}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  copyButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  filterInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  logsContainer: {
    flex: 1,
  },
  logsContent: {
    padding: 16,
  },
  logEntry: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  copyLogButton: {
    padding: 4,
    marginLeft: 8,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#999',
  },
  logMessage: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1A1A1A',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});

