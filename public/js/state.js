/**
 * Global reactive State Store for Speak2Fill.
 * Emits change events when state updates to re-render screens seamlessly.
 */
class StateStore {
  constructor() {
    this.state = {
      currentScreen: 'language', // 'language' | 'upload' | 'detecting' | 'voice' | 'review' | 'history'
      language: localStorage.getItem('s2f_language') || 'ml', // Default to Malayalam as per prompt primary focus or user choice
      textSize: localStorage.getItem('s2f_text_size') || 'normal', // 'normal' | 'large' | 'xlarge'
      darkMode: localStorage.getItem('s2f_dark_mode') === 'true',
      userId: this._getOrCreateUserId(),
      activeTemplate: null,
      activeSession: null,
      currentFieldIndex: 0,
      isRecording: false,
      isSpeaking: false,
      voiceStatus: 'idle', // 'idle' | 'prompting' | 'listening' | 'processing' | 'confirming'
      lastSpokenTranscript: '',
      currentValue: '',
      allSessions: []
    };

    this.listeners = new Set();
  }

  _getOrCreateUserId() {
    let id = localStorage.getItem('s2f_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('s2f_user_id', id);
    }
    return id;
  }

  get() {
    return this.state;
  }

  set(partial) {
    this.state = { ...this.state, ...partial };

    if (partial.language !== undefined) {
      localStorage.setItem('s2f_language', partial.language);
    }
    if (partial.textSize !== undefined) {
      localStorage.setItem('s2f_text_size', partial.textSize);
    }
    if (partial.darkMode !== undefined) {
      localStorage.setItem('s2f_dark_mode', partial.darkMode);
    }
    if (partial.activeSession !== undefined && partial.activeSession?._id) {
      localStorage.setItem('s2f_active_session_id', partial.activeSession._id);
    }

    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State subscriber error:', err);
      }
    }
  }
}

export const stateStore = new StateStore();
