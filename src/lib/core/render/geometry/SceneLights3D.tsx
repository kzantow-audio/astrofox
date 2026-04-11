// @ts-nocheck
import React from "react";

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

export function SceneLights3D({ sceneProperties = {}, width, height }) {
	const {
		lightingPreset = "Studio",
		keyLightIntensity = 2.2,
		fillLightIntensity = 0.75,
		rimLightIntensity = 0.35,
		keyLightDistance,
		fillLightDistance,
		rimLightDistance,
		lightDistance = 700,
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
	const viewportWidth = Math.max(1, Number(width) || 1);
	const viewportHeight = Math.max(1, Number(height) || 1);
	const shadowSpanX = Math.max(viewportWidth * 0.85, resolvedKeyDistance * 0.8);
	const shadowSpanY = Math.max(viewportHeight * 0.85, resolvedKeyDistance * 0.8);

	return (
		<>
			<directionalLight
				position={scalePosition(preset.keyPosition, resolvedKeyDistance)}
				intensity={Math.max(0, Number(keyLightIntensity) || 0) * preset.key}
				color={lightColor}
				castShadow={!!shadows}
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.00035}
				shadow-normalBias={0.02}
				shadow-camera-near={1}
				shadow-camera-far={Math.max(resolvedKeyDistance * 4, 4000)}
				shadow-camera-left={-shadowSpanX}
				shadow-camera-right={shadowSpanX}
				shadow-camera-top={shadowSpanY}
				shadow-camera-bottom={-shadowSpanY}
			/>
			<pointLight
				intensity={Math.max(0, Number(fillLightIntensity) || 0) * preset.fill}
				decay={0}
				position={scalePosition(preset.fillPosition, resolvedFillDistance)}
				color={fillLightColor}
			/>
			<pointLight
				intensity={Math.max(0, Number(rimLightIntensity) || 0) * preset.rim}
				decay={0}
				position={scalePosition(preset.rimPosition, resolvedRimDistance)}
				color={rimLightColor}
			/>
		</>
	);
}
