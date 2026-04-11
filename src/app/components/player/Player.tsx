import useAudioStore from "@/app/actions/audio";
import React from "react";
import AudioWaveform from "./AudioWaveform";
import LiveInputButton from "./LiveInputButton";
import LiveInputGain from "./LiveInputGain";
import LiveModePanel from "./LiveModePanel";
import LiveOscilloscope, { LIVE_SCOPE_WIDTH } from "./LiveOscilloscope";
import PlayButtons from "./PlayButtons";

import ProgressControl from "./ProgressControl";
import ToggleButtons from "./ToggleButtons";
import VolumeControl from "./VolumeControl";

export default function Player() {
	const liveModeEnabled = useAudioStore((state) => state.liveModeEnabled);

	return (
		<div className="shrink-0">
			<AudioWaveform />
			<LiveOscilloscope />
			<div className="min-w-lg overflow-hidden border-t border-t-neutral-800 bg-neutral-900 px-5 py-2.5">
				{liveModeEnabled ? (
					<div
						className="mx-auto flex w-full items-center gap-3"
						style={{ maxWidth: LIVE_SCOPE_WIDTH }}
					>
						<LiveModePanel />
						<LiveInputButton />
						<LiveInputGain />
					</div>
				) : (
					<div className="flex flex-row items-center [&_>_div]:mr-5 [&_>_div:last-child]:mr-0">
						<PlayButtons />
						<VolumeControl />
						<ProgressControl />
						<ToggleButtons />
					</div>
				)}
			</div>
		</div>
	);
}
