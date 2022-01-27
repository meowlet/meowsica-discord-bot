import type { Messages } from "./en.ts";

const messages: Messages = {
  common: {
    error: "Chết, lỗi rồi",
    errorRetry: "Lỗi rồi. Thử lại nhé!",
    unknownCommand: "Chưa nghe lệnh này bao giờ!",
    commandError: "Lỗi rồi!",
    success: "Ngon lành!",
    ok: "OK",
    gender: {
      male: "Giọng nam",
      female: "Giọng nữ",
      neutral: "Giọng trung tính",
    },
  },

  commands: {
    ping: {
      name: "ping",
      description: "Xem bot nhanh cỡ nào",
      pinging: "Đang đo...",
      title: "Pong!",
      subtitle: "Tình hình mạng mẽo như sau:",
      latency: "Độ trễ",
      apiLatency: "Độ trễ API",
    },
    help: {
      name: "help",
      description: "Bot làm được những gì?",
      title: "Danh sách các lệnh",
      subtitle: "Danh sách các lệnh bao gồm:",
      categories: {
        voice: "Giọng nói",
        tts: "Đọc văn bản (TTS)",
        settings: "Cài đặt",
        misc: "Tiện ích linh tinh",
      },
    },
    join: {
      name: "join",
      description: "Gọi bot vào kênh thoại",
      serverOnly: "Chỉ dùng trong server.",
      notInVoice: "Phải vào voice chat trước đã!",
      success: "Đã vào!",
      joinedChannel: "Đã vào **{channel}**",
      failed: "Không vào được kênh. Thử lại nhé!",
      notJoinable: "Bot không có quyền vào kênh đó.",
      notSpeakable: "Bot không có quyền nói trong kênh đó (thiếu quyền Speak).",
      channelFull: "Kênh thoại đó đã đầy!",
    },
    leave: {
      name: "leave",
      description: "Thoát kênh thoại",
      serverOnly: "Chỉ dùng trong server được thôi.",
      notConnected: "Bot chưa vào voice chat.",
      notInSameChannel: "Vào cùng voice chat với bot mới được.",
      success: "Đã thoát",
      disconnected: "Đã thoát, bai bai!",
      failed: "Không thoát được.",
