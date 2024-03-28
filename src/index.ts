import { Client, GatewayIntentBits } from "discord.js"
import https from "https"
import fs from "fs"
import dotenv from "dotenv"

// .env
dotenv.config()

/** Bot token */
const token = process.env["token"]

/** Client */
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
})

/** The path where you save everything */
const savePath = process.env["save_path"]

// When bot is ready
client.on("ready", async () => {
	console.log(`Logged in as ${client.user?.tag}!`)

	const guild = client.guilds.cache.get("1014545067031146738")!

	// For evert channel in the guild...
	for (const channel of guild.channels.cache.values()) {
		// Only text based channels
		if (!channel.isTextBased()) continue

		// Include certain channels
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
		].indexOf(channel.name) + 1)) continue

		console.log("\x1b[38;5;202m> " + channel.name + "\x1b[0m")

		// Get (most) messages
		let messages
		messages = await channel.messages.fetch({
			limit: 100,
		})

		// If there are more than 100 messages, give a warning
		if (channel.messages.cache.size > 100) console.warn(`\x1b[38;5;196mWarning: Channel ${channel.name} has more than 100 messages!\x1b[0m`)

		// For every message in the channel...
		for (const message of messages.values()) {
			// Skip messages with no attachments
			if (message.attachments.size === 0) continue
			const attachment = message.attachments.at(0)!

			//// Filename
			let filename = message.content.split("\n")[0]
			// Balancer
			if (["n-n_balancers", "n-m_balancers（n﹤m）", "n-m_balancers（n﹥m）"].indexOf(channel.name) + 1) filename = "balancers/" + filename.split(" balancer ").join(" ").replace(":", " to ").replace(":", "x")
			// Splitter
			else if (["1-n_splitters", "n-m_splitters"].indexOf(channel.name) + 1) filename = "splitters/" + filename.split(" splitter ").join(" ").replace(":", " to ").replace(":", "x")
			// Lab Balancers
			else if (channel.name === "lab_balancers") filename = "lab-balancers/" + filename.replace(":", " to ")
			// Valves
			else if (channel.name === "valves") {
				// No <97% design or whatever these designs are
				if (filename.indexOf("<") + 1) continue
				filename = "valves/" + filename
			}
			// Workshops or Furnaces
			else if (channel.name === "workshop-furnace") filename = "workshops-or-furnaces/" + filename.replace("/", " or ")
			// Machine Shop or Forges
			else if (channel.name === "machine_shop-forge") filename = "machine-shops-or-forges/" + filename.replace("/", " or ").replace(":", " to ")
			// Industrial Factory
			else if (channel.name === "industrial_factory") filename = "industrial-factories/" + filename.replace(":", " to ")
			// Manufacturer
			else if (channel.name === "manufacturer") filename = "manufacturers/" + filename.replace(":", " to ")

			// Add extension
			filename += "." + attachment.contentType!.split("/")[1]

			// If file exists, skip it
			if (fs.existsSync(savePath + filename)) continue

			// Download image
			await downloadImage(attachment.url, filename)
		}
	}
	console.log("\x1b[38;5;40mAll buildings successful downloaded!\x1b[0m")

	// Logout
	client.destroy()
})

/**
 * Download an image asynchronously
 * @param url The URL to download from
 * @param filename The name + path to give to the file
 */
async function downloadImage(url: string, filename: string): Promise<void> {
	const file = fs.createWriteStream(savePath + filename)
	return new Promise(resolve => {
		https.get(url, res => {
			res.pipe(file)
			res.on("end", () => {
				console.log("\x1b[38;5;40m" + filename + " downloaded successfully\x1b[0m")
				file.close()
				resolve()
			})
		}).on("error", console.error)
	})
}

// Login
client.login(token)