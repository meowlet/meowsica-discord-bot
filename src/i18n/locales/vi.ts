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
    join: {
      description: "Vào kênh thoại của bạn",
      serverOnly: "Lệnh này chỉ có thể sử dụng trong server.",
      notInVoice: "Bạn phải ở trong kênh thoại để sử dụng lệnh này.",
      success: "Đã vào kênh thoại",
      joinedChannel: "Đã kết nối đến **{channel}**",
      failed: "Không thể vào kênh thoại. Vui lòng thử lại.",
    },
    leave: {
      description: "Rời khỏi kênh thoại",
      serverOnly: "Lệnh này chỉ có thể sử dụng trong server.",
      notConnected: "Tôi không kết nối với kênh thoại nào.",
      notInSameChannel: "Bạn phải ở cùng kênh thoại với bot để sử dụng lệnh này.",
      success: "Đã rời kênh thoại",
      disconnected: "Đã ngắt kết nối khỏi kênh thoại.",
      failed: "Không thể rời khỏi kênh thoại.",
    },
  },
};
