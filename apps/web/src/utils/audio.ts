/**
 * Generates a pleasant, zero-dependency synthetic notification chime using the Web Audio API.
 * This ensures high performance without needing to load external MP3 files.
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Create two oscillators for a richer "bell" sound (A5 and E6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Frequencies
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6

    // Envelope (Attack, Decay)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
};