import asyncio
import edge_tts
import argparse
import sys

async def generate(text, voice, output):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True, help="Văn bản cần đọc")
    parser.add_argument("--voice", required=True, help="Tên giọng đọc TTS (ex: vi-VN-HoaiMyNeural)")
    parser.add_argument("--output", required=True, help="Đường dẫn file đầu ra")
    args = parser.parse_args()
    
    # Ép kiểu stdout về utf-8 để tránh lỗi hiển thị trên Windows
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    try:
        asyncio.run(generate(args.text, args.voice, args.output))
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
