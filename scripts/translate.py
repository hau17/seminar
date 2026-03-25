import argparse
import sys
from deep_translator import GoogleTranslator

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--lang", required=True, help="Ngôn ngữ đích (target)")
    args = parser.parse_args()
    
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    try:
        target_lang = args.lang
        result = GoogleTranslator(source='auto', target=target_lang).translate(args.text)
        print(result)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
