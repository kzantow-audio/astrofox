import Display from "@/lib/core/Display";

const motionOptions = [
	"Static",
	"Horizontal",
	"Vertical",
	"Diagonal",
	"Radial",
	"Sweep",
];

export default class CubesDisplay extends Display {
	static config = {
		name: "CubesDisplay",
		description: "Displays a reactive 3D wall of cubes.",
		type: "display",
		label: "Cubes",
		defaultProperties: {
			rows: 8,
			columns: 8,
			gap: 2,
			surfaceColor: "#000000",
			borderColor: "#FFFFFF",
			motion: "Horizontal",
			height: 4,
			opacity: 1.0,
		},
		controls: {
			rows: {
				label: "Rows",
				type: "number",
				min: 1,
				max: 18,
				step: 1,
				withRange: true,
			},
			columns: {
				label: "Columns",
				type: "number",
				min: 1,
				max: 28,
				step: 1,
				withRange: true,
			},
			gap: {
				label: "Gap",
				type: "number",
				min: 0,
				max: 24,
				step: 0.1,
				withRange: true,
			},
			surfaceColor: {
				label: "Surface Color",
				type: "color",
			},
			borderColor: {
				label: "Border Color",
				type: "color",
			},
			motion: {
				label: "Motion",
				type: "select",
				items: motionOptions,
			},
			height: {
				label: "Height",
				type: "number",
				min: 0,
				max: 8,
				step: 0.01,
				withRange: true,
				withReactor: true,
			},
			opacity: {
				label: "Opacity",
				type: "number",
				min: 0,
				max: 1,
				step: 0.01,
				withRange: true,
				withReactor: true,
			},
		},
	};

	constructor(properties?: Record<string, unknown>) {
		super(CubesDisplay, properties);
	}
}
