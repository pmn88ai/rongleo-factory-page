// Dữ liệu mẫu — thay bằng dữ liệu thật hoặc fetch API sau
const landData = {
  "cao-lanh-001": {
    slug: "cao-lanh-001",
    hookHeadline: "Đất 120m² gần chợ Cao Lãnh — sổ riêng, đường ô tô — giá tốt khu vực",
    hookHeadlineAlt: "Còn 1 lô duy nhất — giá thấp hơn khu vực 15%",
    hookSub: "Phù hợp ở hoặc đầu tư — pháp lý rõ ràng, xem sổ trực tiếp",
    title: "Lô Đất Thổ Cư Cao Lãnh – 120m²",
    price: "1.26 tỷ",
    pricePerM2: 10.5,
    area: 120,
    areaFront: 6,
    areaDepth: 20,
    location: "Phường 2, TP. Cao Lãnh, Đồng Tháp",
    locationDetail: "Hẻm ô tô thông, cách chợ Cao Lãnh 350m, gần trường tiểu học và bệnh viện đa khoa tỉnh",
    summary: "Lô đất thổ cư vuông vắn, hướng Đông Nam, nằm trong khu dân cư hiện hữu. Pháp lý đầy đủ, sổ hồng riêng tên chủ. Đường trước lô rộng 4m xe ô tô ra vào thoải mái. Phù hợp xây nhà ở hoặc đầu tư cho thuê.",
    images: [
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3928.1234567890123!2d105.6322!3d10.4594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x310ab98765432100%3A0x1234567890abcdef!2zVFAuIENhbyBMw6BuaiwgxJDhu5NuZyBUaMOhcA!5e0!3m2!1svi!2svn!4v1700000000000!5m2!1svi!2svn",
    legal: {
      bookType: "Sổ hồng (GCNQSDĐ)",
      owner: "Cá nhân — đứng tên 1 người",
      landType: "Đất ở đô thị (ODT)",
      issueYear: "2019",
      planning: "khu vực có thông tin quy hoạch đường vành đai, đã kiểm tra hiện trạng: lô đất chưa nằm trong vùng ảnh hưởng, sinh hoạt bình thường",
      notes: "Không tranh chấp, không thế chấp ngân hàng tại thời điểm kiểm tra",
    },
    priceComparison: {
      areaAvgMin: 12,
      areaAvgMax: 14,
      thisLot: 10.5,
      note: "Thấp hơn giá khu vực 15–25%"
    },
    advantages: [
      "Sổ hồng riêng, pháp lý sạch — có thể vay ngân hàng ngay",
      "Đường ô tô vào tận lô, tiện di chuyển mọi giờ",
      "Cách chợ Cao Lãnh chỉ 350m — tiện ích đầy đủ",
      "Khu dân cư hiện hữu — an ninh tốt, hàng xóm thân thiện",
      "Hướng Đông Nam — mát mẻ, phong thủy tốt",
      "Giá thấp hơn khu vực ~15–25%, dư địa tăng giá cao"
    ],
    risks: [
      {
        icon: "📋",
        label: "Quy hoạch",
        text: "Khu vực có thông tin quy hoạch đường vành đai — đã kiểm tra hiện trạng: lô đất chưa nằm trong vùng ảnh hưởng, sinh hoạt và xây dựng bình thường."
      },
      {
        icon: "🔌",
        label: "Hạ tầng",
        text: "Hẻm hiện tại rộng 4m — đủ xe ô tô 2 chiều không đủ rộng. Dự kiến mở rộng theo quy hoạch khu dân cư giai đoạn 2026–2028."
      },
      {
        icon: "💧",
        label: "Ngập lụt",
        text: "Khu vực thấp hơn mặt đường chính 30cm — đã có hệ thống thoát nước, không ghi nhận ngập trong 3 năm gần nhất."
      }
    ],
    suitableFor: [
      { label: "Ở thực", score: 90, icon: "🏠" },
      { label: "Đầu tư cho thuê", score: 80, icon: "📈" },
      { label: "Giữ đất tích lũy", score: 85, icon: "🏦" },
    ],
    contact: {
      name: "Anh Minh — Chủ đất",
      phone: "0901234567",
      zalo: "https://zalo.me/0901234567",
    }
  }
}

export default landData
