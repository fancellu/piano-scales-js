// Small Web Audio synth with several instrument presets, a limiter and optional reverb.
// Exposes window.Synth = { init, noteOn, play, setInstrument, setReverb, instruments }.
// noteOn() returns a voice with stop(atTime, fast) so held MIDI notes can sustain.
(function () {
    let ctx = null;
    let input = null;      // all voices connect here
    let wetGain = null;    // reverb send level
    let noiseBuffer = null;
    let instrument = 'piano';
    let reverbOn = true;

    // --- Master chain: input -> (dry + reverb) -> limiter -> speakers ---
    function init(audioContext) {
        if (ctx === audioContext) return;
        ctx = audioContext;

        input = ctx.createGain();
        input.gain.value = 0.9;

        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -14;
        limiter.knee.value = 10;
        limiter.ratio.value = 6;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        limiter.connect(ctx.destination);

        input.connect(limiter);

        const convolver = ctx.createConvolver();
        convolver.buffer = makeImpulseResponse(2.4, 3.2);
        wetGain = ctx.createGain();
        wetGain.gain.value = reverbOn ? 0.28 : 0;
        input.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(limiter);

        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuffer.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // Synthetic room: decaying stereo noise
    function makeImpulseResponse(seconds, decay) {
        const len = Math.floor(ctx.sampleRate * seconds);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = ir.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }
        return ir;
    }

    // --- Building blocks ---
    function osc(voice, type, freq, when, detuneCents = 0) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, when);
        if (detuneCents) o.detune.setValueAtTime(detuneCents, when);
        o.start(when);
        voice.sources.push(o);
        return o;
    }

    function gain(value = 1) {
        const g = ctx.createGain();
        g.gain.value = value;
        return g;
    }

    function filter(type, freq, q = 0.7) {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        return f;
    }

    // --- Instrument presets ---
    // build(voice, freq, vel 0..1, when) wires sources into voice.out; returns release seconds.
    const PRESETS = {
        piano: {
            label: 'Grand Piano',
            level: 0.55,
            build(v, f, vel, t) {
                // Brightness filter that closes as the note decays
                const lp = filter('lowpass', Math.min(16000, f * (3 + 10 * vel)), 0.3);
                lp.frequency.setTargetAtTime(Math.min(16000, f * 2.5), t + 0.01, 0.5);
                lp.connect(v.out);

                // Lower notes ring longer
                const ring = Math.min(8, Math.max(1.5, 4.2 * Math.sqrt(261.63 / f)));
                const amps = [1, 0.55, 0.32, 0.2, 0.12, 0.07, 0.04];
                const B = 0.00035; // string inharmonicity
                amps.forEach((a, i) => {
                    const n = i + 1;
                    const fn = f * n * Math.sqrt(1 + B * n * n);
                    if (fn > 18000) return;
                    const g = gain(0);
                    const tau = ring / Math.pow(n, 0.8) / 6.9;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(a, t + 0.004);
                    g.gain.setTargetAtTime(a * 0.45, t + 0.004, 0.09);   // initial drop
                    g.gain.setTargetAtTime(0, t + 0.25, tau);            // long tail
                    g.connect(lp);
                    osc(v, 'sine', fn, t).connect(g);
                    // Second, slightly detuned string on the low partials for warmth
                    if (n <= 2) osc(v, 'sine', fn, t, n === 1 ? 1.8 : -1.5).connect(g);
                });

                // Hammer thump
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                const bp = filter('bandpass', Math.min(6000, f * 6), 0.8);
                const ng = gain(0);
                ng.gain.setValueAtTime(0.25 * vel, t);
                ng.gain.setTargetAtTime(0, t, 0.012);
                noise.connect(bp).connect(ng).connect(v.out);
                noise.start(t);
                noise.stop(t + 0.15); // self-terminating; not in v.sources so it can't trigger voice cleanup
                return 0.35;
            },
        },

        epiano: {
            label: 'Electric Piano',
            level: 0.9,
            build(v, f, vel, t) {
                // Two-operator FM (ratio 1) plus a quick high "tine" for the bell attack
                const carrier = osc(v, 'sine', f, t);
                const mod = osc(v, 'sine', f, t);
                const modDepth = gain(0);
                modDepth.gain.setValueAtTime(f * (0.6 + 2.2 * vel), t);
                modDepth.gain.setTargetAtTime(f * 0.2, t, 0.35);
                mod.connect(modDepth).connect(carrier.frequency);

                const tine = osc(v, 'sine', f * 14, t);
                const tineDepth = gain(0);
                tineDepth.gain.setValueAtTime(f * 0.7 * vel, t);
                tineDepth.gain.setTargetAtTime(0, t, 0.04);
                tine.connect(tineDepth).connect(carrier.frequency);

                const amp = gain(0);
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(1, t + 0.003);
                amp.gain.setTargetAtTime(0.5, t + 0.003, 0.4);
                amp.gain.setTargetAtTime(0, t + 0.8, 1.4);
                carrier.connect(amp).connect(v.out);
                return 0.3;
            },
        },

        organ: {
            label: 'Organ',
            level: 0.38,
            build(v, f, vel, t) {
                // Drawbar-style additive sines with a gentle tremolo
                const amp = gain(0);
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(1, t + 0.015);
                const trem = gain(0.9);
                const lfo = osc(v, 'sine', 5.6, t);
                const lfoDepth = gain(0.1);
                lfo.connect(lfoDepth).connect(trem.gain);
                amp.connect(trem).connect(v.out);

                [[0.5, 0.5], [1, 1], [1.5, 0.3], [2, 0.6], [3, 0.3], [4, 0.25]].forEach(([ratio, a]) => {
                    if (f * ratio > 16000) return;
                    const g = gain(a);
                    osc(v, 'sine', f * ratio, t).connect(g).connect(amp);
                });
                return 0.08;
            },
        },

        pluck: {
            label: 'Pluck / Harp',
            level: 0.6,
            build(v, f, vel, t) {
                const lp = filter('lowpass', 0, 2);
                lp.frequency.setValueAtTime(Math.min(16000, 400 + f * (3 + 8 * vel)), t);
                lp.frequency.setTargetAtTime(f * 1.2, t, 0.12);
                const amp = gain(0);
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(1, t + 0.002);
                amp.gain.setTargetAtTime(0, t + 0.002, 0.45 * Math.sqrt(261.63 / f) + 0.1);
                lp.connect(amp).connect(v.out);
                osc(v, 'sawtooth', f, t).connect(lp);
                osc(v, 'triangle', f * 2, t, 4).connect(lp);
                return 0.15;
            },
        },

        pad: {
            label: 'Warm Pad',
            level: 0.35,
            build(v, f, vel, t) {
                const lp = filter('lowpass', 1400 + 800 * vel, 0.5);
                const amp = gain(0);
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(1, t + 0.35);
                lp.connect(amp).connect(v.out);
                [-9, 0, 9].forEach(cents => osc(v, 'sawtooth', f, t, cents).connect(lp));
                return 0.7;
            },
        },

        classic: {
            label: 'Classic Triangle',
            level: 0.8,
            build(v, f, vel, t) {
                const amp = gain(0);
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(1, t + 0.01);
                amp.gain.linearRampToValueAtTime(0.6, t + 0.11);
                amp.connect(v.out);
                osc(v, 'triangle', f, t).connect(amp);
                return 0.3;
            },
        },
    };

    // --- Voices ---
    function noteOn(freq, velocity = 90, when) {
        if (!ctx) return null;
        const t = Math.max(when ?? ctx.currentTime, ctx.currentTime);
        const preset = PRESETS[instrument] || PRESETS.piano;
        const vel = Math.max(0, Math.min(1, velocity / 127));

        const voice = { sources: [], out: gain(), rel: gain(1), stopped: false, release: 0.3 };
        // Velocity curve and per-preset level so all instruments sit at a similar loudness
        voice.out.gain.value = preset.level * 0.22 * (0.25 + 0.75 * Math.pow(vel, 1.4));
        voice.out.connect(voice.rel).connect(input);
        voice.release = preset.build(voice, freq, vel, t);

        voice.stop = (at, fast = false) => {
            if (voice.stopped) return;
            voice.stopped = true;
            const s = Math.max(at ?? ctx.currentTime, ctx.currentTime);
            const rel = fast ? 0.02 : voice.release;
            voice.rel.gain.setValueAtTime(1, s);
            voice.rel.gain.setTargetAtTime(0, s, rel / 4);
            const end = s + rel * 2 + 0.05;
            voice.sources.forEach(src => { try { src.stop(end); } catch (e) { /* already stopped */ } });
            // All sources stop at `end`, so any one of them can trigger cleanup
            const last = voice.sources[voice.sources.length - 1];
            if (last) last.onended = () => { voice.out.disconnect(); voice.rel.disconnect(); };
        };
        return voice;
    }

    // Fire-and-forget note of a given length
    function play(freq, duration, when, velocity = 90) {
        const v = noteOn(freq, velocity, when);
        if (v) v.stop((when ?? ctx.currentTime) + duration);
        return v;
    }

    window.Synth = {
        init,
        noteOn,
        play,
        setInstrument(name) { if (PRESETS[name]) instrument = name; },
        setReverb(on) {
            reverbOn = on;
            if (wetGain) wetGain.gain.setTargetAtTime(on ? 0.28 : 0, ctx.currentTime, 0.05);
        },
        instruments: Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label })),
    };
})();
