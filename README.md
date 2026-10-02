# App chấm công

Ứng dụng ghi nhận giờ làm đơn giản, tối ưu cho điện thoại.

## Mục đích

Giúp bạn theo dõi giờ làm hằng ngày một cách nhanh, gọn và dễ kiểm tra.

## Chức năng chính

- Thêm dòng chấm công mới
- Chỉnh sửa dòng đã có
- Xóa dòng có xác nhận
- Chọn nhiều dòng và tính tổng giờ đã chọn
- Tìm kiếm và lọc dữ liệu theo thời gian

## Cách sử dụng

1. Bấm **Thêm dòng mới** để tạo bản ghi.
2. Chọn ngày và nhập khung giờ bắt đầu/kết thúc.
3. Hệ thống tự tính tổng giờ cho dòng đó.
4. Dùng checkbox để chọn dòng muốn cộng tổng.
5. Dùng nút **Sửa** hoặc **Xóa** để cập nhật dữ liệu.

## Lưu ý

- Dữ liệu được lưu trên trình duyệt của thiết bị đang sử dụng.
- Nếu đổi trình duyệt hoặc đổi thiết bị, dữ liệu sẽ không tự động đồng bộ.

## Cấu hình trợ lý AI trên Vercel

API trợ lý chạy dưới dạng Vercel Function tại `/api/ai-command`. Thêm các biến môi trường sau trong Vercel Project Settings trước khi deploy:

- `OPENAI_API_KEY`: API key của OpenAI.
- `OPENAI_MODEL`: tùy chọn, mặc định `gpt-4o-mini`.
- `FIREBASE_PROJECT_ID`: ID dự án Firebase (`cham-cong-c51d3`).
- `FIREBASE_SERVICE_ACCOUNT_JSON`: nội dung JSON của service account Firebase Admin có quyền đọc Firestore.

Tạo service account riêng cho máy chủ với quyền đọc Firestore tối thiểu và chỉ lưu khóa trong Vercel Environment Variables. Không đặt khóa này trong biến `VITE_*` hoặc gửi vào trình duyệt. Endpoint xác minh Firebase ID token, chỉ đọc tài liệu của UID đã xác minh, gửi yêu cầu cùng tối đa 250 dòng chấm công gần nhất tới OpenAI Responses API (`store: false`), rồi kiểm tra phản hồi trước khi trả đề xuất. Endpoint không ghi Firestore. Chạy local cần `vercel dev` để phục vụ cả Vite và thư mục `/api`.
