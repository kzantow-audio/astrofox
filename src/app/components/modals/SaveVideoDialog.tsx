import {
	chooseVideoSaveLocation,
	clearVideoExportSegment,
	setVideoExportSegment,
	startVideoRecording,
} from "@/app/actions/app";
import { raiseError } from "@/app/actions/error";
import TimeInput from "@/app/components/inputs/TimeInput";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatSeekTime } from "@/lib/utils/format";
import React, { useEffect, useRef, useState } from "react";

type SaveVideoDialogProps = {
	onClose: () => void;
	fileHandle?: { name?: string } | null;
	filePath?: string;
	defaultPath?: string;
	extension?: string;
	totalDuration: number;
	startTime?: number;
	endTime?: number;
	includeAudio?: boolean;
};

export default function SaveVideoDialog({
	onClose,
	fileHandle: initialFileHandle = null,
	filePath: initialFilePath = "",
	defaultPath: initialDefaultPath = "",
	extension = "webm",
	totalDuration,
	startTime = 0,
	endTime = totalDuration,
	includeAudio = true,
}: SaveVideoDialogProps) {
	const [fileHandle, setFileHandle] = useState(initialFileHandle);
	const [filePath, setFilePath] = useState(initialFilePath);
	const [selectedStartTime, setSelectedStartTime] = useState(startTime);
	const [selectedEndTime, setSelectedEndTime] = useState(endTime);
	const [shouldIncludeAudio, setShouldIncludeAudio] = useState(includeAudio);
	const [validationMessage, setValidationMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isChoosingLocation, setIsChoosingLocation] = useState(false);
	const keepSegmentOverlayRef = useRef(false);

	useEffect(() => {
		setVideoExportSegment(selectedStartTime, selectedEndTime, totalDuration);
	}, [selectedEndTime, selectedStartTime, totalDuration]);

	useEffect(() => {
		return () => {
			if (!keepSegmentOverlayRef.current) {
				clearVideoExportSegment();
			}
		};
	}, []);

	async function handleChooseLocation() {
		setIsChoosingLocation(true);

		try {
			const selection = await chooseVideoSaveLocation(filePath, extension);

			if (!selection.canceled) {
				setFileHandle(selection.fileHandle || null);
				setFilePath(selection.filePath || selection.defaultPath);
			}
		} catch (error) {
			raiseError("Failed to choose a video save location.", error);
		} finally {
			setIsChoosingLocation(false);
		}
	}

	function handleCancel() {
		if (isSubmitting) {
			return;
		}

		keepSegmentOverlayRef.current = false;
		onClose();
	}

	async function handleSave() {
		if (!filePath && !fileHandle?.name) {
			setValidationMessage(
				"Choose a save location before starting the export.",
			);
			return;
		}

		if (selectedEndTime <= selectedStartTime) {
			setValidationMessage("End time must be later than start time.");
			return;
		}

		setValidationMessage("");
		setIsSubmitting(true);

		try {
			const started = await startVideoRecording({
				fileHandle,
				filePath,
				defaultPath: initialDefaultPath,
				startTime: selectedStartTime,
				endTime: selectedEndTime,
				includeAudio: shouldIncludeAudio,
			});

			if (started) {
				keepSegmentOverlayRef.current = true;
				onClose();
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex w-[560px] max-w-full flex-col">
			<div className="flex max-h-[60vh] flex-col gap-5 overflow-auto px-4 py-4">
				<section className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h3 className="text-sm font-medium text-neutral-100">
								Save location
							</h3>
							<p className="text-xs text-neutral-400">
								Choose where the rendered video will be saved.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={isSubmitting || isChoosingLocation}
							onClick={handleChooseLocation}
						>
							{isChoosingLocation ? "Choosing..." : "Choose"}
						</Button>
					</div>
					<input
						type="text"
						readOnly
						value={filePath}
						className="w-full rounded border border-border-input bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300 outline-none"
					/>
				</section>

				<section className="space-y-3">
					<div>
						<h3 className="text-sm font-medium text-neutral-100">
							Time duration
						</h3>
						<p className="text-xs text-neutral-400">
							Default is the full track. Enter a start and end time in
							<code className="ml-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[11px] text-neutral-300">
								00:00:00
							</code>
							format.
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
						<div className="flex flex-col gap-3.5">
							<label
								htmlFor="video-export-start-time"
								className="block text-xs uppercase tracking-wide text-neutral-400"
							>
								Start
							</label>
							<TimeInput
								name="startTime"
								value={selectedStartTime}
								min={0}
								max={totalDuration}
								width={220}
								onChange={(_name, value) => setSelectedStartTime(value)}
							/>
						</div>
						<div className="flex flex-col gap-3.5">
							<label
								htmlFor="video-export-end-time"
								className="block text-xs uppercase tracking-wide text-neutral-400"
							>
								End
							</label>
							<TimeInput
								name="endTime"
								value={selectedEndTime}
								min={0}
								max={totalDuration}
								width={220}
								onChange={(_name, value) => setSelectedEndTime(value)}
							/>
						</div>
					</div>
					<p className="text-xs text-neutral-500">
						Full track length: {formatSeekTime(totalDuration)}
					</p>
				</section>

				<section className="space-y-2">
					<div className="flex items-center justify-between gap-4 py-1">
						<div>
							<label
								htmlFor="video-export-include-audio"
								className="text-sm text-neutral-100"
							>
								Include audio
							</label>
							<div className="text-xs text-neutral-400">
								Turn this off to export the visuals without an audio track.
							</div>
						</div>
						<Switch
							id="video-export-include-audio"
							checked={shouldIncludeAudio}
							disabled={isSubmitting}
							onCheckedChange={setShouldIncludeAudio}
						/>
					</div>
				</section>

				{validationMessage ? (
					<div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
						{validationMessage}
					</div>
				) : null}
			</div>
			<div className="shrink-0 border-t border-neutral-700 bg-neutral-800 px-4 py-3">
				<DialogFooter className="justify-end sm:justify-end">
					<Button
						variant="default"
						size="sm"
						disabled={isSubmitting || isChoosingLocation}
						onClick={handleSave}
					>
						{isSubmitting ? "Starting..." : "Save video"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isSubmitting}
						onClick={handleCancel}
					>
						Cancel
					</Button>
				</DialogFooter>
			</div>
		</div>
	);
}
