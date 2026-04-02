import asyncio
import edge_tts

async def list_voices():
    voices = await edge_tts.VoicesManager.create()
    # Lấy danh sách tất cả các ngôn ngữ (Locale)
    locales = sorted(list(set(v['Locale'] for v in voices.voices)))
    print(f"Tổng số ngôn ngữ/vùng hỗ trợ: {len(locales)}")
    for locale in locales:
        print(locale)

asyncio.run(list_voices())