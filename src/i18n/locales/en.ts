export default {
  // Common
  common: {
    error: "An error occurred",
    success: "Success",
  },

  // Commands
  commands: {
    ping: {
      name: "ping",
      description: "Replies with Pong and shows latency",
      pinging: "Pinging...",
      title: "Pong!",
      subtitle: "Your latency and API latency are shown below.",
      latency: "Latency",
      apiLatency: "API Latency",
    },
    help: {
      name: "help",
      description: "Shows all available commands",
      title: "Available Commands",
      subtitle: "Here are all the commands you can use:",
    },
    lang: {
      name: "lang",
      description: "Set bot language",
      option: "Choose a language",
      noPermission:
        "You need the Manage Server permission to change server settings.",
      serverOnly: "This command can only be used in a server.",
      interface: {
        description: "Set UI language",
        user: "Set your personal UI language",
        server: "Set UI language for this server",
        userSuccess: "Your UI language has been set to English!",
        serverSuccess: "Server UI language has been set to English!",
      },
      speech: {
        description: "Set speech/TTS language",
        user: "Set your personal speech language",
        server: "Set speech language for this server",
        userSuccess: "Your speech language has been set to English!",
        serverSuccess: "Server speech language has been set to English!",
      },
    },
  },
};
