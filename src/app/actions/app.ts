import { openAudioFile } from "@/app/actions/audio";
import { raiseError } from "@/app/actions/error";
import { showModal } from "@/app/actions/modals";
import {
	checkUnsavedChanges,
	newProject,
	openProjectBrowser,
	saveProject,
} from "@/app/actions/project";
import {
	api,
	audioContext,
	library,
	logger,
	player,
	renderBackend,
	renderer,
} from "@/app/global";
// @ts-nocheck
import Plugin from "@/lib/core/Plugin";
import * as displays from "@/lib/displays";
import * as effects from "@/lib/effects";
import create from "zustand";

const initialState = {
	statusText: "",
	showReactor: false,
	activeReactorId: null,
	activeElementId: null,
	isLeftPanelVisible: true,
	isBottomPanelVisible: true,
	isRightPanelVisible: true,
	isVideoRecording: false,
	videoExportSegment: null,
};

const appStore = create(() => ({
	...initialState,
}));

let appInitPromise = null;
let appInitialized = false;
let activeVideoRecorder = null;

const DEFAULT_VIDEO_FPS = 60;
const RECORDING_TIMESLICE_MS = 250;
const VIDEO_BITS_PER_SECOND = 8_000_000;
const VIDEO_MIME_CANDIDATES = [
	"video/webm;codecs=vp9,opus",
	"video/webm;codecs=vp8,opus",
	"video/webm",
	"video/mp4;codecs=avc1.42E01E,mp4a.40.2",
	"video/mp4",
];

function getSupportedVideoMimeType() {
	if (
		typeof window === "undefined" ||
		typeof window.MediaRecorder === "undefined"
	) {
		return null;
	}

	return (
		VIDEO_MIME_CANDIDATES.find((mimeType) =>
			window.MediaRecorder.isTypeSupported(mimeType),
		) || null
	);
}

function getExtensionFromMimeType(mimeType) {
	return mimeType.includes("mp4") ? "mp4" : "webm";
}

function getVideoRecordingSetup() {
	if (activeVideoRecorder && activeVideoRecorder.state === "recording") {
		raiseError("A video recording is already in progress.");
		return null;
	}

	if (!player.hasAudio()) {
		raiseError("Load an audio track before saving video.");
		return null;
	}

	if (
		typeof window === "undefined" ||
		typeof window.MediaRecorder === "undefined"
	) {
		raiseError("Video recording is not supported in this browser.");
		return null;
	}

	const canvas = renderBackend.getCanvas?.();

	if (!canvas || typeof canvas.captureStream !== "function") {
		raiseError("Failed to access the stage canvas for video recording.");
		return null;
	}

	const mimeType = getSupportedVideoMimeType();

	if (!mimeType) {
		raiseError("No supported video format found for recording.");
		return null;
	}

	const totalDuration = player.getDuration();

	if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
		raiseError("Failed to determine audio duration for video recording.");
		return null;
	}

	return {
		canvas,
		mimeType,
		totalDuration,
		extension: getExtensionFromMimeType(mimeType),
	};
}

export async function chooseVideoSaveLocation(
	preferredPath,
	extension = "webm",
) {
	const defaultPath = preferredPath || `video-${Date.now()}.${extension}`;
	const filters = [{ name: extension.toUpperCase(), extensions: [extension] }];
	const { fileHandle, filePath, canceled } = await api.showSaveDialog({
		defaultPath,
		filters,
	});

	if (canceled) {
		return {
			canceled: true,
			defaultPath,
			extension,
		};
	}

	return {
		canceled: false,
		fileHandle,
		filePath: filePath || fileHandle?.name || defaultPath,
		defaultPath,
		extension,
	};
}

export async function saveImage() {
	const { fileHandle, filePath, canceled } = await api.showSaveDialog({
		defaultPath: `image-${Date.now()}.png`,
		filters: [
			{ name: "PNG", extensions: ["png"] },
			{ name: "JPEG", extensions: ["jpg"] },
		],
	});

	if (!canceled) {
		try {
			const data = renderer.getFrameData(false);

			renderBackend.render(data);

			const fileName =
				filePath || fileHandle?.name || `image-${Date.now()}.png`;
			const isJpeg = /jpe?g$/i.test(fileName);
			const mimeType = isJpeg ? "image/jpeg" : "image/png";
			const buffer = renderBackend.getImage(mimeType);

			await api.saveImageFile(fileHandle || fileName, buffer, {
				mimeType,
				fileName,
			});

			logger.log("Image saved:", fileName);
		} catch (error) {
			raiseError("Failed to save image file.", error);
		}
	}
}

