// @ts-nocheck
import {
	PPBlurEffect,
	PPColorHalftoneEffect,
	PPDistortionEffect,
	PPGaussianBlurPass,
	PPGlowEffect,
	PPHexPixelateEffect,
	PPKaleidoscopeEffect,
	PPLEDEffect,
	PPMirrorEffect,
	PPRGBShiftEffect,
	PPTiltShiftEffect,
	PPUnrealBloomPass,
} from "@/lib/postprocessing";
import {
	BlendFunction,
	GlitchMode,
	ASCIIEffect as RawASCIIEffect,
	BrightnessContrastEffect as RawBrightnessContrastEffect,
	ColorAverageEffect as RawColorAverageEffect,
	ColorDepthEffect as RawColorDepthEffect,
	DotScreenEffect as RawDotScreenEffect,
	GlitchEffect as RawGlitchEffect,
	GridEffect as RawGridEffect,
	HueSaturationEffect as RawHueSaturationEffect,
	NoiseEffect as RawNoiseEffect,
	PixelationEffect as RawPixelationEffect,
	ScanlineEffect as RawScanlineEffect,
	SepiaEffect as RawSepiaEffect,
	ToneMappingEffect as RawToneMappingEffect,
	VignetteEffect as RawVignetteEffect,
	ToneMappingMode,
} from "postprocessing";
import { Vector2 } from "three";
import { toRadians } from "../constants";

function createBrightnessContrastRawEffect(props) {
	return new RawBrightnessContrastEffect({
		brightness: Number(props.brightness ?? 0),
		contrast: Number(props.contrast ?? 0),
	});
}

function createColorAverageRawEffect() {
	return new RawColorAverageEffect(BlendFunction.NORMAL);
}

function createColorDepthRawEffect(props) {
	return new RawColorDepthEffect({ bits: Number(props.bits ?? 16) });
}

function createHueSaturationRawEffect(props) {
	return new RawHueSaturationEffect({
		hue: toRadians(Number(props.hue ?? 0)),
		saturation: Number(props.saturation ?? 0),
	});
}

function createSepiaRawEffect(props) {
	const effect = new RawSepiaEffect({
		intensity: Number(props.intensity ?? 1.0),
	});
	effect.__updateRawEffect = () => {
		effect.intensity = Number(props.intensity ?? 1.0);
	};
	return effect;
}

function createToneMappingRawEffect(props) {
	const adaptive = Boolean(
		props.toneMappingAdaptive ?? props.adaptive ?? false,
	);
	const effect = new RawToneMappingEffect({
		mode: adaptive
			? ToneMappingMode.REINHARD2_ADAPTIVE
			: ToneMappingMode.REINHARD2,
		middleGrey: Number(props.middleGrey ?? 0.6),
		maxLuminance: Number(props.maxLuminance ?? 16),
		averageLuminance: Number(props.averageLuminance ?? 1.0),
		adaptationRate: Number(props.adaptationRate ?? 1.0),
	});
	effect.__updateRawEffect = () => {
		effect.mode = adaptive
			? ToneMappingMode.REINHARD2_ADAPTIVE
			: ToneMappingMode.REINHARD2;
		effect.whitePoint = Number(props.maxLuminance ?? 16);
		effect.middleGrey = Number(props.middleGrey ?? 0.6);
		effect.averageLuminance = Number(props.averageLuminance ?? 1.0);
		effect.adaptationRate = Number(props.adaptationRate ?? 1.0);
	};
	return effect;
}

