import { updateElementProperties } from "@/app/actions/scenes";
import { stage } from "@/app/global";
import React from "react";
import {
	type DisplayTransformFrame,
	getDisplayTransformFrame,
} from "./displayTransform";

type Handle = "move" | "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

interface DisplayTransformOverlayProps {
	activeElementId: string | null;
	displayDescriptor?: Record<string, unknown>;
	enabled?: boolean;
	stageWidth: number;
	stageHeight: number;
	zoom: number;
}

interface DragInteraction {
	elementId: string;
	handle: Handle;
	startClientX: number;
	startClientY: number;
	startFrame: DisplayTransformFrame;
	startProperties: Record<string, unknown>;
	finalProperties: Record<string, unknown> | null;
}

const HANDLE_VECTORS: Record<Exclude<Handle, "move">, [number, number]> = {
	n: [0, -1],
	e: [1, 0],
	s: [0, 1],
	w: [-1, 0],
	ne: [1, -1],
	nw: [-1, -1],
	se: [1, 1],
	sw: [-1, 1],
};

function roundValue(value: number) {
	return Math.round(value);
}

function rotateLocalToScreen(x: number, y: number, rotation: number) {
	const theta = (rotation * Math.PI) / 180;
	return {
		x: x * Math.cos(theta) - y * Math.sin(theta),
		y: x * Math.sin(theta) + y * Math.cos(theta),
	};
}

function screenToLocalDelta(x: number, y: number, rotation: number) {
	const theta = (rotation * Math.PI) / 180;
	return {
		x: x * Math.cos(theta) + y * Math.sin(theta),
		y: -x * Math.sin(theta) + y * Math.cos(theta),
	};
}

function pickUniformScale(...values: number[]) {
	let nextScale = 1;

	for (const value of values) {
		if (!Number.isFinite(value)) {
			continue;
		}

		if (Math.abs(value - 1) > Math.abs(nextScale - 1)) {
			nextScale = value;
		}
	}

	return Math.max(0.05, nextScale);
}

function buildDragResult(
	frame: DisplayTransformFrame,
	startProperties: Record<string, unknown>,
	handle: Handle,
	deltaX: number,
	deltaY: number,
	stageWidth: number,
	stageHeight: number,
) {
	if (handle === "move") {
		return {
			frame: {
				...frame,
				x: frame.x + deltaX,
				y: frame.y + deltaY,
			},
			properties: {
				x: roundValue(frame.x + deltaX),
				y: roundValue(frame.y + deltaY),
			},
		};
	}

	const [handleX, handleY] = HANDLE_VECTORS[handle];
	const localDelta = screenToLocalDelta(deltaX, deltaY, frame.rotation);
	const minRenderWidth = (frame.widthOffset + 1) * frame.displayZoom;
	const minRenderHeight = (frame.heightOffset + 1) * frame.displayZoom;
	let renderWidth = frame.renderWidth;
	let renderHeight = frame.renderHeight;
	const nextProperties: Record<string, unknown> = {};

	if (frame.kind === "text") {
		const scaleX =
			handleX !== 0
				? (frame.renderWidth + handleX * localDelta.x) / frame.renderWidth
				: Number.NaN;
		const scaleY =
			handleY !== 0
				? (frame.renderHeight + handleY * localDelta.y) / frame.renderHeight
				: Number.NaN;
		const scale = pickUniformScale(scaleX, scaleY);

		renderWidth = Math.max(1, frame.renderWidth * scale);
		renderHeight = Math.max(1, frame.renderHeight * scale);
		nextProperties.size = roundValue(Math.max(1, frame.size * scale));
	} else if (frame.fixedAspect) {
		const scaleX =
			handleX !== 0
				? (frame.renderWidth + handleX * localDelta.x) / frame.renderWidth
				: Number.NaN;
		const scaleY =
			handleY !== 0
				? (frame.renderHeight + handleY * localDelta.y) / frame.renderHeight
				: Number.NaN;
		const scale = pickUniformScale(scaleX, scaleY);

		renderWidth = Math.max(minRenderWidth, frame.renderWidth * scale);
		renderHeight = Math.max(minRenderHeight, frame.renderHeight * scale);
		const nextBaseWidth = renderWidth / frame.displayZoom;
		const nextBaseHeight = renderHeight / frame.displayZoom;
		nextProperties.width = roundValue(
			Math.max(1, nextBaseWidth - frame.widthOffset),
		);
		nextProperties.height = roundValue(
			Math.max(1, nextBaseHeight - frame.heightOffset),
		);
	} else {
		if (handleX !== 0) {
			renderWidth = Math.max(
				minRenderWidth,
				frame.renderWidth + handleX * localDelta.x,
			);
			const nextBaseWidth = renderWidth / frame.displayZoom;
			nextProperties.width = roundValue(
				Math.max(1, nextBaseWidth - frame.widthOffset),
			);
		}

		if (handleY !== 0) {
			renderHeight = Math.max(
				minRenderHeight,
				frame.renderHeight + handleY * localDelta.y,
			);
			const nextBaseHeight = renderHeight / frame.displayZoom;
			nextProperties.height = roundValue(
				Math.max(1, nextBaseHeight - frame.heightOffset),
			);
		}
	}

	const shiftLocalX =
		handleX !== 0 ? (handleX * (renderWidth - frame.renderWidth)) / 2 : 0;
	const shiftLocalY =
		handleY !== 0 ? (handleY * (renderHeight - frame.renderHeight)) / 2 : 0;
	const shiftScreen = rotateLocalToScreen(
		shiftLocalX,
		shiftLocalY,
		frame.rotation,
	);
	const startCenterScreenX = stageWidth / 2 + frame.x;
	const startCenterScreenY = stageHeight / 2 + frame.y;
	const nextCenterScreenX = startCenterScreenX + shiftScreen.x;
	const nextCenterScreenY = startCenterScreenY + shiftScreen.y;
	const nextX = nextCenterScreenX - stageWidth / 2;
	const nextY = nextCenterScreenY - stageHeight / 2;

	nextProperties.x = roundValue(nextX);
	nextProperties.y = roundValue(nextY);

	return {
		frame: {
			...frame,
			x: nextX,
			y: nextY,
			renderWidth,
			renderHeight,
			size:
				nextProperties.size !== undefined
					? Number(nextProperties.size)
					: frame.size,
		},
		properties: {
			...startProperties,
			...nextProperties,
		},
	};
}

