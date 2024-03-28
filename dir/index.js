"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const token = process.env["token"];
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const savePath = process.env["save_path"];
client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    const guild = client.guilds.cache.get("1014545067031146738");
    for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased())
            continue;
        if (!([
            "n-n_balancers",
            "n-m_balancers（n﹤m）",
            "n-m_balancers（n﹥m）",
            "1-n_splitters",
            "n-m_splitters",
            "lab_balancers",
            "valves",
            "workshop-furnace",
            "machine_shop-forge",
            "industrial_factory",
            "manufacturer",
        ].indexOf(channel.name) + 1))
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
            let filename = message.content.split("\n")[0];
            if (["n-n_balancers", "n-m_balancers（n﹤m）", "n-m_balancers（n﹥m）"].indexOf(channel.name) + 1)
                filename = "balancers/" + filename.split(" balancer ").join(" ").replace(":", " to ").replace(":", "x");
            else if (["1-n_splitters", "n-m_splitters"].indexOf(channel.name) + 1)
                filename = "splitters/" + filename.split(" splitter ").join(" ").replace(":", " to ").replace(":", "x");
            else if (channel.name === "lab_balancers")
                filename = "lab-balancers/" + filename.replace(":", " to ");
            else if (channel.name === "valves") {
                if (filename.indexOf("<") + 1)
                    continue;
                filename = "valves/" + filename;
            }
            else if (channel.name === "workshop-furnace")
                filename = "workshops-or-furnaces/" + filename.replace("/", " or ");
            else if (channel.name === "machine_shop-forge")
                filename = "machine-shops-or-forges/" + filename.replace("/", " or ").replace(":", " to ");
            else if (channel.name === "industrial_factory")
                filename = "industrial-factories/" + filename.replace(":", " to ");
            else if (channel.name === "manufacturer")
                filename = "manufacturers/" + filename.replace(":", " to ");
            filename += "." + attachment.contentType.split("/")[1];
            if (fs_1.default.existsSync(savePath + filename))
                continue;
            await downloadImage(attachment.url, filename);
        }
    }
    console.log("\x1b[38;5;40mAll buildings successful downloaded!\x1b[0m");
    client.destroy();
});
async function downloadImage(url, filename) {
    const file = fs_1.default.createWriteStream(savePath + filename);
    return new Promise(resolve => {
        https_1.default.get(url, res => {
            res.pipe(file);
            res.on("end", () => {
                console.log("\x1b[38;5;40m" + filename + " downloaded successfully\x1b[0m");
                file.close();
                resolve();
            });
        }).on("error", console.error);
    });
}
client.login(token);
