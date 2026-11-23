import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';
import { getLang } from '../i18n';

const recognition = Platform.OS === 'ios'
  ? requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>('ExpoSpeechRecognition')
  : null;

export function useAssistantSpeech(enabled: boolean, onTranscript: (text: string) => void) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const phase = useRef<'idle' | 'permission' | 'listening' | 'stopping'>('idle');
  const generation = useRef(0);
  const onResult = useRef(onTranscript);
  onResult.current = onTranscript;

  const cancel = () => {
    generation.current += 1;
    const shouldAbort = phase.current === 'listening' || phase.current === 'stopping';
    phase.current = 'idle';
    if (shouldAbort) recognition?.abort();
    setActive(false);
    setError('');
  };

  useEffect(() => {
    if (!enabled || !recognition) return;
    const finish = () => {
      if (phase.current === 'permission') return;
      phase.current = 'idle';
      setActive(false);
    };
    const listeners = [
      recognition.addListener('result', ({ results }) => {
        if (phase.current !== 'listening' && phase.current !== 'stopping') return;
        const text = results[0]?.transcript.trim();
        if (text) onResult.current(text);
      }),
      recognition.addListener('end', finish),
      recognition.addListener('error', ({ error: code }) => {
        if (phase.current === 'listening' || phase.current === 'stopping') {
          if (code !== 'aborted') setError('assistantSpeechFailed');
          finish();
        }
      }),
    ];
    return () => {
      listeners.forEach(listener => listener.remove());
      cancel();
    };
  }, [enabled]);

  const toggle = async () => {
    if (!recognition || !enabled || phase.current === 'stopping') return;
    if (phase.current === 'listening') {
      phase.current = 'stopping';
      recognition.stop();
      return;
    }
    if (phase.current === 'permission') return;
    setError('');
    setActive(true);
    phase.current = 'permission';
    const attempt = ++generation.current;
    try {
      if (!recognition.isRecognitionAvailable()) {
        setError('assistantSpeechFailed');
      } else {
        const permissions = await recognition.requestPermissionsAsync();
        if (attempt !== generation.current) return;
        if (permissions.granted) {
          const lang = getLang();
          phase.current = 'listening';
          recognition.start({ lang: lang === 'en' ? 'en-US' : lang, interimResults: true, iosTaskHint: 'dictation' });
          return;
        }
        setError('assistantSpeechPermission');
      }
    } catch {
      if (attempt === generation.current) setError('assistantSpeechFailed');
    }
    if (attempt === generation.current) {
      phase.current = 'idle';
      setActive(false);
    }
  };

  return { available: !!recognition, active, error, toggle, cancel };
}
