/**
 * AudioWorklet для захвата и подготовки PCM 16kHz Mono.
 * Protocol v2.1: ресемплинг 44.1/48kHz → 16kHz, Float32 → Int16, буфер 20ms (320 сэмплов).
 */
const TARGET_SAMPLE_RATE = 16000;
const FRAME_SIZE = 320; // 20ms @ 16kHz

class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const inputRate = options.processorOptions?.sampleRate || 48000;
    this.ratio = inputRate / TARGET_SAMPLE_RATE;
    this.buffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer.push(channel[i]);
    }

    const neededInput = Math.ceil(FRAME_SIZE * this.ratio);
    while (this.buffer.length >= neededInput) {
      const chunk = this.buffer.splice(0, neededInput);
      const pcm16 = new Int16Array(FRAME_SIZE);

      for (let i = 0; i < FRAME_SIZE; i++) {
        const srcIdx = i * this.ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(idx0 + 1, chunk.length - 1);
        const frac = srcIdx - idx0;
        const v0 = chunk[idx0] ?? 0;
        const v1 = chunk[idx1] ?? v0;
        const s = v0 + frac * (v1 - v0);
        const clamped = Math.max(-1, Math.min(1, s));
        pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      }

      this.port.postMessage(pcm16.buffer);
    }

    return true;
  }
}

registerProcessor('voice-capture-processor', VoiceCaptureProcessor);