export async function saveVideo() {
	const setup = getVideoRecordingSetup();

	if (!setup) {
		return;
	}

	const selection = await chooseVideoSaveLocation(undefined, setup.extension);

	if (selection.canceled) {
		return;
	}

	showModal(
		"SaveVideoDialog",
		{ title: "Save video" },
		{
			fileHandle: selection.fileHandle,
			filePath: selection.filePath,
			defaultPath: selection.defaultPath,
			extension: selection.extension,
			totalDuration: setup.totalDuration,
			startTime: 0,
			endTime: setup.totalDuration,
			includeAudio: true,
		},
	);
}

export function setVideoExportSegment(startTime, endTime, totalDuration) {
	if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
		appStore.setState({ videoExportSegment: null });
		return;
	}

	const startPosition = Math.max(0, Math.min(1, startTime / totalDuration));
	const endPosition = Math.max(0, Math.min(1, endTime / totalDuration));
	const isFullDuration = startPosition <= 0 && endPosition >= 1;

	if (endPosition <= startPosition || isFullDuration) {
		appStore.setState({ videoExportSegment: null });
		return;
	}

	appStore.setState({
		videoExportSegment: {
			startPosition,
			endPosition,
		},
	});
}

export function clearVideoExportSegment() {
	appStore.setState({ videoExportSegment: null });
}

export async function startVideoRecording({
	fileHandle,
	filePath,
	defaultPath,
	startTime = 0,
	endTime,
	includeAudio = true,
}) {
	const setup = getVideoRecordingSetup();

	if (!setup) {
		return false;
	}

	const clampedStartTime = Math.max(0, startTime);
	const clampedEndTime = Math.min(
		setup.totalDuration,
		endTime ?? setup.totalDuration,
	);

	if (clampedEndTime <= clampedStartTime) {
		raiseError("Video end time must be later than the start time.");
		return false;
	}

	const durationMs = Math.max(
		250,
		Math.round((clampedEndTime - clampedStartTime) * 1000),
	);
	const targetPath =
		filePath ||
		fileHandle?.name ||
		defaultPath ||
		`video-${Date.now()}.${setup.extension}`;
	const previousLoop = player.isLooping();
	let audioDestination = null;
	let recordingStream = null;

	try {
		if (audioContext.state === "suspended") {
			await audioContext.resume();
		}

		const canvasStream = setup.canvas.captureStream(DEFAULT_VIDEO_FPS);
		const tracks = [...canvasStream.getVideoTracks()];

		if (includeAudio) {
			audioDestination = audioContext.createMediaStreamDestination();
			player.volume.connect(audioDestination);
			tracks.push(...audioDestination.stream.getAudioTracks());
		}

		recordingStream = new MediaStream(tracks);
		const recorder = new window.MediaRecorder(recordingStream, {
			mimeType: setup.mimeType,
			videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
		});

		activeVideoRecorder = recorder;
		const chunks = [];
		const fileName = targetPath;
		let stopTimer = null;
		let recordingFailed = false;

		const onPlayerStop = () => {
			if (recorder.state === "recording") {
				recorder.stop();
			}
		};

		const cleanup = () => {
			if (stopTimer) {
				window.clearTimeout(stopTimer);
				stopTimer = null;
			}

			player.off("stop", onPlayerStop);
			player.setLoop(previousLoop);

			if (audioDestination) {
				try {
					player.volume.disconnect(audioDestination);
				} catch (_error) {
					// Ignore disconnect errors from stale nodes.
				}
			}

			for (const track of recordingStream.getTracks()) {
				track.stop();
			}

			if (player.isPlaying()) {
				player.stop();
			}

			activeVideoRecorder = null;
			appStore.setState({
				isVideoRecording: false,
				videoExportSegment: null,
			});
		};

		recorder.ondataavailable = (event) => {
			if (event.data && event.data.size > 0) {
				chunks.push(event.data);
			}
		};

		recorder.onerror = (event) => {
			recordingFailed = true;
			cleanup();
			raiseError("Failed to record video.", event?.error || event);
		};

		recorder.onstop = async () => {
			if (recordingFailed) {
				cleanup();
				return;
			}

			try {
				const blob = new Blob(chunks, { type: setup.mimeType });

				await api.saveVideoFile(fileHandle || fileName, blob, {
					mimeType: setup.mimeType,
					fileName,
				});

				logger.log("Video saved:", fileName);
			} catch (error) {
				raiseError("Failed to save video file.", error);
			} finally {
				cleanup();
			}
		};

		player.stop();
		player.setLoop(false);
		player.seek(clampedStartTime / setup.totalDuration);
		player.on("stop", onPlayerStop);

		recorder.start(RECORDING_TIMESLICE_MS);
		appStore.setState({ isVideoRecording: true });
		player.play();

		stopTimer = window.setTimeout(() => {
			player.stop();
		}, durationMs);
		return true;
	} catch (error) {
		player.setLoop(previousLoop);

		if (audioDestination) {
			try {
				player.volume.disconnect(audioDestination);
			} catch (_error) {
				// Ignore disconnect errors from stale nodes.
			}
		}

		if (recordingStream) {
			for (const track of recordingStream.getTracks()) {
				track.stop();
			}
		}

		activeVideoRecorder = null;
		appStore.setState({ isVideoRecording: false });
		raiseError("Failed to start video recording.", error);
		return false;
	}
}

