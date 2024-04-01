import { Client, GatewayIntentBits } from "discord.js"
import https from "https"
import fs from "fs"
import dotenv from "dotenv"
import path from "path"

// .env
dotenv.config()

/** Bot token */
const token = process.env["token"]

/** The path where you save everything */
const savePath = process.env["save_path"]

// token and savePath must exist
if (!token || !savePath) throw new Error('"token" or "save_path" does not exist in .env')

/** Client */
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
})

/** Convert channel name to folder names */
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
} as const

/** All builds' blueprints */
const allBuilds: { [build: string]: Set<string> } = {}

/** Images to be added manually. They are usually not available in the server */
const addBuilds: { [build: string]: string[] } = {}

/** Images that should have been added manually before. It does not require adding it again */
const alreadyAddedBuilds: { [build: string]: string[] } = {}

// When bot is ready
client.on("ready", async () => {
	console.log(`Logged in as ${client.user?.tag}!`)

	const guild = client.guilds.cache.get("1014545067031146738")!

	// For evert channel in the guild...
	for (const channel of guild.channels.cache.values()) {
		// Only text based channels
		if (!channel.isTextBased()) continue

		// Include certain channels
		if (!([...Object.keys(channelToFolder)].indexOf(channel.name) + 1)) continue

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

			// TODO: Add back the <93%. This is because I can add a note to a build
			// Skip builds with <93% full belts or whatever this is
			if (message.content.split("\n")[0].indexOf("<") + 1) continue

			//// Filename
			// Blueprint link
			const blueprintLink = message.content.split("\n").pop()!

			// Get blueprint
			let filename = path.basename(blueprintLink)
			if (filename.startsWith("blueprints")) {
				filename = new URL(blueprintLink).searchParams.get("id") ?? ""
				if (filename === "") {
					console.log(`\x1b[38;5;196mError: Could not find blueprint ID from "${message.content.split("\n")[0]}"\x1b[0m`)
					continue
				}
			}

			// path + blueprint.extension
			const folder = channelToFolder[channel.name as keyof typeof channelToFolder]
			let filenameWithExtension = folder + "/" + filename + ".jpeg"

			// Add to all builds
			if (allBuilds[folder] === undefined) allBuilds[folder] = new Set()
			allBuilds[folder].add(filename + ".jpeg")

			// If file exists, skip it
			if (fs.existsSync(savePath + filenameWithExtension)) {
				console.log("\x1b[38;5;220m" + filenameWithExtension + " already exits\x1b[0m")

				// Already added builds
				if (channel.name === "lab_balancers" || channel.name === "valves") {
					const tiers = message.content.split("\n")
					if (tiers.length > 3) alreadyAddedBuilds[tiers[0]] = tiers.slice(1, -2)
				}
				continue
			}

			// Add builds
			if (channel.name === "lab_balancers" || channel.name === "valves") {
				const tiers = message.content.split("\n")
				if (tiers.length > 3) addBuilds[tiers[0]] = tiers.slice(1, -2)
			}

			// Download image
			await downloadImage(attachment.url, filenameWithExtension)
		}
	}
	console.log("\x1b[38;5;40mAll builds successful downloaded!\x1b[0m")

	// Logout
	client.destroy()

	//// Added

	// Already Added Builds
	if (Object.keys(alreadyAddedBuilds).length) {
		console.log("\x1b[38;5;99mThe following builds should have been added manually before:")
		for (const build in alreadyAddedBuilds) {
			console.log("• " + build)
			alreadyAddedBuilds[build].forEach(build => console.log("  • " + build))
		}

		// Reset color
		process.stdout.write("\x1b[0m")
	}

	// Add Manually
	if (Object.keys(addBuilds).length) {
		console.log("The following builds should be added manually:")
		for (const build in addBuilds) {
			console.log("• " + build)
			addBuilds[build].forEach(build => console.log("  • " + build))
		}

		// Reset color
		process.stdout.write("\x1b[0m")
	}

	// Remove files that are not in allBuilds
	const deleted = new Set<string>()
	fs.readdirSync(savePath).forEach(dir => {
		if (dir === "lab-balancers" || dir === "valves") return
		fs.readdirSync(savePath + dir).forEach(file => {
			// Delete file if it does not exist in all allBuilds
			if (!allBuilds[dir].has(file)) {
				fs.unlinkSync(savePath + dir + "/" + file)
				deleted.add(dir + "/" + file)
			}
		})
	})

	// Print deleted files
	if (deleted.size) {
		console.log("\x1b[38;5;196mDeleted files:")
		deleted.forEach(file => console.log("• " + file))
		console.log("Please check lab-balancers and valves folders for any unwanted files.")

		// Reset color
		process.stdout.write("\x1b[0m")
	}
})

/**
 * Download an image asynchronously
 * @param url The URL to download from
 * @param filename The name + path to give to the file
 */
async function downloadImage(url: string, filename: string): Promise<void> {
	return new Promise(resolve => {
		https.get(url, res => {
			const file = fs.createWriteStream(savePath + filename)
			res.pipe(file)
			res.on("end", async () => {
				console.log("\x1b[38;5;40m" + filename + " downloaded successfully\x1b[0m")
				file.close()
				resolve()
			})
		}).on("error", err => {
			console.error(err)
		})
	})
}

// Login
client.login(token)