const messages: MessagesShape = {
  common: {
    error: "Oops, something went wrong",
    errorRetry: "An error occurred. Please try again.",
    unknownCommand: "Unknown command!",
    commandError: "There was an error executing this command!",
    success: "All set!",
    ok: "OK",
    gender: {
      male: "Male voice",
      female: "Female voice",
      neutral: "Neutral voice",
    },
  },

  commands: {
    ping: {
      name: "ping",
      description: "Check how fast I'm responding",
      pinging: "Pinging...",
      title: "Pong!",
      subtitle: "Here's how fast we're connecting:",
      latency: "Latency",
      apiLatency: "API Latency",
    },
    help: {
      name: "help",
      description: "See what I can do",
      title: "Command List",
      subtitle: "Here's everything I can do for you:",
      categories: {
        voice: "Voice",
        tts: "Text-to-Speech",
        settings: "Settings",
        misc: "Utility",
      },
    },
    join: {
      name: "join",
      description: "Hop into your voice channel",
      serverOnly: "This works inside servers only.",
      notInVoice: "Please join a voice channel first!",
      success: "Joined!",
      joinedChannel: "Connected to **{channel}**",
      failed: "Couldn't join the channel. Mind trying again?",
      notJoinable: "I don't have permission to join that channel.",
      notSpeakable: "I can't speak in that channel — missing Speak permission.",
      channelFull: "That voice channel is full!",
    },
    leave: {
      name: "leave",
      description: "Leave the voice channel",
      serverOnly: "This works inside servers only.",
      notConnected: "I'm not in a voice channel right now.",
      notInSameChannel: "We need to be in the same voice channel for this.",
      success: "Left channel",
      disconnected: "Disconnected from the voice channel.",
      failed: "Couldn't leave the channel.",
    },
    say: {
      name: "say",
      description: "Read text out loud",
      messageOptionName: "message",
      messageOptionDesc: "The message to speak",
      serverOnly: "This works inside servers only.",
      notInVoice: "Hop into a voice channel first to use this!",
      notInSameChannel: "Come join my voice channel first.",
      emptyMessage: "You didn't type anything for me to say!",
      messageTooLong: "That's a bit too long! Max {max} characters, please.",
      queueFull:
        "The queue is full ({max} messages). Please wait until some finish.",
      rateLimited: "Slow down a bit! Try again in {seconds}s.",
      joinFailed: "Couldn't join your voice channel.",
    },
    stop: {
      name: "stop",
      description: "Stop speaking and leave",
      serverOnly: "This works inside servers only.",
      notConnected: "I'm not currently speaking anywhere.",
      notInSameChannel: "We're not in the same channel.",
      success: "Stopped",
      stopped: "Stopped playback and left the channel.",
      queueField: "Queue",
      cleared: "Cleared {count} message(s) from the queue.",
    },
    skip: {
      name: "skip",
      description: "Skip current message",
      serverOnly: "This works inside servers only.",
      notConnected: "I'm not speaking right now.",
      notInSameChannel: "We're not in the same channel.",
      nothingPlaying: "Silence... nothing to skip!",
      success: "Skipped",
      skipped: "Skipped the current message.",
    },
    queue: {
      name: "queue",
      description: "Check the playlist",
      serverOnly: "This works inside servers only.",
      notConnected: "I'm not in a voice channel.",
      title: "TTS Queue",
      empty: "The queue is empty. Quiet in here!",
      nowPlaying: "Now Playing",
      upNext: "Up Next",
      moreItems: "...and {count} more",
      totalItems: "{count} message(s) waiting",
    },
    voice: {
      name: "voice",
      description: "Open voice settings dashboard",
      dashboard: {
        title: "Voice Settings",
        subtitle: "Customize how I sound for you",
        language: "Language",
        provider: "Provider",
        model: "Voice Model",
        speed: "Speed",
        pitch: "Pitch",
        providerBasic: "Basic (Google Translate)",
        providerWavenet: "Wavenet (Google Cloud)",
        modelDefault: "Default",
      },
      buttons: {
        config: "Configure",
        reset: "Reset",
      },
      config: {
        title: "Configuration",
        subtitle: "Tweak your settings below. I'll save them automatically.",
        languagePlaceholder: "Pick a language...",
        languageUpdated: "Language set to {language}",
        moreLanguages: "More Languages...",
        moreLanguagesDesc: "See other options",
        backToTop: "Go Back",
        backToTopDesc: "Return to main list",
        providerPlaceholder: "Choose a provider...",
        providerBasicOnly: "Only Basic is available for this language",
        providerBasicLabel: "Basic (Google Translate)",
        providerBasicDesc: "Standard free TTS",
        providerWavenetLabel: "Wavenet (Google Cloud)",
        providerWavenetDesc: "Lifelike Wavenet voices",
        providerUpdated: "Provider set to {provider}",
        variantPlaceholder: "Choose a voice style...",
        variantNotAvailable: "Not Available",
        variantNoVoices: "No specific styles for this language",
        variantUpdated: "Voice style set to {variant}",
        noWavenetForLanguage:
          "Wavenet voices aren't available for this language yet.",
        speedPlaceholder: "Speaking speed...",
        speedUpdated: "Speed set to {speed}",
        speedNormal: "Normal",
        speedNormalDesc: "Standard speed",
        speedSlow: "Slow Mode",
        speedSlowDesc: "Relaxed, clear pronunciation",
        speed025x: "0.25x (Super Slow)",
        speed05x: "0.5x (Slow)",
        speed075x: "0.75x",
        speed10x: "1.0x (Normal)",
        speed125x: "1.25x",
        speed15x: "1.5x",
        speed175x: "1.75x",
        speed20x: "2.0x (Fast)",
        speed30x: "3.0x",
        speed40x: "4.0x (Super Fast)",
        pitchPlaceholder: "Voice pitch...",
        pitchUpdated: "Pitch set to {pitch}",
        pitchDeep: "Deep / Low",
        pitchDeepDesc: "Deeper tone",
        pitchMediumLow: "Medium Low",
        pitchMediumLowDesc: "Slightly deeper",
        pitchNormal: "Normal",
        pitchNormalDesc: "Standard tone",
        pitchMediumHigh: "Medium High",
        pitchMediumHighDesc: "Slightly higher",
        pitchHigh: "High",
        pitchHighDesc: "Higher tone",
      },
      reset: {
        success: "Reset Complete",
        successDesc: "Your voice settings are back to default.",
        notOwner: "Only the dashboard owner can do this.",
      },
    },
    language: {
      name: "language",
      description: "Manage UI language",
      dashboard: {
        title: "Language Settings",
        subtitle: "Customize your interface language",
        userLanguage: "Your Language",
        serverLanguage: "Server Language",
        notSet: "Not set (using default)",
        priorityNote: "Your personal setting always takes priority.",
      },
      buttons: {
        configure: "Configure",
        close: "Close",
        notOwner: "Only the dashboard owner can close this.",
      },
      config: {
        title: "Language Config",
        subtitle: "Pick your preferred language. Saving automatically.",
        userPlaceholder: "Select your language...",
        serverPlaceholder: "Select server language (Admin)...",
        userUpdated: "Your language is now {language}!",
        serverUpdated: "Server language is now {language}!",
        noPermission: "You need 'Manage Server' permission for this.",
        serverOnly: "This setting is for servers only.",
      },
    },
    profile: {
      name: "profile",
      description: "Check your profile",
      title: "Your Profile",
      fields: {
        provider: "Provider",
        model: "Current Model",
        language: "Language",
        speed: "Speed",
        pitch: "Pitch",
        usage: "Monthly Wavenet Usage",
      },
      providerBasic: "Basic (Free)",
      providerWavenet: "Wavenet",
      model: {
        auto: "Auto (Default)",
      },
      usage: {
        notApplicable: "N/A (Basic Plan)",
        format: "{used} / {limit} chars",
      },
      quotaExceeded:
        "Wavenet quota exceeded. You have used {used}/{limit} characters this month. Switch to Basic or wait until next month.",
    },
  },

  wavenet: {
    badge: "Wavenet",
    notAvailable: "Wavenet voices aren't available right now.",
  },
};

interface MessagesShape {
  common: {
    error: string;
    errorRetry: string;
    unknownCommand: string;
    commandError: string;
    success: string;
    ok: string;
    gender: { male: string; female: string; neutral: string };
  };
  commands: {
    ping: {
      name: string;
      description: string;
      pinging: string;
      title: string;
      subtitle: string;
      latency: string;
      apiLatency: string;
    };
    help: {
      name: string;
      description: string;
      title: string;
      subtitle: string;
      categories: {
        voice: string;
        tts: string;
        settings: string;
        misc: string;
      };
    };
    join: {
      name: string;
      description: string;
      serverOnly: string;
      notInVoice: string;
      success: string;
      joinedChannel: string;
      failed: string;
      notJoinable: string;
      notSpeakable: string;
      channelFull: string;
    };
    leave: {
      name: string;
      description: string;
      serverOnly: string;
      notConnected: string;
      notInSameChannel: string;
      success: string;
      disconnected: string;
      failed: string;
    };
    say: {
      name: string;
      description: string;
      messageOptionName: string;