export function setActiveReactorId(reactorId) {
	appStore.setState({ activeReactorId: reactorId || null });
}

export function setActiveElementId(elementId) {
	appStore.setState({ activeElementId: elementId || null });
}

export function toggleLeftPanelVisibility() {
	appStore.setState((state) => ({
		isLeftPanelVisible: !state.isLeftPanelVisible,
	}));
}

export function toggleBottomPanelVisibility() {
	appStore.setState((state) => ({
		isBottomPanelVisible: !state.isBottomPanelVisible,
	}));
}

export function toggleRightPanelVisibility() {
	appStore.setState((state) => ({
		isRightPanelVisible: !state.isRightPanelVisible,
	}));
}

export async function handleMenuAction(action) {
	switch (action) {
		case "new-project":
			await checkUnsavedChanges(action, newProject);
			break;

		case "open-project":
			await checkUnsavedChanges(action, openProjectBrowser);
			break;

		case "save-project":
			await saveProject();
			break;

		case "load-audio":
			await openAudioFile();
			break;

		case "save-image":
			await saveImage();
			break;

		case "save-video":
			await saveVideo();
			break;

		case "edit-canvas":
			await showModal("CanvasSettings", { title: "Project settings" });
			break;

		case "open-dev-tools":
			api.openDevTools();
			break;
	}
}

export async function loadPlugins() {
	logger.time("plugins");

	const plugins = {};

	for (const [key, plugin] of Object.entries(api.getPlugins())) {
		try {
			const module = await import(/* webpackIgnore: true */ plugin.src);

			module.default.config.icon = plugin.icon;

			plugins[key] = Plugin.create(module.default);
		} catch (e) {
			logger.error(e);
		}
	}

	library.set("plugins", plugins);

	logger.timeEnd("plugins", "Loaded plugins", plugins);
}

export async function loadLibrary() {
	const plugins = library.get("plugins");

	const coreDisplays = {};
	for (const [key, display] of Object.entries(displays)) {
		display.config.icon = `images/controls/${key}.png`;

		coreDisplays[key] = display;
	}

	const coreEffects = {};
	for (const [key, effect] of Object.entries(effects)) {
		effect.config.icon = `images/controls/${key}.png`;

		coreEffects[key] = effect;
	}

	for (const [key, plugin] of Object.entries(plugins)) {
		const { type } = plugin.config;

		if (type === "display") {
			coreDisplays[key] = plugin;
		} else if (type === "effect") {
			coreEffects[key] = plugin;
		}
	}

	library.set("displays", coreDisplays);
	library.set("effects", coreEffects);

	logger.log("Loaded library", library);
}

export async function initApp() {
	if (appInitialized) {
		return;
	}

	if (appInitPromise) {
		return appInitPromise;
	}

	appInitPromise = (async () => {
		await loadPlugins();
		await loadLibrary();
		await newProject();

		renderer.start();
		appInitialized = true;
	})().finally(() => {
		appInitPromise = null;
	});

	return appInitPromise;
}

export default appStore;
