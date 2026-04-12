// @ts-nocheck
import { useFrame } from "@react-three/fiber";
import React from "react";

const DEFAULT_LIGHT_DISTANCE = 700;

const LIGHTING_PRESETS = {
	Studio: {
		keyPosition: [-0.42, 1.4, 0.58],
		fillPosition: [0.8, 0.52, 0.72],
		rimPosition: [-0.78, 0.38, -0.88],
		key: 1,
		fill: 1,
		rim: 1,
	},
	Stage: {
		keyPosition: [-0.2, 1.8, 0.32],
		fillPosition: [0.95, 0.36, 0.4],
		rimPosition: [-0.6, 0.7, -1.05],
		key: 1.2,
		fill: 0.4,
		rim: 1,
	},
	Grid: {
		keyPosition: [-0.62, 1.12, 0.74],
		fillPosition: [0.94, 0.84, 0.94],
		rimPosition: [-1.05, -0.2, -1.05],
		key: 0.9,
		fill: 1,
		rim: 0.45,
	},
	Flat: {
		keyPosition: [-0.28, 0.9, 0.2],
		fillPosition: [0.35, 0.5, 0.3],
		rimPosition: [-0.35, 0.4, -0.35],
		key: 0.18,
		fill: 0.08,
		rim: 0,
	},
};

function scalePosition(position: number[], distance: number) {
	return position.map((value) => value * distance);
}

function getDistanceIntensityScale(distance: number) {
	const normalizedDistance = Math.max(
		50,
		Number(distance) || DEFAULT_LIGHT_DISTANCE,
	);

	return Math.max(
		0.4,
		Math.min(3, Math.sqrt(DEFAULT_LIGHT_DISTANCE / normalizedDistance)),
	);
}

function setVectorPosition(light, position: number[]) {
	if (!light) {
		return;
	}

	const [x, y, z] = position;

	if (
		light.position.x !== x ||
		light.position.y !== y ||
		light.position.z !== z
	) {
		light.position.set(x, y, z);
	}
}

function setLightColor(light, color: string) {
	if (!light || !color) {
		return;
	}

	if (light.color.getStyle() !== color) {
		light.color.set(color);
	}
}

function setLightIntensity(light, intensity: number) {
	if (!light) {
		return;
	}

	if (light.intensity !== intensity) {
		light.intensity = intensity;
	}
}

function setCastShadow(light, castShadow: boolean) {
	if (!light) {
		return;
	}

	if (light.castShadow !== castShadow) {
		light.castShadow = castShadow;
	}
}

function syncDirectionalShadow(
	light,
	distance: number,
	width: number,
	height: number,
) {
	if (!light?.shadow?.camera) {
		return;
	}

	const viewportWidth = Math.max(1, Number(width) || 1);
	const viewportHeight = Math.max(1, Number(height) || 1);
	const shadowSpanX = Math.max(viewportWidth * 0.85, distance * 0.8);
	const shadowSpanY = Math.max(viewportHeight * 0.85, distance * 0.8);
	const shadowCamera = light.shadow.camera;
	const nextFar = Math.max(distance * 4, 4000);
	let needsProjectionUpdate = false;

	if (shadowCamera.near !== 1) {
		shadowCamera.near = 1;
		needsProjectionUpdate = true;
	}

	if (shadowCamera.far !== nextFar) {
		shadowCamera.far = nextFar;
		needsProjectionUpdate = true;
	}

	if (shadowCamera.left !== -shadowSpanX) {
		shadowCamera.left = -shadowSpanX;
		needsProjectionUpdate = true;
	}

	if (shadowCamera.right !== shadowSpanX) {
		shadowCamera.right = shadowSpanX;
		needsProjectionUpdate = true;
	}

	if (shadowCamera.top !== shadowSpanY) {
		shadowCamera.top = shadowSpanY;
		needsProjectionUpdate = true;
	}

	if (shadowCamera.bottom !== -shadowSpanY) {
		shadowCamera.bottom = -shadowSpanY;
		needsProjectionUpdate = true;
	}

	if (needsProjectionUpdate) {
		shadowCamera.updateProjectionMatrix();
	}
}

function SceneLights3DImpl({ sceneProperties = {}, width, height }) {
	const keyLightRef = React.useRef(null);
	const fillLightRef = React.useRef(null);
	const rimLightRef = React.useRef(null);

	useFrame(() => {
		const {
			lightingPreset = "Studio",
			keyLightIntensity = 2.2,
			fillLightIntensity = 0.75,
			rimLightIntensity = 0.35,
			keyLightDistance,
			fillLightDistance,
			rimLightDistance,
			lightDistance = DEFAULT_LIGHT_DISTANCE,
			lightColor = "#FFFFFF",
			fillLightColor = "#FFFFFF",
			rimLightColor = "#F3F1FF",
			shadows = true,
		} = sceneProperties;

		const preset =
			LIGHTING_PRESETS[String(lightingPreset)] || LIGHTING_PRESETS.Studio;
		const resolvedKeyDistance = Math.max(
			50,
			Number(keyLightDistance ?? lightDistance) || 50,
		);
		const resolvedFillDistance = Math.max(
			50,
			Number(fillLightDistance ?? lightDistance) || 50,
		);
		const resolvedRimDistance = Math.max(
			50,
			Number(rimLightDistance ?? lightDistance) || 50,
		);

		setVectorPosition(
			keyLightRef.current,
			scalePosition(preset.keyPosition, resolvedKeyDistance),
		);
		setLightIntensity(
			keyLightRef.current,
			Math.max(0, Number(keyLightIntensity) || 0) *
				preset.key *
				getDistanceIntensityScale(resolvedKeyDistance),
		);
		setLightColor(keyLightRef.current, String(lightColor || "#FFFFFF"));
		setCastShadow(keyLightRef.current, Boolean(shadows));
		syncDirectionalShadow(
			keyLightRef.current,
			resolvedKeyDistance,
			width,
			height,
		);

		setVectorPosition(
			fillLightRef.current,
			scalePosition(preset.fillPosition, resolvedFillDistance),
		);
		setLightIntensity(
			fillLightRef.current,
			Math.max(0, Number(fillLightIntensity) || 0) *
				preset.fill *
				getDistanceIntensityScale(resolvedFillDistance),
		);
		setLightColor(fillLightRef.current, String(fillLightColor || "#FFFFFF"));

		setVectorPosition(
			rimLightRef.current,
			scalePosition(preset.rimPosition, resolvedRimDistance),
		);
		setLightIntensity(
			rimLightRef.current,
			Math.max(0, Number(rimLightIntensity) || 0) *
				preset.rim *
				getDistanceIntensityScale(resolvedRimDistance),
		);
		setLightColor(rimLightRef.current, String(rimLightColor || "#F3F1FF"));
	});

	return (
		<>
			<directionalLight
				ref={keyLightRef}
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.00035}
				shadow-normalBias={0.02}
			/>
			<pointLight ref={fillLightRef} decay={0} />
			<pointLight ref={rimLightRef} decay={0} />
		</>
	);
}

export const SceneLights3D = React.memo(SceneLights3DImpl);
