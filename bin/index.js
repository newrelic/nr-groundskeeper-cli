#!/usr/bin/env node
import Yargs from "yargs/yargs";
import * as fs from "fs";
import * as readline from "readline";
import { stdin as input, stdout as output } from "process";

import ProgressBar from "./progress.js";
import { entitiesList, agentUpdates } from "./queries.js";
import { TERMINAL_STYLES } from "./styles.js";

const argv = Yargs(process.argv.slice(2))
  .usage("Usage: -k <api-key> -r <region>")
  .option("k", {
    alias: "api-key",
    describe: "New Relic API key",
    type: "string",
    demandOption: true,
  })
  .option("a", {
    alias: "account-id",
    describe: "Account ID",
    type: "number",
    demandOption: true,
  })
  .option("f", {
    alias: "file",
    describe: "Path to file to output results",
    type: "string",
  })
  .option("e", {
    alias: "error",
    describe: "Path to file to write error messages",
    type: "string",
  })
  .option("r", {
    alias: "region",
    describe: 'Use "eu" if region for the account is EU',
    type: "string",
  })
  .epilogue(
    "For details, check https://github.com/newrelic/nr-groundskeeper-cli",
  );
const options = argv.parse();

const rl = readline.createInterface({ input, output });

const PROGRESS_BAR_TICKS = 10;
const progressBar = new ProgressBar(PROGRESS_BAR_TICKS);
let entitiesLoaded = 0;
let overwriteFile = false;

const API_ENDPOINT =
  options.r?.toLowerCase() === "eu"
    ? "https://api.eu.newrelic.com/graphql"
    : "https://api.newrelic.com/graphql";

const writeError = (errMsg = "Unknown error!") => {
  if (options.e) {
    const dt = new Intl.DateTimeFormat("default", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());
    fs.appendFile(options.e, `${dt}, ${errMsg}\n`, () => {});
  }
};

const writeOutput = (out) => {
  if (options.f) {
    const args = [
      options.f,
      out + "\n",
      (err) => {
        if (err) writeError(`Unable to write to file: ${err.message}`);
      },
    ];
    if (overwriteFile) {
      fs.writeFile(...args);
    } else {
      fs.appendFile(...args);
    }
  } else {
    output.write(out + "\n");
  }
};

const checkOverwrite = async () => {
  const y = `${TERMINAL_STYLES.BRIGHT}y${TERMINAL_STYLES.RESET} to overwrite`;
  const n = `${TERMINAL_STYLES.BRIGHT}n${TERMINAL_STYLES.RESET} to append to existing file`;
  try {
    const o = await new Promise((resolve, reject) => {
      const q = `${TERMINAL_STYLES.BRIGHT}Should I overwrite this file${TERMINAL_STYLES.RESET} (${y}/${n})?`;
      rl.question(`Looks like ${options.f} exists. ${q} `, (answer) => {
        if (answer.match(/^y(es)?$/i)) resolve(true);
        if (answer.match(/^n(o)?$/i)) resolve(false);
        reject();
      });
    });
    rl.close();
    overwriteFile = o;
  } catch {
    rl.close();
    const a = `${TERMINAL_STYLES.RED}Aborting${TERMINAL_STYLES.RESET}`;
    output.write(`${a}: Expecting response to be ${y} or ${n}\n`);
    process.exit();
  }
};

const req = (body) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Api-Key": options.apiKey,
  },
  body: JSON.stringify(body),
});

const makeNote = (reporting, recommendedVersion) => {
  if (!reporting) return "NOT REPORTING";
  if (!recommendedVersion) return "UP TO DATE";
};

const fetchEntitiesList = async (query, cursor = null) => {
  let data;
  try {
    const resp = await fetch(
      API_ENDPOINT,
      req({ query, variables: { cursor } }),
    );
    data = await resp.json();
    const { count = 0, results: { entities = [], nextCursor } = {} } =
      data?.data?.actor?.entitySearch || {};
    const { guids, entitiesObject } = entities.reduce(
      (acc, entity) => ({
        guids: [...acc.guids, entity.guid],
        entitiesObject: {
          ...acc.entitiesObject,
          [entity.guid]: entity,
        },
      }),
      { guids: [], entitiesObject: {} },
    );
    entitiesLoaded += entities.length;
    const progress = count ? Math.ceil((entitiesLoaded / count) * 10) : 0;
    await fetchRecommendations(
      agentUpdates(options.a, `'${guids.join("' , '")}'`),
      entitiesObject,
      progress,
    );
    if (nextCursor) {
      await fetchEntitiesList(query, nextCursor);
    } else {
      if (options.f) {
        progressBar.done();
        fs.realpath(options.f, (err, resolvedPath) =>
          err
            ? progressBar.log(err.message, ProgressBar.STYLES.MAGENTA)
            : progressBar.log(
                `Output written to ${resolvedPath}`,
                ProgressBar.STYLES.GREEN,
              ),
        );
      }
    }
  } catch (err) {
    writeError(`Error fetching data: ${err.message}`);
  }
};

const fetchRecommendations = async (query, entities = {}, progress) => {
  try {
    const resp = await fetch(API_ENDPOINT, req({ query }));
    const data = await resp.json();
    const recommendations = data?.data?.actor?.nrql?.results?.reduce(
      (acc, { facet, recommendedVersion }) => ({
        ...acc,
        [facet]: recommendedVersion,
      }),
      {},
    );
    const csv = Object.keys(entities)
      .map((guid) => {
        const entity = entities[guid] || {};
        const { accountId, name, language, reporting } = entity;
        const runningAgentVersions = entity.runningAgentVersions || {};
        const minVersion = runningAgentVersions.minVersion || "";
        const maxVersion = runningAgentVersions.maxVersion || "";
        const recommendedVersion = recommendations?.[guid] || "";
        const note = makeNote(reporting, recommendedVersion);
        return `${accountId}, ${guid}, ${name}, ${language}, ${minVersion}, ${maxVersion}, ${recommendedVersion}, ${note}`;
      })
      .join("\n");
    writeOutput(csv);
    if (options.f) progressBar.print(progress);
  } catch (err) {
    writeError(`Error fetching recommendations: ${err.message}`);
  }
};

const main = async () => {
  if (options.f && fs.existsSync(options.f)) await checkOverwrite();
  writeOutput(
    `Account ID, Entity guid, Entity name, Language, Min agent version, Max agent version, Recommended version, Notes`,
  );
  if (options.f) progressBar.print(1);
  await fetchEntitiesList(entitiesList);
  rl.close();
};

if (options.apiKey) {
  main();
} else {
  argv.showHelp();
  progressBar.log(`\n\nAPI key is required`, ProgressBar.STYLES.MAGENTA);
}
