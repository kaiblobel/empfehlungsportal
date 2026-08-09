const MAX_AUDIO_BYTES = 3_200_000;

export function cleanCoachLines(value, maxItems = 12) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, maxItems);
}

export function coachLinesText(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).join('\n') : '';
}

export async function coachRequest(fetchFn, token, action, payload = {}) {
  if (!token) return { ok: false, reason: 'login_required' };
  try {
    const response = await fetchFn('/api/potenzial-coach', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    return { ...data, ok: response.ok && data.ok === true, status: response.status };
  } catch (_) {
    return { ok: false, reason: 'network_error', status: 0 };
  }
}

export async function blobToBase64(blob) {
  if (!(blob instanceof Blob) || !blob.size || blob.size > MAX_AUDIO_BYTES) throw new Error('audio_too_large');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export class PotentialVoiceRecorder {
  constructor(mediaDevices = navigator.mediaDevices, Recorder = MediaRecorder) {
    this.mediaDevices = mediaDevices;
    this.Recorder = Recorder;
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
  }

  async start() {
    if (!this.mediaDevices?.getUserMedia || !this.Recorder) throw new Error('microphone_unavailable');
    this.stream = await this.mediaDevices.getUserMedia({ audio: true });
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => this.Recorder.isTypeSupported?.(type));
    this.chunks = [];
    this.recorder = preferred ? new this.Recorder(this.stream, { mimeType: preferred }) : new this.Recorder(this.stream);
    this.recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) this.chunks.push(event.data); });
    this.recorder.start(500);
  }

  stop() {
    if (!this.recorder || this.recorder.state !== 'recording') return Promise.reject(new Error('not_recording'));
    return new Promise((resolve, reject) => {
      this.recorder.addEventListener('stop', () => {
        const type = String(this.recorder.mimeType || this.chunks[0]?.type || 'audio/webm').split(';')[0];
        const blob = new Blob(this.chunks, { type });
        this.release();
        if (!blob.size || blob.size > MAX_AUDIO_BYTES) reject(new Error('audio_too_large'));
        else resolve({ blob, mimeType: type });
      }, { once: true });
      this.recorder.stop();
    });
  }

  cancel() {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.release();
  }

  release() {
    this.stream?.getTracks?.().forEach((track) => track.stop());
    this.stream = null;
  }
}

export function addDaysIso(days, now = new Date()) {
  const value = new Date(now);
  value.setDate(value.getDate() + Math.max(0, Number(days) || 0));
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
