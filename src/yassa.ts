import { versions } from "node:process";

import { sum } from "./sum.js";

export const yassa = (left: number, right: number): number => sum(left, right);

export const nodeMajorVersion = (): number => {
	const [major = "0"] = versions.node.split(".");

	return Number.parseInt(major, 10);
};
