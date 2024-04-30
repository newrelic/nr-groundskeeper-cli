import { TERMINAL_STYLES } from "./styles.js";

const ProgressBar = class {
  constructor(ticks = 0) {
    this.ticks = Number(ticks);
    this.progress = 0;
  }

  print(progress, message = "") {
    if (!this.ticks) return;
    this.progress = Number(progress) || this.progress;
    const blanks = "\u2588".repeat(this.progress);
    const fills = "\u2581".repeat(this.ticks - this.progress);
    process.stdout.write(`\r${blanks}${fills} ${message}`);
  }

  done(message = "") {
    this.print(
      this.ticks,
      `${TERMINAL_STYLES.GREEN}${message}${TERMINAL_STYLES.RESET}\n`,
    );
  }

  log(message = "", style = TERMINAL_STYLES.RESET) {
    process.stdout.write(`\r${style}${message}${TERMINAL_STYLES.RESET}\n`);
    if (this.progress < this.ticks) this.print();
  }
};
ProgressBar.STYLES = TERMINAL_STYLES;

export default ProgressBar;
