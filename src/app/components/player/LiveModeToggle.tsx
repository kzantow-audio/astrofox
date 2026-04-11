import useAudioStore, { setLiveModeEnabled } from "@/app/actions/audio";
import { Button } from "@/components/ui/button";
import type React from "react";

interface LiveModeToggleProps {
	children?: React.ReactNode;
}

export default function LiveModeToggle({ children }: LiveModeToggleProps) {
	const liveModeEnabled = useAudioStore((state) => state.liveModeEnabled);

	return (
		<Button
			type="button"
			variant="ghost"
			size={children ? "icon-sm" : "sm"}
			aria-label={liveModeEnabled ? "Disable live mode" : "Enable live mode"}
			aria-pressed={liveModeEnabled}
			title={liveModeEnabled ? "Disable live mode" : "Enable live mode"}
			className={
				liveModeEnabled
					? "bg-transparent text-primary hover:bg-neutral-800 hover:text-primary"
					: "bg-transparent text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
			}
			onClick={() => setLiveModeEnabled(!liveModeEnabled)}
		>
			{children || "Live Mode"}
		</Button>
	);
}
