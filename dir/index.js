"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const token = process.env["token"];
const savePath = process.env["save_path"];
if (!token || !savePath)
    throw new Error('"token" or "save_path" does not exist in .env');
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const channelToFolder = {
    "n-n_balancers": "balancers",
    "n-m_balancers（n﹤m）": "balancers",
    "n-m_balancers（n﹥m）": "balancers",
    "1-n_splitters": "splitters",
    "n-m_splitters": "splitters",
    "lab_balancers": "lab-balancers",
    "valves": "valves",
    "workshop-furnace": "workshops-or-furnaces",
    "machine_shop-forge": "machine-shops-or-forges",
    "industrial_factory": "industrial-factories",
    "manufacturer": "manufacturers",
};
const allBuilds = {};
const addBuilds = {};
const alreadyAddedBuilds = {};
client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    const guild = client.guilds.cache.get("1014545067031146738");
    for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased())
            continue;
        if (!([...Object.keys(channelToFolder)].indexOf(channel.name) + 1))
            continue;
        console.log("\x1b[38;5;202m> " + channel.name + "\x1b[0m");
        let messages;
        messages = await channel.messages.fetch({
            limit: 100,
        });
        if (channel.messages.cache.size > 100)
            console.warn(`\x1b[38;5;196mWarning: Channel ${channel.name} has more than 100 messages!\x1b[0m`);
        for (const message of messages.values()) {
            if (message.attachments.size === 0)
                continue;
            const attachment = message.attachments.at(0);
            if (message.content.split("\n")[0].indexOf("<") + 1)
                continue;
            const blueprintLink = message.content.split("\n").pop();
            let filename = path_1.default.basename(blueprintLink);
            if (filename.startsWith("blueprints")) {
                filename = new URL(blueprintLink).searchParams.get("id") ?? "";
                if (filename === "") {
                    console.log(`\x1b[38;5;196mError: Could not find blueprint ID from "${message.content.split("\n")[0]}"\x1b[0m`);
                    continue;
                }
            }
            const folder = channelToFolder[channel.name];
            let filenameWithExtension = folder + "/" + filename + ".jpeg";
            if (allBuilds[folder] === undefined)
                allBuilds[folder] = new Set();
            allBuilds[folder].add(filename + ".jpeg");
            if (fs_1.default.existsSync(savePath + filenameWithExtension)) {
                console.log("\x1b[38;5;220m" + filenameWithExtension + " already exits\x1b[0m");
                if (channel.name === "lab_balancers" || channel.name === "valves") {
                    const tiers = message.content.split("\n");
                    if (tiers.length > 3)
                        alreadyAddedBuilds[tiers[0]] = tiers.slice(1, -2);
                }
                continue;
            }
            if (channel.name === "lab_balancers" || channel.name === "valves") {
                const tiers = message.content.split("\n");
                if (tiers.length > 3)
                    addBuilds[tiers[0]] = tiers.slice(1, -2);
            }
            await downloadImage(attachment.url, filenameWithExtension);
        }
    }
    console.log("\x1b[38;5;40mAll builds successful downloaded!\x1b[0m");
    client.destroy();
    if (Object.keys(alreadyAddedBuilds).length) {
        console.log("\x1b[38;5;99mThe following builds should have been added manually before:");
        for (const build in alreadyAddedBuilds) {
            console.log("• " + build);
            alreadyAddedBuilds[build].forEach(build => console.log("  • " + build));
        }
        process.stdout.write("\x1b[0m");
    }
    if (Object.keys(addBuilds).length) {
        console.log("The following builds should be added manually:");
        for (const build in addBuilds) {
            console.log("• " + build);
            addBuilds[build].forEach(build => console.log("  • " + build));
        }
        process.stdout.write("\x1b[0m");
    }
    const deleted = new Set();
    fs_1.default.readdirSync(savePath).forEach(dir => {
        if (dir === "lab-balancers" || dir === "valves")
            return;
        fs_1.default.readdirSync(savePath + dir).forEach(file => {
            if (!allBuilds[dir].has(file)) {
                fs_1.default.unlinkSync(savePath + dir + "/" + file);
                deleted.add(dir + "/" + file);
            }
        });
    });
    if (deleted.size) {
        console.log("\x1b[38;5;196mDeleted files:");
        deleted.forEach(file => console.log("• " + file));
        console.log("Please check lab-balancers and valves folders for any unwanted files.");
        process.stdout.write("\x1b[0m");
    }
});
async function downloadImage(url, filename) {
    return new Promise(resolve => {
        https_1.default.get(url, res => {
            const file = fs_1.default.createWriteStream(savePath + filename);
            res.pipe(file);
            res.on("end", async () => {
                console.log("\x1b[38;5;40m" + filename + " downloaded successfully\x1b[0m");
                file.close();
                resolve();
            });
        }).on("error", err => {
            console.error(err);
        });
    });
}
client.login(token);