export function createRawEffect(effectConfig, width, height) {
	const props = effectConfig.properties || {};

	switch (effectConfig.name) {
		case "BloomEffect": {
			const pass = new PPUnrealBloomPass({
				width,
				height,
				exposure: Number(props.exposure ?? 1),
				strength: Number(props.strength ?? 1.5),
				radius: Number(props.radius ?? 0),
				threshold: Number(props.threshold ?? 0),
			});
			pass.__updateScenePass = () => {
				pass.enabled = effectConfig.enabled !== false;
				pass.updateOptions({
					exposure: Number(props.exposure ?? 1),
					strength: Number(props.strength ?? 1.5),
					radius: Number(props.radius ?? 0),
					threshold: Number(props.threshold ?? 0),
				});
			};
			pass.__updateScenePass();
			return pass;
		}
		case "PixelateEffect": {
			const size = Number(props.size || 10);
			const type = props.type || "Square";
			if (type === "Hexagon") {
				return new PPHexPixelateEffect({ size, width, height });
			}
			return new RawPixelationEffect(size);
		}
		case "DotScreenEffect": {
			const scale = Number(props.scale || 0);
			const angle = Number(props.angle || 0);
			return new RawDotScreenEffect({
				scale: 2 - scale * 2,
				angle: toRadians(angle),
			});
		}
		case "RGBShiftEffect": {
			const normalizedOffset =
				Number(props.offset || 0) / Math.max(1, Number(width || 1));
			return new PPRGBShiftEffect({
				offset: normalizedOffset,
				angle: toRadians(Number(props.angle || 0)),
			});
		}
		case "MirrorEffect":
			return new PPMirrorEffect({ side: Number(props.side || 0) });
		case "KaleidoscopeEffect":
			return new PPKaleidoscopeEffect({
				sides: Math.max(1, Number(props.sides || 6)),
				angle: toRadians(Number(props.angle || 0)),
			});
		case "DistortionEffect":
			return new PPDistortionEffect({
				amount: Number(props.amount || 0) * 30,
				time: Number(effectConfig.time || 0),
			});
		case "GlitchEffect": {
			const strength = Number(props.strength ?? 0.3);
			const effect = new RawGlitchEffect({
				mode:
					props.mode === "Constant"
						? GlitchMode.CONSTANT_WILD
						: GlitchMode.SPORADIC,
				strength: new Vector2(strength * 0.5, strength),
				columns: Number(props.columns ?? 0.05),
				ratio: Number(props.ratio ?? 0.85),
			});
			effect.__updateRawEffect = (frameData) => {
				const nextStrength = Number(props.strength ?? 0.3);
				effect.strength.set(nextStrength * 0.5, nextStrength);
				effect.columns = Number(props.columns ?? 0.05);
				effect.ratio = Number(props.ratio ?? 0.85);
				effect.mode = frameData?.hasUpdate
					? props.mode === "Constant"
						? GlitchMode.CONSTANT_WILD
						: GlitchMode.SPORADIC
					: GlitchMode.DISABLED;
			};
			return effect;
		}
		case "ColorHalftoneEffect":
			return new PPColorHalftoneEffect({
				scale: 1 - Number(props.scale || 0),
				angle: toRadians(Number(props.angle || 0)),
				width,
				height,
			});
		case "LEDEffect":
			return new PPLEDEffect({
				spacing: Math.max(1, Number(props.spacing || 10)),
				size: Number(props.size || 4),
				blur: Number(props.blur || 4),
				width,
				height,
			});
		case "GlowEffect":
			return new PPGlowEffect({
				amount: Number(props.amount || 0) * 5,
				intensity: Number(props.intensity || 1),
				width,
				height,
			});
		case "BlurEffect": {
			const blurType = props.type || "Gaussian";
			if (blurType === "Gaussian") {
				return new PPGaussianBlurPass({
					amount: Number(props.amount || 0),
				});
			}
			const blurTypeMap = {
				Box: 0,
				Circular: 1,
				Triangle: 3,
				Zoom: 4,
				Lens: 5,
			};
			return new PPBlurEffect({
				amount: Number(props.amount || 0),
				blurType: blurTypeMap[blurType] ?? 0,
				width,
				height,
			});
		}
		case "BrightnessContrastEffect":
			return createBrightnessContrastRawEffect(props);
		case "ColorAverageEffect":
			return createColorAverageRawEffect();
		case "ColorEffect": {
			const colorEffects = [];

			if (
				Number(props.brightness ?? 0) !== 0 ||
				Number(props.contrast ?? 0) !== 0
			) {
				colorEffects.push(createBrightnessContrastRawEffect(props));
			}
			if (props.colorAverageEnabled) {
				colorEffects.push(createColorAverageRawEffect());
			}
			if (props.colorDepthEnabled) {
				colorEffects.push(createColorDepthRawEffect(props));
			}
			if (Number(props.hue ?? 0) !== 0 || Number(props.saturation ?? 0) !== 0) {
				colorEffects.push(createHueSaturationRawEffect(props));
			}
			if (Number(props.intensity ?? 0) !== 0) {
				colorEffects.push(createSepiaRawEffect(props));
			}
			if (props.toneMappingEnabled) {
				colorEffects.push(createToneMappingRawEffect(props));
			}

			return colorEffects;
		}
		case "ColorDepthEffect":
			return createColorDepthRawEffect(props);
		case "GridEffect":
			return new RawGridEffect({
				scale: Number(props.scale ?? 1.0),
				lineWidth: Number(props.lineWidth ?? 0.5),
			});
		case "HueSaturationEffect":
			return createHueSaturationRawEffect(props);
		case "NoiseEffect":
			return new RawNoiseEffect({
				premultiply: !!props.premultiply,
				blendFunction: BlendFunction.ADD,
			});
		case "ScanlineEffect":
			return new RawScanlineEffect({ density: Number(props.density ?? 1.25) });
		case "SepiaEffect":
			return createSepiaRawEffect(props);
		case "ToneMappingEffect":
			return createToneMappingRawEffect(props);
		case "VignetteEffect":
			return new RawVignetteEffect({
				offset: Number(props.offset ?? 0.5),
				darkness: Number(props.darkness ?? 0.5),
			});
		case "ASCIIEffect":
			return new RawASCIIEffect({
				fontSize: Number(props.fontSize ?? 54),
				cellSize: Number(props.cellSize ?? 16),
				color: String(props.color ?? "#ffffff"),
				invert: !!props.invert,
			});
		case "TiltShiftEffect":
			return new PPTiltShiftEffect({
				blur: Number(props.blur ?? 0.15),
				taper: Number(props.taper ?? 0.5),
				samples: Number(props.samples ?? 10),
			});
		default:
			return null;
	}
}
