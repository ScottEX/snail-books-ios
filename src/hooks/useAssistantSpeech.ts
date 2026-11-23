import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';
import { getLang } from '../i18n';

const recognition = Platform.OS === 'ios'
  ? requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>('ExpoSpeechRecognition')
  : null;

type SpeechPhase = 'idle' | 'permission' | 'starting' | 'listening' | 'stopping';

export function useAssistantSpeech(enabled: boolean, onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<SpeechPhase>('idle');
  const [error, setError] = useState('');
  const phase = useRef<SpeechPhase>('idle');
  const generation = useRef(0);
  const onResult = useRef(onTranscript);
  onResult.current = onTranscript;

  const updatePhase = (next: SpeechPhase) => {
    phase.current = next;
    setStatus(next);
  };

  const cancel = () => {
    generation.current += 1;
    const shouldAbort = phase.current !== 'idle' && phase.current !== 'permission';
    updatePhase('idle');
    if (shouldAbort) recognition?.abort();
    setError('');
  };

  useEffect(() => {
    if (!enabled || !recognition) return;
    const finish = () => {
      if (phase.current === 'permission') return;
      updatePhase('idle');
    };
    const listeners = [
      recognition.addListener('audiostart', () => {
        if (phase.current === 'starting') updatePhase('listening');
      }),
      recognition.addListener('result', ({ results }) => {
        if (phase.current === 'idle' || phase.current === 'permission') return;
        const text = results[0]?.transcript.trim();
        if (text) onResult.current(text);
      }),
      recognition.addListener('end', finish),
      recognition.addListener('error', ({ error: code }) => {
        if (phase.current !== 'idle' && phase.current !== 'permission') {
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
    if (!recognition || !enabled || phase.current === 'stopping' || phase.current === 'starting') return;
    if (phase.current === 'listening') {
      updatePhase('stopping');
      recognition.stop();
      return;
    }
    if (phase.current === 'permission') return;
    setError('');
    updatePhase('permission');
    const attempt = ++generation.current;
    try {
      if (!recognition.isRecognitionAvailable()) {
        setError('assistantSpeechFailed');
      } else {
        const permissions = await recognition.requestPermissionsAsync();
        if (attempt !== generation.current) return;
        if (permissions.granted) {
          const lang = getLang();
          updatePhase('starting');
          recognition.start({
            lang: lang === 'en' ? 'en-US' : lang,
            interimResults: true,
            iosTaskHint: 'dictation',
            contextualStrings: lang === 'en' ? ['today', 'yesterday', 'WeChat Pay', 'Alipay']
              : ['今天', '昨天', '前天', '微信', lang === 'zh-TW' ? '支付寶' : '支付宝'],
          });
          return;
        }
        setError('assistantSpeechPermission');
      }
    } catch {
      if (attempt === generation.current) setError('assistantSpeechFailed');
    }
    if (attempt === generation.current) updatePhase('idle');
  };

  return { available: !!recognition, active: status !== 'idle', status, error, toggle, cancel };
}
