# 1. Base image
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# 2. Cài đặt FFmpeg & Công cụ build
RUN apt-get update && apt-get install -y \
    curl ffmpeg build-essential cmake git python3 pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 3. Cài đặt Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# 4. Build Whisper.cpp từ source
WORKDIR /opt/whisper.cpp
RUN git clone https://github.com/ggerganov/whisper.cpp.git . \
    && cmake -B build \
        -DWHISPER_BUILD_EXAMPLES=ON \
        -DWHISPER_BUILD_TESTS=OFF \
        -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --config Release --target whisper-cli -j$(nproc)

# Kiểm tra file thực thi
RUN ls -lh build/bin/whisper-cli && [ $(stat -c%s "build/bin/whisper-cli") -gt 800000 ]

# 5. ĐỔI TỪ BASE SANG TINY
# Tải model tiny (nhẹ hơn, nhanh hơn)
RUN cd models && ./download-ggml-model.sh tiny

# 6. Build ứng dụng NestJS
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- CẤU HÌNH BIẾN MÔI TRƯỜNG ---
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV WHISPER_PATH=/opt/whisper.cpp/build/bin/whisper-cli

# CẬP NHẬT ĐƯỜNG DẪN MODEL MẶC ĐỊNH SANG TINY
ENV MODEL_PATH=/opt/whisper.cpp/models/ggml-tiny.bin
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]