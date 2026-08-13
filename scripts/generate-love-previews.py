from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "images" / "together"
TARGET_DIR = ROOT / "assets" / "generated" / "together-love"
SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
MAX_EDGE = 960
WEBP_QUALITY = 78


def generate_preview(source: Path, target: Path) -> None:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=WEBP_QUALITY, method=6)


def main() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(
        path for path in SOURCE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    )
    if not sources:
        raise SystemExit(f"No source photos found in {SOURCE_DIR}")

    for source in sources:
        target = TARGET_DIR / f"{source.stem}.webp"
        generate_preview(source, target)
        print(f"{source.name} -> {target.relative_to(ROOT)}")

    print(f"Generated {len(sources)} LOVE scene previews.")


if __name__ == "__main__":
    main()
