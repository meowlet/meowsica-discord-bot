export default {
  // Common
  common: {
    error: "Đã xảy ra lỗi",
    success: "Thành công",
  },

  // Commands
  commands: {
    ping: {
      name: "ping",
      description: "Kiểm tra độ trễ của bot",
      pinging: "Đang kiểm tra...",
      title: "Pong!",
      subtitle: "Độ trễ của bạn và API được hiển thị bên dưới.",
      latency: "Độ trễ",
      apiLatency: "Độ trễ API",
    },
    help: {
      name: "help",
      description: "Hiển thị tất cả các lệnh có sẵn",
      title: "Danh sách lệnh",
      subtitle: "Đây là tất cả các lệnh bạn có thể sử dụng:",
    },
    lang: {
      name: "lang",
      description: "Đặt ngôn ngữ cho bot",
      option: "Chọn ngôn ngữ",
      noPermission: "Bạn cần quyền Quản lý Server để thay đổi cài đặt server.",
      serverOnly: "Lệnh này chỉ có thể sử dụng trong server.",
      interface: {
        description: "Đặt ngôn ngữ giao diện",
        user: "Đặt ngôn ngữ giao diện cá nhân",
        server: "Đặt ngôn ngữ giao diện cho server",
        userSuccess: "Ngôn ngữ giao diện của bạn đã được đặt thành Tiếng Việt!",
        serverSuccess:
          "Ngôn ngữ giao diện server đã được đặt thành Tiếng Việt!",
      },
      speech: {
        description: "Đặt ngôn ngữ giọng nói/TTS",
        user: "Đặt ngôn ngữ giọng nói cá nhân",
        server: "Đặt ngôn ngữ giọng nói cho server",
        userSuccess: "Ngôn ngữ giọng nói của bạn đã được đặt thành Tiếng Việt!",
        serverSuccess:
          "Ngôn ngữ giọng nói server đã được đặt thành Tiếng Việt!",
      },
    },
  },
};
