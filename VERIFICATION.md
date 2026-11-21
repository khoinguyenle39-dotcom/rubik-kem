# Kiểm tra bản đầu tiên

Ngày 20/11/2026.

- TypeScript: qua kiểm tra.
- Build production Vite: thành công.
- 50 kiểm thử tự động đạt: màu camera tổng hợp, mô hình 3D, phát lại, phép xoay và optimal solver. Có đối chiếu độ dài tối ưu với tìm kiếm vét cạn cho 40 khối ngắn; kiểm tra hủy tìm kiếm và bảng tra.
- Trình duyệt: khối mẫu R U R' U' được giải tối ưu bằng U R U' R' (4 nước); tiến/lùi về đúng chỉ số; phát đủ 4 bước hiển thị hoàn thành.
- Camera giả lập: không gọi camera lúc tải trang; chỉ gọi sau nút cho phép, audio=false; chụp 6 mặt chuyển sang kiểm tra hợp lệ; tất cả track ended sau khi chụp xong và sau khi đóng; từ chối quyền có thông báo tiếng Việt.
- Bố cục 1280px và 390px không tràn ngang. Bộ sửa màu có 54 ô và nút giải bị khóa khi chưa nhập đủ.
- Kiểm tra phụ thuộc npm sau cập nhật: không có lỗ hổng được báo cáo.
- Kiểm tra giao diện tĩnh: 0 FAIL; cảnh báo tương phản của ô tâm cần đọc cùng màu theo data-colour (nền ô Rubik thay thế nền chung). Đã xem giao diện bằng ảnh chụp trình duyệt. Render riêng của sloplint không khởi động được Chrome; kiểm tra trình duyệt thực hiện bằng Playwright.

Giới hạn: camera được kiểm tra với video tổng hợp, chưa kiểm tra Rubik thật dưới ánh sáng thực tế. Chưa bảo đảm thời gian giải tối ưu cho khối ngẫu nhiên khó hoặc điện thoại cấu hình thấp. Chính xác tối ưu được xác nhận bởi thuật toán và kiểm thử; không tuyên bố đã vét cạn mọi trạng thái Rubik.
