import {
	events,
	analyzer,
	player,
	reactors,
	renderBackend,
} from "@/app/global";
import type { RenderFrameData } from "@/lib/types";
import Clock from "./Clock";

const STOP_RENDERING = 0;
const VIDEO_RENDERING = -1;

export default class Renderer {
	rendering: boolean;
	clock: Clock;
	frameData: RenderFrameData;
	time: number;

	constructor() {
		this.rendering = false;
		this.clock = new Clock();
		this.time = 0;

		// Frame render data
		this.frameData = {
			id: 0,
			delta: 0,
			fft: null,
			td: null,
			volume: 0,
			gain: 0,
			audioPlaying: false,
			hasUpdate: false,
			reactors: {},
		};

		// Bind context
		this.render = this.render.bind(this);

		// Events
		player.on("playback-change", this.resetAnalyzer);
	}

	resetAnalyzer() {
		if (player.hasSource()) {
			analyzer.reset();
		}
	}

	start() {
		if (!this.rendering) {
			this.time = Date.now();
			this.rendering = true;

			this.resetAnalyzer();
			this.render();
		}
	}

	stop() {
		const { id } = this.frameData;

		if (id) {
			window.cancelAnimationFrame(id);
		}

		this.frameData.id = STOP_RENDERING;
		this.rendering = false;
	}

	getFrameData(id: number): RenderFrameData {
		const {
			frameData,
			clock: { delta },
		} = this;
		const playing = player.isPlaying();
		const analysis = player.getAnalysisData({
			fft: analyzer.fft,
			td: analyzer.td,
			gain: analyzer.gain,
			analyzer: analyzer.analyzer,
		});

		frameData.id = id;
		frameData.hasUpdate = playing || id === VIDEO_RENDERING;
		frameData.audioPlaying = playing;
		frameData.gain = analysis.gain;
		frameData.fft = analysis.fft;
		frameData.td = analysis.td;
		frameData.reactors = reactors.getResults(frameData);
		frameData.delta = delta;
		frameData.inputMode = player.getMode();
		frameData.isLive = player.isLive();
		frameData.sourceLabel = player.getSourceLabel();
		frameData.midiActivity = analysis.activity;

		return frameData;
	}

	getAudioSample(time: number) {
		const { fftSize } = analyzer.analyzer;
		const audio = player.getAudio();
		if (!audio) return null;
		const pos = audio.getBufferPosition(time);
		const start = pos - fftSize / 2;
		const end = pos + fftSize / 2;

		return audio.getAudioSlice(start, end);
	}

	getFPS() {
		return this.clock.getFPS();
	}

	renderFrame(frame: number, fps: number): Promise<Uint8Array> {
		return renderBackend.renderExportFrame({
			frame,
			fps,
			getAudioSample: this.getAudioSample.bind(this),
			analyzer,
			getFrameData: this.getFrameData.bind(this),
		});
	}

	render() {
		const id = window.requestAnimationFrame(this.render);

		this.clock.update();

		player.updateAnalysis(analyzer);

		const data = this.getFrameData(id);

		renderBackend.render(data);

		events.emit("render", data);
	}
}
