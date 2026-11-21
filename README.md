# Rubik Kem

Website tiếng Việt: camera 6 mặt, hiệu chỉnh 54 ô, lời giải tối ưu HTM (R/R'/R2 đều 1 nước) và mô hình 3D từng bước.

## Chạy

Node.js 24 hoặc mới hơn. `npm install`, `npm run dev`. Mở địa chỉ localhost được in trong terminal. Camera trên điện thoại cần triển khai qua HTTPS.

`npm run build` tạo `dist/`; `npm test` kiểm tra mô hình, phân loại màu và bộ giải. `npm run typecheck` kiểm tra TypeScript.

## Dữ liệu

Không có backend nhận ảnh, analytics, localStorage hay lưu video. Camera chỉ khởi động sau nút cho phép; `audio:false`. Chỉ mẫu RGB của 54 ô tồn tại trong phiên. Camera tắt khi hoàn tất, đóng scanner, ẩn trang hoặc rời trang. Bộ giải chạy trong Web Worker; bảng toán học ở RAM. Không truyền cube/ảnh ra mạng. Máy chủ hosting vẫn có thể ghi thông tin kết nối kỹ thuật.

## Thuật toán và giới hạn

Tái sử dụng thư viện MIT của https://github.com/MrDenzzz/cube-solver (xem THIRD-PARTY-LICENSE.txt): mô hình cubie, xác thực, optimal IDA* với cận ba trục Reid, bảng standard khoảng 35 MB, và mô hình Three.js. Chỉ hiển thị kết quả có stoppedBy=proven và tự áp dụng để xác nhận khối được giải. Không dùng two-phase làm kết quả thay thế.

Tối ưu tuyệt đối có thể mất nhiều phút hoặc lâu hơn trên điện thoại. Không có thời hạn giải được bảo đảm. Có nút dừng; khi SharedArrayBuffer không khả dụng, dừng sẽ hủy worker, lần sau phải dựng lại bảng. Không mặc định bật chế độ bảng 0.9 GB.

Camera dùng lưới căn cố định và màu tâm của 6 ảnh để hiệu chuẩn. Người dùng phải giữ đúng hướng tâm được chỉ dẫn, không xoay riêng các tầng giữa các ảnh. Hỗ trợ bộ màu tiêu chuẩn trắng/vàng, xanh lá/xanh dương, đỏ/cam; chưa hỗ trợ Rubik ảnh hoặc màu tùy biến. Nhận diện phụ thuộc ánh sáng; bước kiểm tra và sửa màu là bắt buộc trước khi giải.

## Triển khai

Tệp tĩnh trong dist. Đề xuất Permissions-Policy: camera=(self), microphone=(), geolocation=(). COOP same-origin và COEP require-corp cho phép cờ dừng chia sẻ; vẫn có cơ chế hủy worker nếu host không hỗ trợ. CSP trong index.html không cho ứng dụng kết nối tới nguồn bên ngoài.
