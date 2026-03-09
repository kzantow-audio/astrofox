import useAppStore from "@/app/actions/app";
import { player } from "@/app/global";
import useSharedState from "@/app/hooks/useSharedState";
import CanvasAudio from "@/lib/canvas/CanvasAudio";
import classNames from "classnames";
import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const canvasProperties = {
	width: 854,
	height: 70,
	shadowHeight: 30,
	barWidth: 3,
	barSpacing: 1,
	bgColor: "#333333",
	bars: 213,
};

export default function AudioWaveform() {
	const isVideoRecording = useAppStore((state) => state.isVideoRecording);
	const videoExportSegment = useAppStore((state) => state.videoExportSegment);
	const [state, setState] = useSharedState();
	const { progressPosition, seekPosition } = state as {
		progressPosition?: number;
		seekPosition?: number;
	};
	const { width, height, shadowHeight } = canvasProperties;
	const canvas = useRef<HTMLCanvasElement>(null);
	const hasAudioRef = useRef(false);
	const flatRenderedRef = useRef(false);
	const [hasAudio, setHasAudio] = useState(() => player.hasAudio());

	const [baseCanvas, progressCanvas, seekCanvas] = useMemo(
		() => [
			new CanvasAudio(
				{
					...canvasProperties,
					color: ["#555555", "#444444"],
					shadowColor: "#333333",
				},
				new OffscreenCanvas(width, height),
			),
			new CanvasAudio(
				{
					...canvasProperties,
					color: ["#B6AAFF", "#927FFF"],
					shadowColor: "#554B96",
				},
				new OffscreenCanvas(width, height),
			),
			new CanvasAudio(
				{
					...canvasProperties,
					color: ["#8880BF", "#6C5FBF"],
					shadowColor: "#403972",
				},
				new OffscreenCanvas(width, height),
			),
		],
		[],
	);

	function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
		if (isVideoRecording || !hasAudio) {
			return;
		}

		const rect = e.currentTarget.getBoundingClientRect();
		const progressPosition = (e.clientX - rect.left) / rect.width;

		player.seek(progressPosition);

		setState({ progressPosition, seekPosition: 0 });
	}

	function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
		if (isVideoRecording || !hasAudio) {
			return;
		}

		e.stopPropagation();

		const rect = e.currentTarget.getBoundingClientRect();
		const seekPosition = (e.clientX - rect.left) / rect.width;

		setState({ seekPosition });
	}

	function handleMouseOut() {
		setState({ seekPosition: 0 });
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
		if (isVideoRecording || !hasAudio) {
			return;
		}

		if (e.key !== "Enter" && e.key !== " ") {
			return;
		}

		e.preventDefault();

		const nextPosition = seekPosition ?? progressPosition ?? 0;

		player.seek(nextPosition);
		setState({ progressPosition: nextPosition, seekPosition: 0 });
	}

	function drawWaveform() {
		if (!canvas.current) return;

		const { width, height } = canvas.current;
		const context = canvas.current.getContext("2d");
		if (!context) return;
		const position = (progressPosition ?? 0) * width;
		const seek = (seekPosition ?? 0) * width;
		const sx = seek < position ? seek : position;
		const dx = seek < position ? position - seek : seek - position;

		context.clearRect(0, 0, width, height);

		context.drawImage(
			baseCanvas.getCanvas(),
			position,
			0,
			width - position,
			height,
			position,
			0,
			width - position,
			height,
		);

		if (position > 0) {
			context.drawImage(
				progressCanvas.getCanvas(),
				0,
				0,
				position,
				height,
				0,
				0,
				position,
				height,
			);
		}

		if (seek > 0) {
			context.drawImage(
				seekCanvas.getCanvas(),
				sx,
				0,
				dx,
				height,
				sx,
				0,
				dx,
				height,
			);
		}
	}

	function renderFlatWaveform() {
		const { bars } = canvasProperties;
		const flatData = new Float32Array(bars).fill(0.05);
		baseCanvas.bars.render(flatData);
		progressCanvas.bars.render(flatData);
		seekCanvas.bars.render(flatData);
		flatRenderedRef.current = true;
	}

	function loadAudio() {
		const audio = player.getAudio();
		if (!audio?.buffer) return;

		baseCanvas.render(audio.buffer);
		progressCanvas.render(audio.buffer);
		seekCanvas.render(audio.buffer);
		hasAudioRef.current = true;
		flatRenderedRef.current = false;
		setHasAudio(true);
	}

	useEffect(() => {
		player.on("audio-load", loadAudio);

		return () => {
			player.off("audio-load", loadAudio);
		};
	}, []);

	useLayoutEffect(() => {
		if (hasAudio) {
			if (!hasAudioRef.current && !flatRenderedRef.current) {
				renderFlatWaveform();
			}
			drawWaveform();
		}
	});

	return (
		<div
			className={classNames({
				"min-w-[56rem] relative bg-neutral-900 border-t border-t-neutral-800 shadow-[inset_0_0_40px_rgba(0,_0,_0,_0.5)] max-h-64 transition-[max-height_0.2s_ease-out] overflow-hidden": true,
				"hidden max-h-0 transition-[max-height_0.2s_ease-in]": !hasAudio,
			})}
		>
			<div
				className="relative mx-auto mt-5"
				style={{ width, height: height + shadowHeight }}
			>
				{videoExportSegment ? (
					<div
						className="pointer-events-none absolute top-0 z-10 h-[70px] bg-primary/50"
						style={{
							left: `${videoExportSegment.startPosition * 100}%`,
							width: `${(videoExportSegment.endPosition - videoExportSegment.startPosition) * 100}%`,
						}}
					/>
				) : null}
				<canvas
					ref={canvas}
					className={classNames("block", {
						"cursor-pointer": hasAudio && !isVideoRecording,
						"cursor-default": !hasAudio || isVideoRecording,
					})}
					tabIndex={hasAudio && !isVideoRecording ? 0 : -1}
					role="button"
					aria-disabled={!hasAudio || isVideoRecording}
					aria-label="Audio waveform seek bar"
					width={width}
					height={height + shadowHeight}
					onClick={handleClick}
					onKeyDown={handleKeyDown}
					onMouseMove={handleMouseMove}
					onMouseOut={handleMouseOut}
					onBlur={handleMouseOut}
				/>
			</div>
			<div className="h-5" />
		</div>
	);
}
