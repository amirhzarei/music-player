import { useEffect, useRef } from 'react';
import { usePlayer } from '../state/playerState.js';

interface WaveformConfig {
    bars: number;
    channelMode: 'mix' | 'left' | 'right';
    normalize: boolean;
    minAmplitude: number; // below this |sample| is treated as 0 to kill DC noise
}

const DEFAULT_CONFIG: WaveformConfig = {
    bars: 400,
    channelMode: 'mix',
    normalize: true,
    minAmplitude: 1e-5
};

interface ScannerInternal {
    audioContext?: AudioContext;
}

function ensureContext(ref: ScannerInternal): AudioContext {
    if (!ref.audioContext) {
        ref.audioContext = new AudioContext();
    }
    return ref.audioContext;
}

function computePeaks(
    pcm: Float32Array[],
    bars: number,
    config: WaveformConfig
): number[] {
    const length = pcm[0].length;
    if (!length || bars <= 0) return [];

    const step = length / bars;
    const peaks: number[] = new Array(bars * 2);

    let globalMax = 0;

    for (let i = 0; i < bars; i++) {
        const start = Math.floor(i * step);
        const end = Math.min(length, Math.floor((i + 1) * step));
        let min = 1;
        let max = -1;

        for (let s = start; s < end; s++) {
            let sample: number;
            if (config.channelMode === 'mix') {
                let sum = 0;
                for (let c = 0; c < pcm.length; c++) sum += pcm[c][s] || 0;
                sample = sum / pcm.length;
            } else if (config.channelMode === 'left') {
                sample = pcm[0][s] || 0;
            } else {
                sample = (pcm[1] || pcm[0])[s] || 0;
            }

            if (Math.abs(sample) < config.minAmplitude) sample = 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
        }

        if (min === 1 && max === -1) {
            min = 0;
            max = 0;
        }

        peaks[i * 2] = min;
        peaks[i * 2 + 1] = max;
        if (Math.abs(min) > globalMax) globalMax = Math.abs(min);
        if (Math.abs(max) > globalMax) globalMax = Math.abs(max);
    }

    if (config.normalize && globalMax > 0) {
        for (let i = 0; i < peaks.length; i++) {
            peaks[i] = peaks[i] / globalMax;
        }
    }

    return peaks;
}

async function generateWaveform(
    arrayBuffer: ArrayBuffer,
    ctx: AudioContext,
    config: WaveformConfig
): Promise<{ peaks: number[]; bars: number }> {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        channels.push(audioBuffer.getChannelData(c));
    }
    const peaks = computePeaks(channels, config.bars, config);
    return { peaks, bars: config.bars };
}

export function useWaveformScanner() {
    const { state, dispatch } = usePlayer();
    const busyRef = useRef(false);
    const doneRef = useRef<Set<string>>(new Set());
    const ctxRef = useRef<ScannerInternal>({});

    useEffect(() => {
        if (busyRef.current) return;

        // Find first track without waveform data and not marked done
        const target = state.queue.find(
            (t) =>
                !t.waveform &&
                !doneRef.current.has(t.id) &&
                // Avoid trying huge remote streams if type not decodable
                (t.type?.startsWith('audio/') || t.src.startsWith('blob:'))
        );

        if (!target) return;

        busyRef.current = true;

        const run = async () => {
            try {
                const resp = await fetch(target.src);
                const buf = await resp.arrayBuffer();

                const ctx = ensureContext(ctxRef.current);

                // If context was suspended (iOS after load), attempt resume
                if (ctx.state === 'suspended') {
                    try {
                        await ctx.resume();
                    } catch {
                        /* ignore */
                    }
                }

                const { peaks, bars } = await generateWaveform(
                    buf,
                    ctx,
                    DEFAULT_CONFIG
                );

                dispatch({
                    type: 'UPDATE_TRACK',
                    trackId: target.id,
                    patch: {
                        waveform: {
                            version: 1,
                            bars,
                            peaks
                        }
                    }
                });
            } catch {
                // mark as done to avoid endless retries
            } finally {
                doneRef.current.add(target.id);
                busyRef.current = false;
            }
        };

        run();
    }, [state.queue, dispatch]);
}

export const WaveformScannerBinding: React.FC = () => {
    useWaveformScanner();
    return null;
};