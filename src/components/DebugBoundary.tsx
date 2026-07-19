import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../theme';

interface State { error: Error | null; }

export class DebugBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('DEBUG_BOUNDARY', error.message, '\nCOMPONENT_STACK:\n' + info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: FONTS.body.size, fontWeight: 'bold' }}>CRASH: {this.state.error.message}</Text>
          <Text style={{ color: 'red', fontSize: FONTS.tiny.size, marginTop: 12 }}>{String(this.state.error.stack || '').split('\n').slice(0, 8).join('\n')}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
