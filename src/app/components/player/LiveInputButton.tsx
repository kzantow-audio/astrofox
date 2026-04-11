import useAudioStore, { connectMicrophone } from "@/app/actions/audio";
import { player } from "@/app/global";
import useForceUpdate from "@/app/hooks/useForceUpdate";
import classNames from "classnames";
import { Mic } from "lucide-react";
import { useEffect } from "react";

export default function LiveInputButton() {
	const forceUpdate = useForceUpdate();
	const { liveInputMode, loading, microphoneDevices } = useAudioStore(
		(state) => ({
			liveInputMode: state.liveInputMode,
			loading: state.loading,
			microphoneDevices: state.microphoneDevices,
		}),
	);
	const isMicrophoneMode = liveInputMode === "microphone";
	const hasSource = player.getMode() === "microphone" && player.hasSource();
	const active = isMicrophoneMode && player.isPlaying();
	const disabled =
		!isMicrophoneMode || loading || microphoneDevices.length === 0;

	useEffect(() => {
		player.on("playback-change", forceUpdate);
		player.on("source-change", forceUpdate);

		return () => {
			player.off("playback-change", forceUpdate);
			player.off("source-change", forceUpdate);
		};
	}, [forceUpdate]);

	if (!isMicrophoneMode) {
		return null;
	}

	function handleClick() {
		if (disabled) {
			return;
		}

		if (!hasSource) {
			void connectMicrophone();
			return;
		}

		if (active) {
			player.stop();
			return;
		}

		player.play();
	}

	return (
		<button
			type="button"
			className={classNames(
				"relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 bg-transparent p-0 text-neutral-100 leading-9 transition-[all_0.2s]",
				{
					"border-primary !bg-primary text-white shadow-[0_0_18px_rgba(119,95,216,0.35)]":
						active,
					"border-neutral-700 hover:border-primary active:border-neutral-100":
						!active && !disabled,
					"cursor-not-allowed border-neutral-800 text-neutral-600": disabled,
				},
			)}
			aria-label={active ? "Stop microphone input" : "Start microphone input"}
			aria-pressed={active}
			disabled={disabled}
			title={active ? "Stop microphone input" : "Start microphone input"}
			onClick={handleClick}
		>
			<Mic className="h-5 w-5" />
		</button>
	);
}
