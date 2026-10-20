import { start } from "./ui/app";
import "./styles.css";

const root = document.querySelector("#app");
if (root instanceof HTMLElement) void start(root);