function hasChangedProperties(
	startProperties: Record<string, unknown>,
	finalProperties: Record<string, unknown> | null,
) {
	if (!finalProperties) {
		return false;
	}

	return Object.entries(finalProperties).some(
		([key, value]) => startProperties[key] !== value,
	);
}

export default function DisplayTransformOverlay({
	activeElementId,
	displayDescriptor,
	enabled = false,
	stageWidth,
	stageHeight,
	zoom,
}: DisplayTransformOverlayProps) {
	const resolvedFrame = React.useMemo(
		() =>
			getDisplayTransformFrame(
				stage.getStageElementById(activeElementId || ""),
			),
		[activeElementId, displayDescriptor],
	);
	const [draftFrame, setDraftFrame] =
		React.useState<DisplayTransformFrame | null>(resolvedFrame);
	const interactionRef = React.useRef<DragInteraction | null>(null);

	React.useEffect(() => {
		if (interactionRef.current) {
			return;
		}

		setDraftFrame(resolvedFrame);
	}, [resolvedFrame]);

	const handleWindowPointerMove = React.useCallback(
		(event: PointerEvent) => {
			const interaction = interactionRef.current;

			if (!interaction) {
				return;
			}

			const deltaX =
				(event.clientX - interaction.startClientX) / Math.max(zoom, 0.01);
			const deltaY =
				(event.clientY - interaction.startClientY) / Math.max(zoom, 0.01);
			const nextResult = buildDragResult(
				interaction.startFrame,
				interaction.startProperties,
				interaction.handle,
				deltaX,
				deltaY,
				stageWidth,
				stageHeight,
			);
			const element = stage.getStageElementById(interaction.elementId) as {
				update: (properties: Record<string, unknown>) => void;
			} | null;

			element?.update(nextResult.properties);
			interaction.finalProperties = nextResult.properties;
			setDraftFrame(nextResult.frame);
		},
		[stageHeight, stageWidth, zoom],
	);

	const handleWindowPointerUp = React.useCallback(() => {
		const interaction = interactionRef.current;
		interactionRef.current = null;
		window.removeEventListener("pointermove", handleWindowPointerMove);
		window.removeEventListener("pointerup", handleWindowPointerUp);
		window.removeEventListener("pointercancel", handleWindowPointerUp);
		document.body.style.userSelect = "";

		if (
			interaction &&
			hasChangedProperties(
				interaction.startProperties,
				interaction.finalProperties,
			)
		) {
			updateElementProperties(
				interaction.elementId,
				interaction.finalProperties || {},
			);
		}
	}, [handleWindowPointerMove]);

	React.useEffect(() => {
		return () => {
			handleWindowPointerUp();
		};
	}, [handleWindowPointerUp]);

	const startInteraction = React.useCallback(
		(handle: Handle) => (event: React.PointerEvent<HTMLButtonElement>) => {
			if (!draftFrame || !activeElementId) {
				return;
			}

			const element = stage.getStageElementById(activeElementId) as {
				properties?: Record<string, unknown>;
			} | null;

			if (!element?.properties) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			interactionRef.current = {
				elementId: activeElementId,
				handle,
				startClientX: event.clientX,
				startClientY: event.clientY,
				startFrame: draftFrame,
				startProperties: { ...element.properties },
				finalProperties: null,
			};

			document.body.style.userSelect = "none";
			window.addEventListener("pointermove", handleWindowPointerMove);
			window.addEventListener("pointerup", handleWindowPointerUp);
			window.addEventListener("pointercancel", handleWindowPointerUp);
		},
		[
			activeElementId,
			draftFrame,
			handleWindowPointerMove,
			handleWindowPointerUp,
		],
	);

	if (!enabled || !draftFrame) {
		return null;
	}

	const frame = draftFrame;
	const centerX = stageWidth / 2 + frame.x;
	const centerY = stageHeight / 2 + frame.y;
	const widthPx = Math.max(1, frame.renderWidth * zoom);
	const heightPx = Math.max(1, frame.renderHeight * zoom);

	return (
		<div className="pointer-events-none absolute inset-0 z-20">
			<div
				className="absolute"
				style={{
					left: centerX * zoom,
					top: centerY * zoom,
					width: widthPx,
					height: heightPx,
					transform: `translate(-50%, -50%) rotate(${frame.rotation}deg)`,
				}}
			>
				<div className="pointer-events-none absolute inset-0 border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.65)]" />
				<button
					type="button"
					aria-label="Move layer"
					className="absolute inset-[10px] cursor-move pointer-events-auto bg-transparent"
					onPointerDown={startInteraction("move")}
				/>
				<button
					type="button"
					aria-label="Resize top"
					className="absolute -top-[6px] left-[10px] right-[10px] h-3 cursor-ns-resize pointer-events-auto bg-transparent"
					onPointerDown={startInteraction("n")}
				/>
				<button
					type="button"
					aria-label="Resize right"
					className="absolute -right-[6px] top-[10px] bottom-[10px] w-3 cursor-ew-resize pointer-events-auto bg-transparent"
					onPointerDown={startInteraction("e")}
				/>
				<button
					type="button"
					aria-label="Resize bottom"
					className="absolute -bottom-[6px] left-[10px] right-[10px] h-3 cursor-ns-resize pointer-events-auto bg-transparent"
					onPointerDown={startInteraction("s")}
				/>
				<button
					type="button"
					aria-label="Resize left"
					className="absolute -left-[6px] top-[10px] bottom-[10px] w-3 cursor-ew-resize pointer-events-auto bg-transparent"
					onPointerDown={startInteraction("w")}
				/>
				{[
					{
						handle: "nw" as const,
						className: "-left-[5px] -top-[5px] cursor-nwse-resize",
						label: "Resize top left",
					},
					{
						handle: "ne" as const,
						className: "-right-[5px] -top-[5px] cursor-nesw-resize",
						label: "Resize top right",
					},
					{
						handle: "se" as const,
						className: "-right-[5px] -bottom-[5px] cursor-nwse-resize",
						label: "Resize bottom right",
					},
					{
						handle: "sw" as const,
						className: "-left-[5px] -bottom-[5px] cursor-nesw-resize",
						label: "Resize bottom left",
					},
					{
						handle: "n" as const,
						className: "left-1/2 -top-[5px] -translate-x-1/2 cursor-ns-resize",
						label: "Resize top edge",
					},
					{
						handle: "e" as const,
						className: "top-1/2 -right-[5px] -translate-y-1/2 cursor-ew-resize",
						label: "Resize right edge",
					},
					{
						handle: "s" as const,
						className:
							"left-1/2 -bottom-[5px] -translate-x-1/2 cursor-ns-resize",
						label: "Resize bottom edge",
					},
					{
						handle: "w" as const,
						className: "top-1/2 -left-[5px] -translate-y-1/2 cursor-ew-resize",
						label: "Resize left edge",
					},
				].map((item) => (
					<button
						key={item.handle + item.label}
						type="button"
						aria-label={item.label}
						className={`absolute h-2.5 w-2.5 border border-black bg-white pointer-events-auto ${item.className}`}
						onPointerDown={startInteraction(item.handle)}
					/>
				))}
			</div>
		</div>
	);
}
